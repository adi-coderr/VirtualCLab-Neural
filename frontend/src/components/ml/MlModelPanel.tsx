import { useState, useEffect } from "react";
import { reactionsApi, type LocalMlModelStatus, type LocalMlPredictResponse } from "../../api/reactions";
import { Spinner } from "../common/Badge";
import "./MlModelPanel.css";

const PRESET_REACTIONS = [
  {
    name: "Esterification (Fischer)",
    desc: "Acetic acid + Ethanol → Ethyl acetate",
    query: "[CH3:1][C:2](=[O:3])[OH:4].[CH3:5][CH2:6][OH:7]",
  },
  {
    name: "Aromatic Halogenation",
    desc: "Benzene + Chlorine → Chlorobenzene",
    query: "C1=CC=CC=C1.Cl2",
  },
  {
    name: "Diels-Alder Cycloaddition",
    desc: "1,3-Butadiene + Ethylene → Cyclohexene",
    query: "C=CC=C.C=C",
  },
  {
    name: "Nucleophilic Acyl Transfer",
    desc: "Acetyl chloride + Ethylamine → N-ethylacetamide",
    query: "CC(=O)Cl.CCN",
  },
  {
    name: "Simple Alcohol + Acid",
    desc: "Ethanol + Acetic acid (SMILES)",
    query: "CCO.CC(=O)O",
  },
  {
    name: "Aldol Condensation",
    desc: "Benzaldehyde + Acetone",
    query: "O=Cc1ccccc1.CC(=O)C",
  },
];

