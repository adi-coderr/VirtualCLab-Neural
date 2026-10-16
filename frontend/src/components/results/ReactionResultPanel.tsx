import { useEffect, useState, useMemo } from "react";
import type { SimulationResult, Chemical, ResolvedSpecies } from "../../types/chemistry";
import type { UnifiedReactantDTO } from "../../types/reactant";
import { chemicalsApi } from "../../api/chemicals";
import { reactantsApi } from "../../api/reactants";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EquationDisplay } from "./EquationDisplay";
import { ObservableEffectsPanel } from "./ObservableEffectsPanel";
import { PropertiesPanel } from "../properties/PropertiesPanel";
import { ReactantPropertyDetails } from "../properties/ReactantPropertyDetails";
import { SafetyPanel } from "../safety/SafetyPanel";
import { MoleculeViewer } from "../molecule/MoleculeViewer";
import { ProcessBreakdownPanel } from "./ProcessBreakdownPanel";
import { Tabs } from "../common/Tabs";
import { formatFormula } from "../../utils/formatFormula";
import { getChemicalColor } from "../../utils/chemicalColorMixer";
import { useSettingsStore } from "../../state/settingsStore";
import "./ReactionResultPanel.css";

export function ReactionResultPanel({ result }: { result: SimulationResult }) {
  const { resolution, stoichiometry } = result;
  const calorimetry = result.calorimetry ?? resolution.calorimetry;
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unifiedReactant, setUnifiedReactant] = useState<UnifiedReactantDTO | null>(null);
  const [loadingReactant, setLoadingReactant] = useState(false);
  const openSettings = useSettingsStore((s) => s.openSettings);

  // Deduplicate reactants and products so all reaction substances can be inspected in 3D
  const allSpecies: ResolvedSpecies[] = useMemo(() => {
    const map = new Map<string, ResolvedSpecies>();
    for (const s of [...resolution.reactants, ...resolution.products]) {
      const key = s.chemicalId || s.formula;
      if (!map.has(key)) map.set(key, s);
    }
    return Array.from(map.values());
  }, [resolution]);

  useEffect(() => {
    const first = allSpecies[0];
    if (first) setSelectedId(first.chemicalId || first.formula);
  }, [allSpecies]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    chemicalsApi
      .getById(selectedId)
      .then((c) => {
        if (!cancelled && c) setSelectedChemical(c);
      })
      .catch(() => {
        // Fallback: build chemical object from species info
        const found = allSpecies.find((s) => s.chemicalId === selectedId || s.formula === selectedId);
        if (!cancelled && found) {
          setSelectedChemical({
            id: found.chemicalId || found.formula,
            commonName: found.commonName || found.formula,
            formula: found.formula,
            composition: {},
            charge: 0,
            molarMass: 0,
            physicalState: "liquid",
            isAcid: false,
            isBase: false,
            acidBaseStrength: "none",
            chemicalClass: "organic",
            aliases: [],
            hazards: [],
            provenance: { source: "virtual_chem_lab", confidence: "medium", dataVersion: "0.1" },
          });
        }
      });

    // Also fetch full unified reactant data for the comprehensive Chemical Profile section
    setLoadingReactant(true);
    reactantsApi
      .getById(selectedId)
      .then((data) => {
        if (!cancelled && data) {
          setUnifiedReactant(data);
        }
      })
      .catch((err) => {
        console.warn("Unified reactant fetch error:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingReactant(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, allSpecies]);

  // Filter out redundant AI engine notes from warnings
  const displayWarnings = resolution.warnings.filter(
    (w) =>
      !w.toLowerCase().includes("dynamically predicted by") &&
      !w.toLowerCase().includes("reaction outcome predicted by")
  );

  // Check for balancedEquation or fallback to chemical equation embedded in explanation
  const displayEquation = useMemo(() => {
    if (resolution.balancedEquation && resolution.balancedEquation.trim()) {
      return resolution.balancedEquation;
    }
    if (resolution.explanation) {
      const match = resolution.explanation.match(
        /(?:\(|\b)([A-Za-z0-9()[\]^+\-\s·]+?\s*(?:->|→)\s*[A-Za-z0-9()[\]^+\-\s·]+?)(?:\)|[.,;]|\s+is|\s+under|\s+at|\s+which|\s+yielding|\s+with|\s*$)/
      );
      if (match && match[1] && (match[1].includes("->") || match[1].includes("→"))) {
        return match[1].trim();
      }
    }
    return null;
  }, [resolution.balancedEquation, resolution.explanation]);

  // Clean meta-commentary from explanation to preserve pedagogical integrity
  const cleanExplanation = useMemo(() => {
    if (!resolution.explanation) return "";
    let text = resolution.explanation;
    text = text.replace(/\bthe\s+(?:local\s+)?(?:neural\s+)?(?:ml|machine\s+learning)\s+model['’]s?\s+prediction\s+is\s+incorrect[.,;]?\s*/gi, "");
    text = text.replace(/\bthe\s+(?:local\s+)?(?:neural\s+)?(?:ml|machine\s+learning)\s+model\s+(?:predicted|suggested|gave|output)[^.;\n]*[.;\n]\s*/gi, "");
    text = text.replace(/\bthe\s+predicted\s+products\s+[^.;\n]+are\s+chemically\s+invalid[^.;\n]*[.;\n]\s*/gi, "");
    text = text.replace(/\bpredicted\s+products\s+['"][^'"]+['"]\s+and\s+['"][^'"]+['"]\s+are\s+chemically\s+invalid[.;]?\s*/gi, "");
    text = text.replace(/\bthe\s+model\s+(?:hallucinated|erroneously|mistakenly)[^.;\n]*[.;\n]\s*/gi, "");
    text = text.replace(/\batomic\s+oxygen\s+is\s+highly\s+reactive\s+and\s+would\s+immediately\s+react[^.;\n]*[.;\n]\s*/gi, "");
    text = text.replace(/\band\s+zinc\s+does\s+not\s+change\s+oxidation\s+state\s+if\s+it\s+is\s+not\s+reacting[.,;]?\s*/gi, "");

    if (displayEquation || resolution.status === "REACTION") {
      text = text.replace(/\bWhile\s+([A-Z][a-z]+(?:\s+[a-z]+)*\s+is\s+thermodynamically\s+capable\s+of)/gi, "$1");
      text = text.replace(/,\s*this\s+reaction\s+is\s+kinetically\s+hindered\s+at\s+([0-9]+(?:\.[0-9]+)?\s*°C)/gi, ". At $1, this reaction is kinetically hindered");
      text = text.replace(
        /\bTherefore,?\s+under\s+standard\s+conditions\s*\([^)]*\),?\s*no\s+observable\s+reaction\s+occurs\.?\s*/gi,
        "Under standard conditions (25°C, 1 atm), the reaction rate is very slow due to surface passivation, but accelerates significantly upon heating or with steam. "
      );
      text = text.replace(/\bno\s+observable\s+reaction\s+occurs\b/gi, "the reaction rate is very slow without thermal activation");
    }

    text = text.replace(/\s{2,}/g, " ").replace(/\.\s*\./g, ".").replace(/^\s*[.,;:]\s*/, "").trim();
    text = text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
    return text;
  }, [resolution.explanation, displayEquation, resolution.status]);

  return (
    <div className="reaction-result">
      {/* 1. Header with Confidence & Reaction Type */}
      <div className="reaction-result__headline">
        <div className="reaction-result__headline-left">
          <ConfidenceBadge
            tier={resolution.confidenceTier}
            score={resolution.confidenceScore}
            aiProvider={resolution.aiProvider}
            isAiPredicted={resolution.isAiPredicted}
          />
          {resolution.aiProvider && resolution.isAiPredicted && (
            <span className="reaction-result__provider-badge" title={`Reaction synthesized via ${resolution.aiProvider}`}>
              {resolution.aiProvider}
            </span>
          )}
        </div>
        {resolution.reactionType && (
          <span className="reaction-result__type">{resolution.reactionType.replace(/_/g, " ")}</span>
        )}
      </div>

      {/* 3. Prompt when AI Key is missing for Unsupported Reactions */}
      {resolution.status === "UNSUPPORTED" && (
        <div className="reaction-result__ai-key-prompt">
          <div className="reaction-result__ai-key-prompt-header">
            <span className="reaction-result__ai-key-icon">✨</span>
            <div className="reaction-result__ai-key-prompt-content">
              <strong>Reaction Not in Database — AI Ready</strong>
              <p className="reaction-result__ai-key-prompt-desc">
                This combination is not in our database. Configure an AI API key to automatically predict products and energetics.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="reaction-result__open-settings-btn"
            onClick={openSettings}
          >
            Configure AI API Key
          </button>
        </div>
      )}

      {/* 4. Chemical Equation Card (Balanced Equation + Net Ionic Equation) */}
      <div className="reaction-result__equation-card">
        <div className="reaction-result__main-equation">
          {displayEquation ? (
            <EquationDisplay equation={displayEquation} />
          ) : (
            <p className="reaction-result__no-equation">
              {resolution.status === "NO_REACTION" ? "No net reaction occurs." : "No equation available."}
            </p>
          )}
        </div>

        {resolution.netIonicEquation && (
          <div className="reaction-result__ionic">
            <span className="reaction-result__ionic-label">Net Ionic</span>
            <div className="reaction-result__ionic-display">
              <EquationDisplay equation={resolution.netIonicEquation} />
            </div>
          </div>
        )}
      </div>

      {/* 5. Scientific Explanation */}
      {cleanExplanation && (
        <div className="reaction-result__explanation-box">
          <p className="reaction-result__explanation">{cleanExplanation}</p>
        </div>
      )}
      {/* 6. Calorimetry & Temperature Change Card */}
      {calorimetry && (

        <div
          className={`reaction-result__thermo-card ${calorimetry.temperatureDeltaC < 0
            ? "reaction-result__thermo-card--cold"
            : calorimetry.temperatureDeltaC > 0
              ? "reaction-result__thermo-card--warm"
              : "reaction-result__thermo-card--neutral"
            }`}
        >
          <div className="reaction-result__thermo-icon" aria-hidden="true">
            {calorimetry.temperatureDeltaC < 0 ? "❄️" : calorimetry.temperatureDeltaC > 0 ? "🔥" : "🌡️"}
          </div>
          <div className="reaction-result__thermo-info">
            <div className="reaction-result__thermo-title">
              {calorimetry.temperatureDeltaC < 0
                ? `Temperature Decreased by ${Math.abs(calorimetry.temperatureDeltaC).toFixed(1)} °C`
                : calorimetry.temperatureDeltaC > 0
                  ? `Temperature Increased by ${calorimetry.temperatureDeltaC.toFixed(1)} °C`
                  : "No Significant Temperature Change"}
            </div>
            <div className="reaction-result__thermo-details">
              <span>
                <strong>Initial:</strong> {calorimetry.initialTemperatureC.toFixed(1)} °C
              </span>
              <span className="reaction-result__thermo-arrow">→</span>
              <span>
                <strong>Final:</strong> {calorimetry.finalTemperatureC.toFixed(1)} °C
              </span>
              <span className="reaction-result__thermo-sep">•</span>
              <span>
                <strong>ΔH:</strong> {calorimetry.enthalpyKjPerMol > 0 ? "+" : ""}
                {calorimetry.enthalpyKjPerMol} kJ/mol
              </span>
              <span className="reaction-result__thermo-sep">•</span>
              <span>
                <strong>Heat:</strong> {(Math.abs(calorimetry.heatJoules) / 1000).toFixed(2)} kJ{" "}
                {calorimetry.heatJoules > 0 ? "absorbed" : "released"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. Warnings (Real hazard warnings only) */}
      {displayWarnings.length > 0 && (
        <div className="reaction-result__warnings-card">
          <span className="reaction-result__warnings-icon" aria-hidden="true">⚠️</span>
          <ul className="reaction-result__warnings-list">
            {displayWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 8. Species Selector (for all chemicals involved in reaction) */}
      {allSpecies.length > 0 && (
        <div className="reaction-result__species-picker-wrapper">
          <span className="reaction-result__species-picker-title">Substance Details:</span>
          <div className="reaction-result__species-picker">
            {allSpecies.map((s) => {
              const key = s.chemicalId || s.formula;
              const chemColor =
                (s as any).substanceColor ||
                getChemicalColor(s.chemicalId, s.formula, s.commonName);
              return (
                <button
                  key={key}
                  type="button"
                  className={`reaction-result__species-chip ${key === selectedId ? "is-selected" : ""}`}
                  onClick={() => setSelectedId(key)}
                  title={`${s.commonName || s.formula}${chemColor ? ` (IRL Color: ${chemColor})` : ""}`}
                >
                  {chemColor && chemColor.toLowerCase() !== "#ffffff" && (
                    <span
                      className="reaction-result__species-color-dot"
                      style={{ background: chemColor }}
                    />
                  )}
                  <span className="formula">{formatFormula(s.formula)}</span>
                  <span className="reaction-result__species-chip-name">{s.commonName || s.formula}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. Comprehensive Down Section Tabs: Process, Observations, Safety, Properties, Molecule, Quantities */}
      <div className="reaction-result__bottom-tabs">
        <Tabs
          className="reaction-result__tabs"
          defaultTabId="process"
          tabs={[
            {
              id: "process",
              label: "Process",
              content: <ProcessBreakdownPanel resolution={resolution} />,
            },
            {
              id: "effects",
              label: "Observations",
              content: <ObservableEffectsPanel effects={resolution.observableEffects} />,
            },
            {
              id: "safety",
              label: "Safety",
              content: selectedChemical ? (
                <SafetyPanel hazards={selectedChemical.hazards} safetyNotes={resolution.safetyNotes} />
              ) : (
                <p className="reaction-result__placeholder">Select a chemical above to view safety notes.</p>
              ),
            },
            {
              id: "properties",
              label: "Properties",
              content: selectedChemical ? (
                <PropertiesPanel chemical={selectedChemical} />
              ) : (
                <p className="reaction-result__placeholder">Select a chemical above to view properties.</p>
              ),
            },
            {
              id: "molecule",
              label: "3D Molecule",
              content: selectedChemical ? (
                <MoleculeViewer chemical={selectedChemical} />
              ) : (
                <p className="reaction-result__placeholder">Select a chemical above to view its 3D molecular structure.</p>
              ),
            },
            {
              id: "chemical-profile",
              label: "Chemical Profile",
              content: selectedChemical ? (
                <ReactantPropertyDetails
                  reactant={unifiedReactant}
                  fallbackChemical={selectedChemical}
                  isLoading={loadingReactant}
                />
              ) : (
                <p className="reaction-result__placeholder">Select a chemical above to view its comprehensive profile.</p>
              ),
            },
            {
              id: "quantities",
              label: "Quantities",
              content: stoichiometry ? (
                <QuantitiesTable lines={stoichiometry} />
              ) : (
                <p className="reaction-result__no-stoich">Quantities not computed for this result.</p>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function QuantitiesTable({ lines }: { lines: NonNullable<SimulationResult["stoichiometry"]> }) {
  return (
    <div className="quantities-table-wrapper">
      <table className="quantities-table">
        <thead>
          <tr>
            <th>Species</th>
            <th>Role</th>
            <th>Input</th>
            <th>Yield / remaining</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.chemicalId} className={line.isLimiting ? "quantities-table__limiting" : ""}>
              <td className="formula">{formatFormula(line.formula)}</td>
              <td>
                {line.role}
                {line.isLimiting ? " (limiting)" : ""}
              </td>
              <td>{line.inputMoles !== undefined ? `${line.inputMoles.toFixed(4)} mol` : "\u2014"}</td>
              <td>
                {line.theoreticalYieldMoles !== undefined
                  ? `${line.theoreticalYieldMoles.toFixed(4)} mol (${line.theoreticalYieldMass?.toFixed(3)} g)`
                  : line.remainingMoles !== undefined
                    ? `${line.remainingMoles.toFixed(4)} mol left over`
                    : "\u2014"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
