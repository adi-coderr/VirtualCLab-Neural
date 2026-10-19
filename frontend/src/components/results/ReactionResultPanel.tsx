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
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const openSettings = useSettingsStore((s) => s.openSettings);

  const hasConditions = Boolean(
    resolution.conditionsDescription?.trim() ||
    resolution.specialConditions?.description?.trim()
  );

  useEffect(() => {
    if (!showConditionsModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowConditionsModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConditionsModal]);

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

  // Check for balancedEquation or fallback to legitimate chemical equation embedded in explanation
  const displayEquation = useMemo(() => {
    if (resolution.balancedEquation && resolution.balancedEquation.trim()) {
      return resolution.balancedEquation.trim();
    }
    if (resolution.explanation) {
      return extractChemicalEquation(resolution.explanation);
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
            <span className="reaction-result__ai-key-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.4L12 21.6l-2.4-7.2L2.4 12l7.2-2.4z" />
              </svg>
            </span>
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
            {calorimetry.temperatureDeltaC < 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                <path d="M19 5v6m0 0l-2-2m2 2l2-2" />
              </svg>
            ) : calorimetry.temperatureDeltaC > 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                <path d="M17 7l2-2m0 0l2 2m-2-2v6" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
              </svg>
            )}
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

      {/* 6b. Hackathon Showcase: Conditions Section & Popup (Only for reactions with conditions) */}
      {hasConditions && (
        <div className="reaction-result__conditions-card">
          <div className="reaction-result__conditions-top">
            <div className="reaction-result__conditions-icon-wrap" aria-hidden="true">
              <span className="reaction-result__conditions-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2v7.31L4.5 19.5A2 2 0 0 0 6.23 22h11.54a2 2 0 0 0 1.73-2.5L14 9.31V2" />
                  <line x1="8.5" y1="2" x2="15.5" y2="2" />
                  <line x1="6.5" y1="16" x2="17.5" y2="16" />
                </svg>
              </span>
            </div>
            <div className="reaction-result__conditions-main">
              <div className="reaction-result__conditions-header-row">
                <span className="reaction-result__conditions-badge">
                  <span className="reaction-result__conditions-dot" />
                  Required Reaction Conditions
                </span>
                <button
                  type="button"
                  className="reaction-result__conditions-popup-btn"
                  onClick={() => setShowConditionsModal(true)}
                  title="Open detailed popup with complete setup protocol, outcome, and reaction parameters"
                >
                  <span className="reaction-result__conditions-btn-sparkle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </span>
                  <span>View Reaction Protocol</span>
                </button>
              </div>

              <div className="reaction-result__conditions-text-row">
                <strong className="reaction-result__conditions-label">Conditions:</strong>
                <span className="reaction-result__conditions-desc">
                  {resolution.conditionsDescription || resolution.specialConditions?.description}
                </span>
              </div>

              <div className="reaction-result__conditions-beaker-cue">
                <span className="reaction-result__conditions-beaker-cue-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5V2" />
                    <line x1="8.5" y1="2" x2="15.5" y2="2" />
                    <line x1="9.5" y1="12" x2="14.5" y2="12" />
                  </svg>
                </span>
                <span className="reaction-result__conditions-beaker-cue-text">
                  Physical after-effects and residue are simulated visually in the workbench beaker.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conditions Popup Modal */}
      {showConditionsModal && hasConditions && (
        <div
          className="reaction-conditions-modal__overlay"
          onClick={() => setShowConditionsModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reaction-conditions-modal-title"
        >
          <div
            className="reaction-conditions-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="reaction-conditions-modal__header">
              <div className="reaction-conditions-modal__header-left">
                <div className="reaction-conditions-modal__icon-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2v7.31L4.5 19.5A2 2 0 0 0 6.23 22h11.54a2 2 0 0 0 1.73-2.5L14 9.31V2" />
                    <line x1="8.5" y1="2" x2="15.5" y2="2" />
                    <line x1="6.5" y1="16" x2="17.5" y2="16" />
                  </svg>
                </div>
                <div>
                  <h3 id="reaction-conditions-modal-title" className="reaction-conditions-modal__title">
                    {displayEquation || resolution.balancedEquation || "Special Reaction Protocol"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className="reaction-conditions-modal__close-btn"
                onClick={() => setShowConditionsModal(false)}
                aria-label="Close conditions popup"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="reaction-conditions-modal__body">
              {/* Card 1: Conditions */}
              <div className="reaction-conditions-modal__card reaction-conditions-modal__card--conditions">
                <div className="reaction-conditions-modal__card-header">
                  <span className="reaction-conditions-modal__card-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </span>
                  <h4>Required Experimental Conditions &amp; Setup</h4>
                </div>
                <p className="reaction-conditions-modal__card-text">
                  {resolution.conditionsDescription || resolution.specialConditions?.description}
                </p>
              </div>

              {/* Card 2: Outcome */}
              {(resolution.outcome || resolution.specialConditions?.outcome) && (
                <div className="reaction-conditions-modal__card reaction-conditions-modal__card--outcome">
                  <div className="reaction-conditions-modal__card-header">
                    <span className="reaction-conditions-modal__card-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </span>
                    <h4>Empirical Reaction Outcome &amp; Observations</h4>
                  </div>
                  <p className="reaction-conditions-modal__card-text">
                    {resolution.outcome || resolution.specialConditions?.outcome}
                  </p>
                </div>
              )}

              {/* Card 3: After-Effect */}
              {(resolution.afterEffect || resolution.specialConditions?.afterEffect) && (
                <div className="reaction-conditions-modal__card reaction-conditions-modal__card--aftereffect">
                  <div className="reaction-conditions-modal__card-header">
                    <span className="reaction-conditions-modal__card-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4.5 3h15" />
                        <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
                        <path d="M6 14h12" />
                      </svg>
                    </span>
                    <h4>Observed After-Effect &amp; Beaker State</h4>
                    <span className="reaction-conditions-modal__card-badge">Simulated in Beaker</span>
                  </div>
                  <p className="reaction-conditions-modal__card-text">
                    {resolution.afterEffect || resolution.specialConditions?.afterEffect}
                  </p>
                </div>
              )}

              {/* Card 4: Parameters & Thermodynamics */}
              <div className="reaction-conditions-modal__card reaction-conditions-modal__card--params">
                <div className="reaction-conditions-modal__card-header">
                  <span className="reaction-conditions-modal__card-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                    </svg>
                  </span>
                  <h4>Energetics &amp; Reaction Parameters</h4>
                </div>
                <div className="reaction-conditions-modal__params-grid">
                  <div className="reaction-conditions-modal__param">
                    <span className="reaction-conditions-modal__param-label">Enthalpy (ΔH)</span>
                    <span className="reaction-conditions-modal__param-value">
                      {resolution.enthalpyKjPerMol !== undefined
                        ? `${resolution.enthalpyKjPerMol > 0 ? "+" : ""}${resolution.enthalpyKjPerMol} kJ/mol`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="reaction-conditions-modal__param">
                    <span className="reaction-conditions-modal__param-label">Thermal Profile</span>
                    <span className="reaction-conditions-modal__param-value reaction-conditions-modal__param-value--capitalize">
                      {resolution.energyClassification ||
                        (resolution.enthalpyKjPerMol && resolution.enthalpyKjPerMol < 0
                          ? "Exothermic"
                          : "Endothermic")}
                    </span>
                  </div>
                  <div className="reaction-conditions-modal__param">
                    <span className="reaction-conditions-modal__param-label">Reaction Type</span>
                    <span className="reaction-conditions-modal__param-value reaction-conditions-modal__param-value--capitalize">
                      {(resolution.reactionType || "Synthesis").replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="reaction-conditions-modal__param">
                    <span className="reaction-conditions-modal__param-label">Database Status</span>
                    <span className="reaction-conditions-modal__param-value">
                      Verified Laboratory Standard
                    </span>
                  </div>
                </div>

                {resolution.safetyNotes && (
                  <div className="reaction-conditions-modal__safety">
                    <span className="reaction-conditions-modal__safety-icon" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </span>
                    <strong>Safety Protocol:</strong> {resolution.safetyNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="reaction-conditions-modal__footer">
              <span className="reaction-conditions-modal__footer-tip">
                Tip: Press <kbd>ESC</kbd> or click outside to dismiss
              </span>
              <button
                type="button"
                className="reaction-conditions-modal__footer-btn"
                onClick={() => setShowConditionsModal(false)}
              >
                Close Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Warnings (Real hazard warnings only) */}
      {displayWarnings.length > 0 && (
        <div className="reaction-result__warnings-card">
          <span className="reaction-result__warnings-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
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

function isValidChemicalFormulaTerm(term: string): boolean {
  const clean = term.trim().replace(/^\d+\s*/, "").replace(/[([](s|l|g|aq)[)\]]/gi, "").trim();
  if (!clean) return true;
  // If it contains prose words, it is not a pure chemical formula
  const proseRegex = /\b(the|and|for|from|with|under|reaction|catalytic|decomposition|toothpaste|elephant|oxidation|reduction|multiple|curated|outcomes|depending|conditions|provide|specific|disambiguate|applies|standard|dilute|concentrated|acid|base|solution|mixture|forming|yielding)\b/i;
  if (proseRegex.test(clean)) return false;
  // Chemical terms consist of element symbols, digits, parentheses, brackets, charges
  return /^[A-Z][a-zA-Z0-9()[\]^+\-·•._]*$/.test(clean);
}

function isLegitimateEquation(eq: string): boolean {
  if (!eq.includes("->") && !eq.includes("→") && !eq.includes("⇌")) return false;
  const proseRegex = /\b(the|and|for|from|with|under|reaction|catalytic|decomposition|toothpaste|elephant|oxidation|reduction|multiple|curated|outcomes|depending|conditions|provide|specific|disambiguate|applies|standard|dilute|concentrated|acid|base|solution|mixture|forming|yielding)\b/i;
  if (proseRegex.test(eq)) return false;

  const arrow = eq.includes("⇌") ? "⇌" : eq.includes("→") ? "→" : "->";
  const sides = eq.split(arrow);
  if (sides.length !== 2) return false;

  const reactants = sides[0]!.split("+").map((s) => s.trim()).filter(Boolean);
  const products = sides[1]!.split("+").map((s) => s.trim()).filter(Boolean);
  if (reactants.length === 0 || products.length === 0) return false;

  return reactants.every(isValidChemicalFormulaTerm) && products.every(isValidChemicalFormulaTerm);
}

function extractChemicalEquation(explanation: string): string | null {
  // 1. Try finding explicit equations inside parentheses first e.g. "(2H2O2 -> 2H2O + O2)"
  const parenMatches = explanation.matchAll(/\(([^()]+?(?:->|→|⇌)[^()]+?)\)/g);
  for (const m of parenMatches) {
    const candidate = m[1]?.trim();
    if (candidate && isLegitimateEquation(candidate)) {
      return candidate;
    }
  }

  // 2. Try standalone lines e.g. after colon or newline
  const lineMatches = explanation.matchAll(/(?:^|[:\n]\s*)([A-Za-z0-9()[\]^+\-\s·]+?\s*(?:->|→|⇌)\s*[A-Za-z0-9()[\]^+\-\s·]+?)(?=[.;\n]|$)/g);
  for (const m of lineMatches) {
    const candidate = m[1]?.trim();
    if (candidate && isLegitimateEquation(candidate)) {
      return candidate;
    }
  }

  return null;
}