export function MlModelPanel() {
  const [modelStatus, setModelStatus] = useState<LocalMlModelStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isStartingServer, setIsStartingServer] = useState(false);

  const [inputQuery, setInputQuery] = useState("[CH3:1][C:2](=[O:3])[OH:4].[CH3:5][CH2:6][OH:7]");
  const [numBeams, setNumBeams] = useState(4);
  const [maxLength, setMaxLength] = useState(128);

  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<LocalMlPredictResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await reactionsApi.getModelStatus();
      setModelStatus(status);
    } catch (err: any) {
      setModelStatus({
        status: "offline",
        modelName: "ReactionT5v2",
        architecture: "T5ForConditionalGeneration",
        parameters: "248M",
        trainingDataset: "Open Reaction Database (ORD) & USPTO",
        vocabSize: 268,
        device: "unknown",
        endpoint: "http://127.0.0.1:5005",
        error: err.message,
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStartServer = async () => {
    setIsStartingServer(true);
    setErrorMessage(null);
    try {
      const res = await reactionsApi.startLocalModel();
      setModelStatus(res);
    } catch (err: any) {
      setErrorMessage(`Failed to start ML server: ${err.message}`);
    } finally {
      setIsStartingServer(false);
    }
  };

  const handlePredict = async (queryToRun?: string) => {
    const q = (queryToRun ?? inputQuery).trim();
    if (!q) {
      setErrorMessage("Please enter reactants or a SMILES query.");
      return;
    }
    setIsPredicting(true);
    setErrorMessage(null);
    try {
      const res = await reactionsApi.predictWithLocalModel({
        input: q,
        numBeams,
        maxLength,
      });
      setPredictionResult(res);
      // Refresh status after successful prediction
      fetchStatus();
    } catch (err: any) {
      setErrorMessage(err.message || "Model inference failed");
    } finally {
      setIsPredicting(false);
    }
  };

  const handleSelectPreset = (query: string) => {
    setInputQuery(query);
    handlePredict(query);
  };

  return (
    <div className="ml-panel">
      {/* Model Spec & Status Card */}
      <div className="ml-hero-card">
        <div className="ml-hero-header">
          <div className="ml-badge-icon">🧠</div>
          <div>
            <h3 className="ml-hero-title">ReactionT5v2 Neural Predictor</h3>
            <p className="ml-hero-subtitle">
              Chemical Foundation Model trained on Open Reaction Database (ORD) & USPTO
            </p>
          </div>
        </div>

        <div className="ml-stats-grid">
          <div className="ml-stat-chip">
            <span className="ml-stat-label">Model</span>
            <span className="ml-stat-val mono">{modelStatus?.modelName || "ReactionT5v2"}</span>
          </div>
          <div className="ml-stat-chip">
            <span className="ml-stat-label">Weights</span>
            <span className="ml-stat-val">{modelStatus?.parameters || "248M Params"}</span>
          </div>
          <div className="ml-stat-chip">
            <span className="ml-stat-label">Training Data</span>
            <span className="ml-stat-val">{modelStatus?.trainingDataset || "ORD & USPTO"}</span>
          </div>
          <div className="ml-stat-chip">
            <span className="ml-stat-label">Hardware Device</span>
            <span className="ml-stat-val mono">
              {modelStatus?.device === "mps"
                ? "Apple Silicon (MPS)"
                : modelStatus?.device || "CPU"}
            </span>
          </div>
        </div>

        <div className="ml-status-row">
          <div className="ml-status-indicator">
            <span
              className={`ml-status-dot ${
                modelStatus?.status === "ready"
                  ? "ml-status-dot--ready"
                  : modelStatus?.status === "starting"
                  ? "ml-status-dot--starting"
                  : "ml-status-dot--offline"
              }`}
            />
            <span className="ml-status-text">
              {modelStatus?.status === "ready"
                ? "Engine Ready (Port 5005)"
                : modelStatus?.status === "starting"
                ? "Spinning up PyTorch..."
                : "Offline / Standby"}
            </span>
          </div>

          <div className="ml-status-actions">
            {modelStatus?.status !== "ready" && (
              <button
                type="button"
                className="ml-btn ml-btn--sm ml-btn--primary"
                onClick={handleStartServer}
                disabled={isStartingServer}
              >
                {isStartingServer ? <Spinner size={12} /> : "Launch Model"}
              </button>
            )}
            <button
              type="button"
              className="ml-btn ml-btn--sm ml-btn--ghost"
              onClick={fetchStatus}
              disabled={isCheckingStatus}
              title="Refresh engine status"
            >
              {isCheckingStatus ? "Checking..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Preset Fast Trials */}
      <div className="ml-section">
        <h4 className="ml-section-title">Quick Pre-loaded Reaction Demos</h4>
        <div className="ml-presets-container">
          {PRESET_REACTIONS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              className="ml-preset-chip"
              onClick={() => handleSelectPreset(preset.query)}
              disabled={isPredicting}
            >
              <span className="ml-preset-name">{preset.name}</span>
              <span className="ml-preset-desc">{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Input Form */}
      <div className="ml-section">
        <h4 className="ml-section-title">Chemical Input &amp; Generation</h4>
        <div className="ml-input-box">
          <label htmlFor="ml-input-field" className="ml-input-label">
            Reactant SMILES / Chemical Reaction Formula
          </label>
          <textarea
            id="ml-input-field"
            className="ml-textarea mono"
            rows={2}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="e.g. [CH3:1][C:2](=[O:3])[OH:4].[CH3:5][CH2:6][OH:7] or C1=CC=CC=C1.Cl2"
          />

          <div className="ml-params-bar">
            <div className="ml-param-item">
              <label>Beams: {numBeams}</label>
              <input
                type="range"
                min={1}
                max={8}
                value={numBeams}
                onChange={(e) => setNumBeams(Number(e.target.value))}
              />
            </div>
            <div className="ml-param-item">
              <label>Max Tokens: {maxLength}</label>
              <input
                type="range"
                min={32}
                max={256}
                step={16}
                value={maxLength}
                onChange={(e) => setMaxLength(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="ml-action-row">
            <button
              type="button"
              className="ml-btn ml-btn--predict"
              onClick={() => handlePredict()}
              disabled={isPredicting || !inputQuery.trim()}
            >
              {isPredicting ? (
                <>
                  <Spinner size={16} /> Generating Prediction...
                </>
              ) : (
                "⚡ Predict Reaction Outcome (ML Model)"
              )}
            </button>
            <button
              type="button"
              className="ml-btn ml-btn--ghost"
              onClick={() => {
                setInputQuery("");
                setPredictionResult(null);
                setErrorMessage(null);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="ml-error-banner" role="alert">
          <span className="ml-error-icon">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Prediction Output Card */}
      {predictionResult && (
        <div className="ml-result-card">
          <div className="ml-result-header">
            <div className="ml-result-badge">Predicted Reaction Outcome</div>
            <div className="ml-result-meta mono">
              ⚡ {predictionResult.latencyMs}ms | Beams: {predictionResult.beamsUsed}
            </div>
          </div>

          <div className="ml-equation-box">
            <div className="ml-equation-title">Reaction Equation</div>
            <div className="ml-equation-str mono">{predictionResult.predictedEquation}</div>
          </div>

          <div className="ml-products-container">
            <div className="ml-products-label">Predicted Synthesized Products:</div>
            <div className="ml-products-chips">
              {predictionResult.predictedProducts.map((prod, idx) => (
                <div key={idx} className="ml-product-chip">
                  <span className="ml-product-icon">⚗️</span>
                  <span className="mono">{prod}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ml-raw-box">
            <div className="ml-raw-label">Raw Model Token Output:</div>
            <code className="ml-raw-code mono">{predictionResult.rawOutput}</code>
          </div>

          <div className="ml-provenance-footer">
            <span>
              Trained on <strong>Open Reaction Database (ORD) & USPTO</strong> | Model:{" "}
              <code>{predictionResult.modelName || "ReactionT5v2"}</code>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
