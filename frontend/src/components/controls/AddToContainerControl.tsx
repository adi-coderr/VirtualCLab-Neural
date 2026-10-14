import { useEffect, useState } from "react";
import { useLabStore } from "../../state/experimentStore";
import type { ChemicalSummary, Unit } from "../../types/chemistry";
import { formatFormula } from "../../utils/formatFormula";
import { Button } from "../common/Badge";
import "./AddToContainerControl.css";

const UNITS: Unit[] = ["mL", "L", "g", "kg", "mg", "mol", "mmol"];
const VOLUME_UNITS: Unit[] = ["mL", "L"];

interface AddToContainerControlProps {
  pendingChemical: ChemicalSummary | null;
  onAdded: () => void;
  onCancel?: () => void;
}

export function AddToContainerControl({
  pendingChemical,
  onAdded,
  onCancel,
}: AddToContainerControlProps) {
  const [amount, setAmount] = useState<number | "">(20);
  const [unit, setUnit] = useState<Unit>("mL");
  const [concentration, setConcentration] = useState<number | "">(0.1);

  const addChemical = useLabStore((s) => s.addChemical);
  const isLoading = useLabStore((s) => s.isLoading);
  const activeContainer = useLabStore((s) =>
    s.containers.find((c) => c.id === s.activeContainerId)
  );

  // Set intelligent defaults based on physical nature of the chemical
  useEffect(() => {
    if (pendingChemical) {
      const cls = pendingChemical.chemicalClass?.toLowerCase() || "";
      const formula = pendingChemical.formula?.toLowerCase() || "";
      // Metals / solids tend to be added in grams
      if (
        cls === "metal" ||
        ["fe", "cu", "zn", "mg", "al", "caco3"].includes(formula)
      ) {
        setUnit("g");
        setAmount(5);
      } else {
        setUnit("mL");
        setAmount(20);
        setConcentration(0.1);
      }
    }
  }, [pendingChemical]);

  const needsConcentration = VOLUME_UNITS.includes(unit);
  const containerName = activeContainer?.name ?? "Beaker";

  const handleAdd = async () => {
    if (!pendingChemical || amount === "" || amount <= 0) return;
    if (needsConcentration && (concentration === "" || concentration <= 0)) return;

    await addChemical(
      pendingChemical,
      amount,
      unit,
      needsConcentration ? (concentration as number) : undefined
    );
    onAdded();
  };

  if (!pendingChemical) {
    return (
      <div className="add-to-container add-to-container--empty">
        <div className="add-to-container__empty-text">
          <p className="add-to-container__empty-title">Ready to add chemicals</p>
          <p className="add-to-container__empty-desc">
            Search and select any chemical above to configure quantity and add it
            directly to your {containerName.toLowerCase()}.
          </p>
        </div>
        {activeContainer && activeContainer.contents.length > 0 && (
          <div className="add-to-container__vessel-status">
            <span>Current contents:</span>
            <strong>{activeContainer.contents.length} reactant(s)</strong> in {containerName}
          </div>
        )}
      </div>
    );
  }

  const volumePresets = [10, 20, 50, 100];
  const massPresets = [1, 5, 10, 25];
  const molePresets = [0.05, 0.1, 0.5, 1.0];
  const concPresets = [0.1, 0.5, 1.0, 2.0];

  const presets =
    unit === "g" || unit === "mg" || unit === "kg"
      ? massPresets
      : unit === "mol" || unit === "mmol"
      ? molePresets
      : volumePresets;

  return (
    <div className="add-to-container add-to-container--active">
      {/* Selected Chemical Header Card */}
      <div className="add-to-container__card">
        <div className="add-to-container__header">
          <div className="add-to-container__identity">
            <span
              className="add-to-container__swatch"
              style={{
                background: pendingChemical.substanceColor ?? "var(--paper-200)",
              }}
              aria-hidden="true"
            />
            <div className="add-to-container__titles">
              <span className="add-to-container__formula formula">
                {formatFormula(pendingChemical.formula)}
              </span>
              <span className="add-to-container__common-name">
                {pendingChemical.commonName}
              </span>
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              className="add-to-container__cancel-btn"
              onClick={onCancel}
              title="Deselect chemical"
              aria-label="Deselect chemical"
            >
              ✕
            </button>
          )}
        </div>

        <div className="add-to-container__meta-bar">
          <span>{pendingChemical.molarMass.toFixed(2)} g/mol</span>
          {pendingChemical.chemicalClass && (
            <>
              <span>&bull;</span>
              <span className="add-to-container__class-badge">
                {pendingChemical.chemicalClass.replace(/_/g, " ")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quantity & Unit Input Controls */}
      <div className="add-to-container__form">
        <div className="add-to-container__field-row">
          <label className="add-to-container__field">
            <span className="add-to-container__field-label">Amount</span>
            <input
              type="number"
              min={0}
              step="any"
              className="add-to-container__input"
              value={amount}
              placeholder="Amount"
              onChange={(e) =>
                setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))
              }
              autoFocus
            />
          </label>

          <div className="add-to-container__field add-to-container__field--unit">
            <span className="add-to-container__field-label">Unit</span>
            <div className="add-to-container__select-wrapper">
              <select
                className="add-to-container__select"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                aria-label="Unit of measurement"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Unit Switching Chips */}
        <div className="add-to-container__chips-row add-to-container__chips-row--units">
          <span className="add-to-container__chips-label">Unit:</span>
          {(["mL", "g", "mol", "L"] as Unit[]).map((u) => (
            <button
              key={u}
              type="button"
              className={`add-to-container__chip add-to-container__chip--unit ${
                unit === u ? "add-to-container__chip--active" : ""
              }`}
              onClick={() => setUnit(u)}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Quick Amount Chips */}
        <div className="add-to-container__chips-row">
          <span className="add-to-container__chips-label">Quick:</span>
          {presets.map((val) => (
            <button
              key={val}
              type="button"
              className={`add-to-container__chip ${
                amount === val ? "add-to-container__chip--active" : ""
              }`}
              onClick={() => setAmount(val)}
            >
              {val} {unit}
            </button>
          ))}
        </div>

        {/* Concentration Control (when volume is selected) */}
        {needsConcentration && (
          <div className="add-to-container__conc-section">
            <label className="add-to-container__field">
              <span className="add-to-container__field-label">
                Concentration (mol/L or M)
              </span>
              <input
                type="number"
                min={0}
                step="any"
                className="add-to-container__input"
                value={concentration}
                placeholder="Concentration"
                onChange={(e) =>
                  setConcentration(
                    e.target.value === "" ? "" : parseFloat(e.target.value)
                  )
                }
              />
            </label>
            <div className="add-to-container__chips-row">
              <span className="add-to-container__chips-label">Preset:</span>
              {concPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`add-to-container__chip ${
                    concentration === val ? "add-to-container__chip--active" : ""
                  }`}
                  onClick={() => setConcentration(val)}
                >
                  {val} M
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="add-to-container__submit-wrapper">
          <Button
            variant="primary"
            disabled={
              isLoading ||
              !activeContainer ||
              amount === "" ||
              amount <= 0 ||
              (needsConcentration && (concentration === "" || concentration <= 0))
            }
            onClick={handleAdd}
          >
            {isLoading ? "Adding…" : `Add to ${containerName}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
