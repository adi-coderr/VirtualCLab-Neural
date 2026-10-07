import { useEffect, useState } from "react";
import type { SimulationResult } from "../../types/chemistry";
import { chemicalsApi } from "../../api/chemicals";
import type { Chemical } from "../../types/chemistry";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EquationDisplay } from "./EquationDisplay";
import { ObservableEffectsPanel } from "./ObservableEffectsPanel";
import { PropertiesPanel } from "../properties/PropertiesPanel";
import { SafetyPanel } from "../safety/SafetyPanel";
import { MoleculeViewer } from "../molecule/MoleculeViewer";
import { ProcessBreakdownPanel } from "./ProcessBreakdownPanel";
import { Tabs } from "../common/Tabs";
import { formatFormula } from "../../utils/formatFormula";
import { useSettingsStore } from "../../state/settingsStore";
import "./ReactionResultPanel.css";

export function ReactionResultPanel({ result }: { result: SimulationResult }) {
  const { resolution, stoichiometry } = result;
  const calorimetry = result.calorimetry ?? resolution.calorimetry;
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPatentProcedureOpen, setIsPatentProcedureOpen] = useState(false);
  const [isRawTokensOpen, setIsRawTokensOpen] = useState(false);
  const openSettings = useSettingsStore((s) => s.openSettings);


  const registeredSpecies = [...resolution.reactants, ...resolution.products].filter((s) => s.isRegistered);

  useEffect(() => {
    const first = registeredSpecies[0];
    if (first && !selectedId) setSelectedId(first.chemicalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    chemicalsApi.getById(selectedId).then((c) => {
      if (!cancelled) setSelectedChemical(c);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Filter out redundant AI engine notes from warnings if already displayed in AI banner
  const displayWarnings = resolution.warnings.filter(
    (w) => !w.toLowerCase().includes("dynamically predicted by")
  );

  return (
    <div className="reaction-result">
      {/* 1. Header with Confidence & Reaction Type */}
      <div className="reaction-result__headline">
        <ConfidenceBadge
          tier={resolution.confidenceTier}
          score={resolution.confidenceScore}
          aiProvider={resolution.aiProvider}
          isAiPredicted={resolution.isAiPredicted}
        />
        {resolution.reactionType && (
          <span className="reaction-result__type">{resolution.reactionType.replace(/_/g, " ")}</span>
        )}
      </div>

      {/* 2. Dynamic AI Prediction Banner */}
      {resolution.isAiPredicted && (
        <div className="reaction-result__ai-banner">
          <span className="reaction-result__ai-badge">✨ Dynamic AI Prediction</span>
          <p className="reaction-result__ai-text">
            This reaction was computed in real time using <strong>{resolution.aiProvider || "the AI engine"}</strong> after checking our database records.
          </p>
        </div>
      )}

      {/* 3. Prompt when AI Key is missing for Unsupported Reactions */}
      {resolution.status === "UNSUPPORTED" && (
        <div className="reaction-result__ai-key-prompt">
          <div className="reaction-result__ai-key-prompt-header">
            <span className="reaction-result__ai-key-icon">✨</span>
            <div className="reaction-result__ai-key-prompt-content">
              <strong>Reaction Not in Database — AI Ready</strong>
              <p className="reaction-result__ai-key-prompt-desc">
                This combination is not in our database. Configure your Groq, Gemini, OpenAI, or Claude key to automatically predict products and energetics.
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
          {resolution.balancedEquation ? (
            <EquationDisplay equation={resolution.balancedEquation} />
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
      {resolution.explanation && (
        <div className="reaction-result__explanation-box">
          <p className="reaction-result__explanation">{resolution.explanation}</p>
        </div>
      )}

      {/* 5b. 🧠 1.8M Neural ML Model Analysis Card (virtual_chem_lab_model) */}
      {result.mlPrediction && (
        <div className="reaction-result__ml-card">
          <div className="reaction-result__ml-header">
            <div className="reaction-result__ml-title-wrap">
              <span className="reaction-result__ml-icon">🧠</span>
              <div>
                <div className="reaction-result__ml-title">1.8M Neural ML Model Analysis</div>
                <div className="reaction-result__ml-subtitle mono">{result.mlPrediction.modelName}</div>
              </div>
            </div>
            <div className="reaction-result__ml-meta mono">
              ⚡ {result.mlPrediction.latencyMs}ms | {result.mlPrediction.device?.toUpperCase() || "MPS"} GPU
            </div>
          </div>

          <div className="reaction-result__ml-badges">
            {result.mlPrediction.reactionType && (
              <span className="reaction-result__ml-badge reaction-result__ml-badge--type">
                🧬 {result.mlPrediction.reactionType}
              </span>
            )}
            {result.mlPrediction.atomEconomyPercent !== undefined && (
              <span className="reaction-result__ml-badge reaction-result__ml-badge--eco">
                🌿 Atom Economy: {result.mlPrediction.atomEconomyPercent}%
              </span>
            )}
            {result.mlPrediction.beamsUsed && (
              <span className="reaction-result__ml-badge reaction-result__ml-badge--beams">
                🎯 Beam Search: {result.mlPrediction.beamsUsed}
              </span>
            )}
          </div>

          <div className="reaction-result__ml-equation mono">
            {result.mlPrediction.predictedEquation}
          </div>

          {/* Detailed Product Chemical Profiles */}
          {result.mlPrediction.productAnalyses && result.mlPrediction.productAnalyses.length > 0 ? (
            <div className="reaction-result__ml-profiles">
              <div className="reaction-result__ml-profiles-title">Predicted Products & Molecular Properties:</div>
              <div className="reaction-result__ml-profiles-grid">
                {result.mlPrediction.productAnalyses.map((prod, idx) => (
                  <div key={idx} className="reaction-result__ml-profile-card">
                    <div className="reaction-result__ml-profile-head">
                      <div>
                        <span className="reaction-result__ml-profile-name">{prod.name}</span>
                        <span className="reaction-result__ml-profile-formula mono">{prod.formula}</span>
                      </div>
                      <span className={`reaction-result__ml-state-badge reaction-result__ml-state-badge--${prod.physicalState}`}>
                        {prod.physicalState === "solid" ? "🧊 Solid" : prod.physicalState === "gas" ? "💨 Gas" : prod.physicalState === "aqueous" ? "💧 Aqueous" : "💧 Liquid"}
                      </span>
                    </div>

                    <div className="reaction-result__ml-profile-details">
                      <div className="reaction-result__ml-detail-row">
                        <span className="reaction-result__ml-detail-label">Molar Mass:</span>
                        <span className="reaction-result__ml-detail-val mono">{prod.molarMass} g/mol</span>
                      </div>
                      <div className="reaction-result__ml-detail-row">
                        <span className="reaction-result__ml-detail-label">Visual Appearance:</span>
                        <span className="reaction-result__ml-detail-val">{prod.appearance}</span>
                      </div>
                      {prod.smiles && (
                        <div className="reaction-result__ml-detail-row">
                          <span className="reaction-result__ml-detail-label">SMILES:</span>
                          <span className="reaction-result__ml-detail-val mono reaction-result__ml-smiles">{prod.smiles}</span>
                        </div>
                      )}
                    </div>

                    {prod.functionalGroups && prod.functionalGroups.length > 0 && (
                      <div className="reaction-result__ml-groups">
                        {prod.functionalGroups.map((g, gIdx) => (
                          <span key={gIdx} className="reaction-result__ml-group-tag">
                            🏷️ {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="reaction-result__ml-products">
              <span className="reaction-result__ml-products-label">Synthesized Products:</span>
              <div className="reaction-result__ml-chips">
                {result.mlPrediction.predictedProducts.map((p, idx) => (
                  <span key={idx} className="reaction-result__ml-chip mono">
                    ⚗️ {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.mlPrediction.expectedByproducts && result.mlPrediction.expectedByproducts.length > 0 && (
            <div className="reaction-result__ml-byproducts">
              <strong>Expected Byproducts:</strong> {result.mlPrediction.expectedByproducts.join(", ")}
            </div>
          )}

          {result.mlPrediction.mechanismNotes && (
            <div className="reaction-result__ml-notes">
              💡 {result.mlPrediction.mechanismNotes}
            </div>
          )}

          <div className="reaction-result__ml-footer">
            <button
              type="button"
              className="reaction-result__ml-toggle"
              onClick={() => setIsRawTokensOpen(!isRawTokensOpen)}
            >
              {isRawTokensOpen ? "Hide Raw Neural Tokens ▲" : "View Raw Neural Tokens ▼"}
            </button>
            <span className="reaction-result__ml-provenance">
              Trained on 1.8M USPTO reactions
            </span>
          </div>

          {isRawTokensOpen && (
            <div className="reaction-result__ml-tokens mono">
              {result.mlPrediction.rawOutput}
            </div>
          )}
        </div>
      )}

      {/* 5c. 📚 2.0M Patent Literature Match Card (ChemRxn Database) */}
      {result.patentMatch && (
        <div className="reaction-result__patent-card">
          <div className="reaction-result__patent-header">
            <div className="reaction-result__patent-badges">
              <span className="reaction-result__patent-badge">📚 2M Patent Literature</span>
              <a
                href={result.patentMatch.patentUrl || `https://patents.google.com/patent/${result.patentMatch.documentId}/en`}
                target="_blank"
                rel="noopener noreferrer"
                className="reaction-result__patent-doc mono"
                title="View full patent document on Google Patents"
              >
                {result.patentMatch.documentId} ↗
              </a>
              <span className="reaction-result__patent-year">{result.patentMatch.year}</span>
              {(result.patentMatch.yieldPercent || result.patentMatch.yieldText) && (
                <span className="reaction-result__patent-yield">
                  Yield: {result.patentMatch.yieldText || `${Math.round(result.patentMatch.yieldPercent!)}%`}
                </span>
              )}
              {result.patentMatch.productState && (
                <span className="reaction-result__patent-tag">
                  State: {result.patentMatch.productState}
                </span>
              )}
              {result.patentMatch.productAppearance && (
                <span className="reaction-result__patent-tag">
                  Appearance: {result.patentMatch.productAppearance}
                </span>
              )}
            </div>
          </div>

          <h5 className="reaction-result__patent-heading">
            {result.patentMatch.heading}
          </h5>

          <div className="reaction-result__patent-equation mono">
            {result.patentMatch.equationDisplay}
          </div>

          {/* Real Laboratory Reactants & Starting Materials */}
          {result.patentMatch.reactants && result.patentMatch.reactants.length > 0 && (
            <div className="reaction-result__patent-section">
              <div className="reaction-result__patent-section-label">🔬 Experimental Reactants & Quantities:</div>
              <div className="reaction-result__patent-items-grid">
                {result.patentMatch.reactants.map((r, idx) => (
                  <div key={idx} className="reaction-result__patent-item-card">
                    <div className="reaction-result__patent-item-name">{r.name}</div>
                    <div className="reaction-result__patent-item-sub mono">
                      {r.formula && <span className="reaction-result__patent-item-formula">{r.formula}</span>}
                      {r.mass && <span className="reaction-result__patent-item-qty">Qty: {r.mass}</span>}
                      {r.amount && <span className="reaction-result__patent-item-qty">{r.amount}</span>}
                    </div>
                    {r.smiles && <div className="reaction-result__patent-item-smiles mono">{r.smiles}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real Isolated Products & Yields */}
          {result.patentMatch.products && result.patentMatch.products.length > 0 && (
            <div className="reaction-result__patent-section">
              <div className="reaction-result__patent-section-label">⚗️ Isolated Literature Products:</div>
              <div className="reaction-result__patent-items-grid">
                {result.patentMatch.products.map((p, idx) => (
                  <div key={idx} className="reaction-result__patent-item-card reaction-result__patent-item-card--product">
                    <div className="reaction-result__patent-item-name">
                      {p.name}
                      {(p.yieldText || p.yieldPercent) && (
                        <span className="reaction-result__patent-item-yield">
                          {p.yieldText || `${p.yieldPercent}% yield`}
                        </span>
                      )}
                    </div>
                    <div className="reaction-result__patent-item-sub mono">
                      {p.formula && <span className="reaction-result__patent-item-formula">{p.formula}</span>}
                      {p.mass && <span className="reaction-result__patent-item-qty">Mass: {p.mass}</span>}
                      {p.state && <span className="reaction-result__patent-item-state">({p.state})</span>}
                    </div>
                    {p.appearance && (
                      <div className="reaction-result__patent-item-appearance">
                        Visual: {p.appearance}
                      </div>
                    )}
                    {p.smiles && <div className="reaction-result__patent-item-smiles mono">{p.smiles}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Solvents & Catalysts */}
          {(result.patentMatch.solvents || result.patentMatch.catalysts) && (
            <div className="reaction-result__patent-meta">
              {result.patentMatch.solvents && (
                <span><strong>Solvent:</strong> {result.patentMatch.solvents}</span>
              )}
              {result.patentMatch.catalysts && (
                <span><strong>Catalyst:</strong> {result.patentMatch.catalysts}</span>
              )}
            </div>
          )}

          {/* Step-by-Step Synthetic Laboratory Procedure */}
          {result.patentMatch.actions && result.patentMatch.actions.length > 0 && (
            <div className="reaction-result__patent-actions">
              <div className="reaction-result__patent-section-label">📋 Step-by-Step Laboratory Synthesis Protocol:</div>
              <ol className="reaction-result__patent-action-list">
                {result.patentMatch.actions.map((act, idx) => (
                  <li key={idx} className="reaction-result__patent-action-item">
                    <strong className="reaction-result__patent-action-type">{act.action}:</strong>{" "}
                    <span>{act.phrase}</span>
                    {(act.temp || act.time) && (
                      <div className="reaction-result__patent-action-cond mono">
                        {act.temp && <span>🌡️ {act.temp}</span>}
                        {act.time && <span>⏱️ {act.time}</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Full Experimental Patent Text */}
          {result.patentMatch.procedureText && (
            <div className="reaction-result__patent-procedure">
              <button
                type="button"
                className="reaction-result__patent-toggle"
                onClick={() => setIsPatentProcedureOpen(!isPatentProcedureOpen)}
              >
                {isPatentProcedureOpen ? "Hide Original Patent Text ▲" : "View Original Patent Laboratory Procedure ▼"}
              </button>
              {isPatentProcedureOpen && (
                <p className="reaction-result__patent-text">
                  {result.patentMatch.procedureText}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. Calorimetry & Temperature Change Card */}
      {calorimetry && (

        <div
          className={`reaction-result__thermo-card ${
            calorimetry.temperatureDeltaC < 0
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

      {/* 8. Species Selector (if registered chemicals are in reaction) */}
      {registeredSpecies.length > 0 && (
        <div className="reaction-result__species-picker-wrapper">
          <span className="reaction-result__species-picker-title">Substance Details:</span>
          <div className="reaction-result__species-picker">
            {registeredSpecies.map((s) => (
              <button
                key={s.chemicalId}
                type="button"
                className={`reaction-result__species-chip ${s.chemicalId === selectedId ? "is-selected" : ""}`}
                onClick={() => setSelectedId(s.chemicalId)}
                title={s.commonName}
              >
                <span className="formula">{formatFormula(s.formula)}</span>
                <span className="reaction-result__species-chip-name">{s.commonName}</span>
              </button>
            ))}
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
