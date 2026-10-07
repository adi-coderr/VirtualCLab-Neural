import { useState, useEffect } from "react";
import { chemrxnApi } from "../../api/chemrxn";
import type { ChemrxnReaction, ChemrxnStats } from "../../types/chemrxn";
import { Spinner } from "../common/Badge";
import "./ChemrxnDatabaseModal.css";

interface ChemrxnDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToMlModel?: (query: string) => void;
  onSimulateInBench?: (reaction: ChemrxnReaction) => void;
}

export function ChemrxnDatabaseModal({
  isOpen,
  onClose,
  onSendToMlModel,
  onSimulateInBench,
}: ChemrxnDatabaseModalProps) {
  const [stats, setStats] = useState<ChemrxnStats | null>(null);
  const [reactions, setReactions] = useState<ChemrxnReaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedEra, setSelectedEra] = useState<string>("all");
  const [minYield, setMinYield] = useState<number | undefined>(undefined);
  const [productState, setProductState] = useState<string>("");

  // Ingestion state
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);

  // Active expanded reaction
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadStats();
    loadReactions();
  }, [isOpen]);

  const loadStats = async () => {
    try {
      const data = await chemrxnApi.getStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const loadReactions = async (overrideParams: any = {}) => {
    setIsLoading(true);
    try {
      const eraParam =
        selectedEra !== "all"
          ? (selectedEra as "2010s" | "2000s" | "1990s" | "1980s" | "1970s")
          : undefined;

      const res = await chemrxnApi.search({
        q: searchQuery || undefined,
        year: selectedYear,
        era: eraParam,
        minYield,
        productState: productState || undefined,
        limit: 30,
        ...overrideParams,
      });
      setReactions(res.items);
      setTotalCount(res.total);
    } catch (err) {
      console.error("Failed to search reactions", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReactions();
  };

  const handleBatchIngest = async () => {
    setIsIngesting(true);
    setIngestMsg("Indexing additional patent files across 1976-2016 archive...");
    try {
      // Ingest year 2010 with multiple files
      const res = await chemrxnApi.ingest({ year: 2010, maxFiles: 4 });
      setIngestMsg(`Successfully added ${res.count} patent reactions! Total: ${res.totalIndexed}`);
      await loadStats();
      await loadReactions();
    } catch (err: any) {
      setIngestMsg(`Ingest warning: ${err.message}`);
    } finally {
      setIsIngesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="crxn-modal-backdrop" onClick={onClose}>
      <div className="crxn-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="crxn-modal-header">
          <div className="crxn-brand-wrap">
            <span className="crxn-brand-badge">2,000,000+ REACTIONS</span>
            <h2 className="crxn-brand-title">
              📚 Chemical Reactions Patent Database
            </h2>
            <p className="crxn-brand-subtitle">
              Comprehensive USPTO Experimental Chemistry Archive (1976–2016)
            </p>
          </div>
          <button className="crxn-close-btn" onClick={onClose} title="Close Modal">
            ✕
          </button>
        </div>

        {/* Global Stats Overview Banner */}
        <div className="crxn-kpi-banner">
          <div className="crxn-kpi-chip">
            <span className="crxn-kpi-label">Corpus Scale</span>
            <span className="crxn-kpi-num">~2,000,000</span>
            <span className="crxn-kpi-sub">Total Reactions</span>
          </div>
          <div className="crxn-kpi-chip">
            <span className="crxn-kpi-label">Indexed in SQLite</span>
            <span className="crxn-kpi-num">
              {stats?.totalIndexed?.toLocaleString() || "35,496"}
            </span>
            <span className="crxn-kpi-sub">Fast-Search Cache</span>
          </div>
          <div className="crxn-kpi-chip">
            <span className="crxn-kpi-label">Patent Archives</span>
            <span className="crxn-kpi-num">2,460</span>
            <span className="crxn-kpi-sub">XML Patent Files</span>
          </div>
          <div className="crxn-kpi-chip">
            <span className="crxn-kpi-label">Historical Span</span>
            <span className="crxn-kpi-num">41 Years</span>
            <span className="crxn-kpi-sub">1976 — 2016</span>
          </div>
          <div className="crxn-kpi-chip">
            <span className="crxn-kpi-label">Avg Experimental Yield</span>
            <span className="crxn-kpi-num">{stats?.avgYield ?? 65}%</span>
            <span className="crxn-kpi-sub">High-Yield Count: {stats?.highYieldCount?.toLocaleString() || "5,069"}</span>
          </div>
        </div>

        {/* Search & Filters Toolbar */}
        <form className="crxn-toolbar" onSubmit={handleSearchSubmit}>
          <div className="crxn-search-input-wrap">
            <span className="crxn-search-icon">🔍</span>
            <input
              type="text"
              className="crxn-search-input"
              placeholder="Search reactants, products, SMILES, document ID, catalysts, or reaction names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="crxn-clear-btn"
                onClick={() => {
                  setSearchQuery("");
                  loadReactions({ q: undefined });
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="crxn-filters-row">
            <select
              className="crxn-select"
              value={selectedEra}
              onChange={(e) => {
                setSelectedEra(e.target.value);
                setSelectedYear(undefined);
              }}
            >
              <option value="all">All Eras (1976–2016)</option>
              <option value="2010s">2010s (2010–2016)</option>
              <option value="2000s">2000s (2000–2009)</option>
              <option value="1990s">1990s (1990–1999)</option>
              <option value="1980s">1980s (1980–1989)</option>
              <option value="1970s">1970s (1976–1979)</option>
            </select>

            <select
              className="crxn-select"
              value={minYield ?? ""}
              onChange={(e) =>
                setMinYield(e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">Any Yield</option>
              <option value="50">≥ 50% Yield</option>
              <option value="75">≥ 75% Yield</option>
              <option value="90">≥ 90% High Yield</option>
            </select>

            <select
              className="crxn-select"
              value={productState}
              onChange={(e) => setProductState(e.target.value)}
            >
              <option value="">Any Product State</option>
              <option value="crystals">Crystals / Crystalline</option>
              <option value="solid">Solid / Powder</option>
              <option value="oil">Oil</option>
              <option value="liquid">Liquid</option>
            </select>

            <button type="submit" className="crxn-action-btn crxn-action-btn--primary">
              Filter Reactions
            </button>

            <button
              type="button"
              className="crxn-action-btn crxn-action-btn--ingest"
              onClick={handleBatchIngest}
              disabled={isIngesting}
              title="Index more patent XML files into the database"
            >
              {isIngesting ? <Spinner size={14} /> : "⚡ Expand Index"}
            </button>
          </div>
        </form>

        {ingestMsg && (
          <div className="crxn-ingest-toast">
            ℹ️ {ingestMsg}
          </div>
        )}

        {/* Reaction List Area */}
        <div className="crxn-list-container">
          <div className="crxn-list-status">
            <span>
              Showing <strong>{reactions.length}</strong> of{" "}
              <strong>{totalCount.toLocaleString()}</strong> matched reactions
            </span>
          </div>

          {isLoading ? (
            <div className="crxn-loading-pane">
              <Spinner size={32} />
              <p>Querying 2 Million reactions database...</p>
            </div>
          ) : reactions.length === 0 ? (
            <div className="crxn-empty-pane">
              <span className="crxn-empty-icon">🧪</span>
              <p>No reactions matched your search query or filters.</p>
              <button
                type="button"
                className="crxn-action-btn"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedEra("all");
                  setMinYield(undefined);
                  setProductState("");
                  loadReactions({ q: undefined, era: undefined, minYield: undefined, productState: undefined });
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="crxn-grid">
              {reactions.map((rxn) => {
                const isExpanded = expandedId === rxn.id;
                return (
                  <div key={rxn.id} className="crxn-card">
                    <div className="crxn-card-header">
                      <div className="crxn-card-badges">
                        <span className="crxn-doc-badge mono">{rxn.documentId}</span>
                        <span className="crxn-year-badge">{rxn.year}</span>
                        {rxn.yieldPercent && (
                          <span className="crxn-yield-badge">
                            Yield: {Math.round(rxn.yieldPercent)}%
                          </span>
                        )}
                        {rxn.productState && (
                          <span className="crxn-state-badge">
                            {rxn.productState}
                          </span>
                        )}
                      </div>
                      <div className="crxn-card-actions">
                        {onSendToMlModel && (
                          <button
                            type="button"
                            className="crxn-btn-action"
                            onClick={() => {
                              // If reaction SMILES exists, extract reactants
                              const rxnQuery = rxn.reactionSmiles
                                ? rxn.reactionSmiles.split(">")[0] || rxn.reactantNames
                                : rxn.reactantNames;
                              onSendToMlModel(rxnQuery);
                              onClose();
                            }}
                            title="Send reactants to 1.8M ML model for neural prediction"
                          >
                            🧠 Test in ML Model
                          </button>
                        )}
                        {onSimulateInBench && (
                          <button
                            type="button"
                            className="crxn-btn-action crxn-btn-action--bench"
                            onClick={() => {
                              onSimulateInBench(rxn);
                              onClose();
                            }}
                            title="Simulate on Virtual Lab Bench"
                          >
                            🧪 Lab Bench
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="crxn-card-title">{rxn.heading || "Chemical Synthesis Reaction"}</h4>

                    <div className="crxn-equation mono">
                      {rxn.equationDisplay || `${rxn.reactantNames} → ${rxn.productNames}`}
                    </div>

                    {rxn.reactionSmiles && (
                      <div className="crxn-smiles-box">
                        <span className="crxn-smiles-label">SMILES:</span>
                        <span className="crxn-smiles-str mono">{rxn.reactionSmiles}</span>
                      </div>
                    )}

                    <div className="crxn-meta-row">
                      {rxn.solvents && (
                        <span className="crxn-meta-item">
                          <strong>Solvent:</strong> {rxn.solvents}
                        </span>
                      )}
                      {rxn.catalysts && (
                        <span className="crxn-meta-item">
                          <strong>Catalyst:</strong> {rxn.catalysts}
                        </span>
                      )}
                    </div>

                    {rxn.procedureText && (
                      <div className="crxn-procedure-box">
                        <button
                          type="button"
                          className="crxn-expand-toggle"
                          onClick={() => setExpandedId(isExpanded ? null : rxn.id)}
                        >
                          {isExpanded ? "▲ Hide Procedure" : "▼ View Laboratory Patent Procedure"}
                        </button>
                        {isExpanded && (
                          <p className="crxn-procedure-text">{rxn.procedureText}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
