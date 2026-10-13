import { useEffect, useMemo, useRef, useState } from "react";
import { useLabStore } from "../../state/experimentStore";
import type { ChemicalSummary, CuratedReaction, Unit } from "../../types/chemistry";
import { reactionsApi } from "../../api/reactions";
import { chemicalsApi } from "../../api/chemicals";
import { formatFormula } from "../../utils/formatFormula";
import { Button } from "../common/Badge";
import "./ReactionControls.css";

const UNITS: Unit[] = ["mL", "L", "g", "kg", "mg", "mol", "mmol"];
const VOLUME_UNITS: Unit[] = ["mL", "L"];

export function ReactionControls({ pendingChemical, onAdded }: { pendingChemical: ChemicalSummary | null; onAdded: () => void }) {
  const [amount, setAmount] = useState<number | "">(20);
  const [unit, setUnit] = useState<Unit>("mL");
  const [concentration, setConcentration] = useState<number | "">(0.1);
  const [curatedReactions, setCuratedReactions] = useState<CuratedReaction[]>([]);
  const [searchResults, setSearchResults] = useState<CuratedReaction[]>([]);
  const [selectedReactionId, setSelectedReactionId] = useState<string>("");
  const [reactionSearchQuery, setReactionSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [presetScale, setPresetScale] = useState<number>(1);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const addChemical = useLabStore((s) => s.addChemical);
  const clearContainer = useLabStore((s) => s.clearContainer);
  const isLoading = useLabStore((s) => s.isLoading);
  const conditions = useLabStore((s) => s.conditions);
  const setConditions = useLabStore((s) => s.setConditions);
  const runReaction = useLabStore((s) => s.runReaction);
  const runReactionByEquation = useLabStore((s) => s.runReactionByEquation);
  const activeContainer = useLabStore((s) => s.containers.find((c) => c.id === s.activeContainerId));

  useEffect(() => {
    let cancelled = false;
    reactionsApi.list(100).then((res) => {
      if (!cancelled) setCuratedReactions(res.items);
    }).catch(() => { });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!reactionSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      reactionsApi.list(50, 0, reactionSearchQuery.trim()).then((res) => {
        if (!cancelled) setSearchResults(res.items);
      }).catch(() => { });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reactionSearchQuery]);


  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayedReactions = useMemo(() => {
    if (reactionSearchQuery.trim()) {
      return searchResults;
    }
    return curatedReactions;
  }, [curatedReactions, reactionSearchQuery, searchResults]);

  const needsConcentration = VOLUME_UNITS.includes(unit);
  const selectedReaction =
    curatedReactions.find((r) => r.id === selectedReactionId) ||
    searchResults.find((r) => r.id === selectedReactionId);

  const handleLoadReaction = async (rx: CuratedReaction, autoRun: boolean, scale = presetScale) => {
    if (!activeContainer) return;
    setLoadingPreset(true);
    try {
      clearContainer(activeContainer.id);
      setConditions({
        temperatureC: rx.temperatureMinC !== undefined && rx.temperatureMinC > 25 ? rx.temperatureMinC : 25,
        solvent: rx.solvent ?? "water",
      });

      for (const r of rx.reactants) {
        const chem = await chemicalsApi.getById(r.chemicalId);
        let amt = 25;
        let u: Unit = "mL";
        let conc: number | undefined = 1.0;

        if (chem.physicalState === "gas") {
          amt = (r.coefficient || 1) * scale;
          u = "mol";
          conc = undefined;
        } else if (chem.physicalState === "solid") {
          amt = Math.max(1, 10 * (r.coefficient || 1) * scale);
          u = "g";
          conc = undefined;
        } else if (chem.id.toLowerCase() === "water" || chem.id.toLowerCase() === "h2o" || chem.formula?.toUpperCase() === "H2O") {
          amt = 50;
          u = "mL";
          conc = undefined;
        } else {
          amt = 25 * (r.coefficient || 1);
          u = "mL";
          conc = Math.max(0.1, parseFloat((1.0 * scale).toFixed(2)));
        }

        await addChemical(chem, amt, u, conc);
      }

      if (autoRun) {
        await runReaction();
      }
    } finally {
      setLoadingPreset(false);
    }
  };

  const handleReactCustomEquation = async (queryText?: string) => {
    const q = (queryText ?? reactionSearchQuery).trim();
    if (!q) return;
    setIsDropdownOpen(false);
    await runReactionByEquation(q);
  };

  return (
    <div className="reaction-controls">
      {(curatedReactions.length > 0 || searchResults.length > 0 || true) && (
        <div className="reaction-controls__presets">
          <p className="reaction-controls__section-title">Reaction Equations &amp; Presets</p>
          <div className="reaction-controls__search-box" ref={searchBoxRef}>
            <div className="reaction-controls__search-input-wrapper">
              <span className="reaction-controls__search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="reaction-controls__search-input"
                placeholder="Write equation or search (e.g. C2H4Cl2 + C2H4Br2, Haber)..."
                value={reactionSearchQuery}
                onChange={(e) => {
                  setReactionSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleReactCustomEquation();
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
              />
              {reactionSearchQuery && (
                <button
                  type="button"
                  className="reaction-controls__clear-search"
                  onClick={() => {
                    setReactionSearchQuery("");
                    setSelectedReactionId("");
                  }}
                  aria-label="Clear reaction search"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                className="reaction-controls__react-now-btn"
                disabled={isLoading || !reactionSearchQuery.trim()}
                onClick={() => handleReactCustomEquation()}
                title="React equation via 3-tier pipeline: Curated DB → ReactionT5v2 Neural Model → AI Predictor"
              >
                {isLoading ? "Reacting…" : "React"}
              </button>
            </div>

            {isDropdownOpen && (
              <div className="reaction-controls__suggestions-dropdown" role="listbox">
                {reactionSearchQuery.trim() && (
                  <button
                    type="button"
                    className="reaction-controls__suggestion-item reaction-controls__suggestion-item--custom"
                    onClick={() => handleReactCustomEquation()}
                  >
                    <div className="reaction-controls__suggestion-header">
                      <span className="reaction-controls__suggestion-name">
                        ⚗️ React Equation: &ldquo;{reactionSearchQuery.trim()}&rdquo;
                      </span>
                      <span className="reaction-controls__suggestion-type">3-tier engine</span>
                    </div>
                    <div className="reaction-controls__suggestion-eq">
                      Search local DB → ReactionT5v2 Neural Model → AI Predictor
                    </div>
                  </button>
                )}

                <div className="reaction-controls__suggestions-header">
                  {reactionSearchQuery.trim()
                    ? `${displayedReactions.length} matching database records`
                    : `Popular Reactions`}
                </div>

                {displayedReactions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`reaction-controls__suggestion-item ${r.id === selectedReactionId ? "reaction-controls__suggestion-item--selected" : ""
                      }`}
                    onClick={() => {
                      setSelectedReactionId(r.id);
                      setReactionSearchQuery(r.name);
                      setIsDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={r.id === selectedReactionId}
                  >
                    <div className="reaction-controls__suggestion-header">
                      <span className="reaction-controls__suggestion-name">{r.name}</span>
                      <span className="reaction-controls__suggestion-type">
                        {r.reactionType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="reaction-controls__suggestion-eq">{r.equationDisplay}</div>
                  </button>
                ))}

                {displayedReactions.length === 0 && !reactionSearchQuery.trim() && (
                  <div className="reaction-controls__no-suggestions">
                    No reactions matching &ldquo;{reactionSearchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedReaction && (
            <div className="reaction-controls__preset-preview">
              <div className="reaction-controls__preset-eq">{selectedReaction.equationDisplay}</div>
              <div className="reaction-controls__preset-tags">
                <span className="reaction-controls__preset-tag">{selectedReaction.reactionType.replace(/_/g, " ")}</span>
                <span className={`reaction-controls__preset-tag reaction-controls__preset-tag--${selectedReaction.energyClassification}`}>
                  {selectedReaction.energyClassification}
                  {selectedReaction.enthalpyKjPerMol !== undefined && ` (${selectedReaction.enthalpyKjPerMol > 0 ? "+" : ""}${selectedReaction.enthalpyKjPerMol} kJ/mol)`}
                </span>
              </div>
              <div className="reaction-controls__preset-scale-row">
                <span className="reaction-controls__preset-scale-label">Quantity / Scale:</span>
                {[
                  { label: "0.5× (Mild)", val: 0.5 },
                  { label: "1× (Standard)", val: 1.0 },
                  { label: "2× (Double)", val: 2.0 },
                  { label: "3× (Maximum)", val: 3.0 },
                ].map((sc) => (
                  <button
                    key={sc.val}
                    type="button"
                    className={`reaction-controls__scale-chip ${presetScale === sc.val ? "reaction-controls__scale-chip--active" : ""}`}
                    onClick={() => {
                      setPresetScale(sc.val);
                      if (activeContainer && activeContainer.contents.length > 0) {
                        handleLoadReaction(selectedReaction, false, sc.val);
                      }
                    }}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
              {selectedReaction.enthalpyKjPerMol !== undefined && (
                <div className="reaction-controls__preset-scale-summary">
                  <span className="reaction-controls__scale-badge">
                    Scale: {presetScale}× &bull; {selectedReaction.enthalpyKjPerMol < 0 ? "🔥 Exothermic warming" : "❄️ Endothermic cooling"} scales with reactant quantity
                  </span>
                </div>
              )}
              <div className="reaction-controls__preset-buttons">
                <Button
                  variant="secondary"
                  disabled={isLoading || loadingPreset || !activeContainer}
                  onClick={() => handleLoadReaction(selectedReaction, false, presetScale)}
                >
                  Load to container
                </Button>
                <Button
                  variant="primary"
                  disabled={isLoading || loadingPreset || !activeContainer}
                  onClick={() => handleLoadReaction(selectedReaction, true, presetScale)}
                >
                  {loadingPreset ? "Loading…" : "Load & React"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="reaction-controls__divider" />

      {pendingChemical ? (
        <div className="reaction-controls__add-form">
          <p className="reaction-controls__add-title">
            Add <span className="formula">{formatFormula(pendingChemical.formula)}</span> ({pendingChemical.commonName})
          </p>
          <div className="reaction-controls__row">
            <label>
              Amount
              <input
                type="number"
                min={0}
                step="any"
                value={amount}
                placeholder="Amount"
                onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
              />
            </label>
            <label>
              Unit
              <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {needsConcentration && (
            <label className="reaction-controls__conc">
              Concentration (mol/L)
              <input
                type="number"
                min={0}
                step="any"
                value={concentration}
                onChange={(e) => setConcentration(e.target.value === "" ? "" : parseFloat(e.target.value))}
              />
            </label>
          )}
          <Button
            variant="primary"
            disabled={isLoading || amount === "" || amount <= 0 || (needsConcentration && (concentration === "" || concentration <= 0))}
            onClick={async () => {
              if (amount === "" || amount <= 0) return;
              await addChemical(pendingChemical, amount, unit, needsConcentration ? (concentration as number) : undefined);
              onAdded();
            }}
          >
            Add to container
          </Button>
        </div>
      ) : (
        <p className="reaction-controls__hint">Search and select a chemical to add it to the active container.</p>
      )}

      <div className="reaction-controls__divider" />

      <div className="reaction-controls__conditions">
        <p className="reaction-controls__section-title">Conditions</p>
        <label>
          Temperature ({conditions.temperatureC ?? 25}{" \u00b0C)"}
          <input
            type="range"
            min={-20}
            max={250}
            value={conditions.temperatureC ?? 25}
            onChange={(e) => setConditions({ temperatureC: parseFloat(e.target.value) })}
          />
        </label>
        <label>
          Solvent
          <input type="text" value={conditions.solvent ?? ""} onChange={(e) => setConditions({ solvent: e.target.value })} placeholder="water" />
        </label>
      </div>

      <Button
        variant="primary"
        disabled={isLoading || !activeContainer || activeContainer.contents.length === 0}
        onClick={() => runReaction()}
      >
        {isLoading ? "Running\u2026" : "React"}
      </Button>
    </div>
  );
}
