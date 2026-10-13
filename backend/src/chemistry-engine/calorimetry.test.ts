import { describe, it, expect } from "vitest";
import { computeCalorimetry } from "./calorimetry.js";

describe("computeCalorimetry", () => {
  it("calculates temperature decrease for endothermic potassium nitrate dissolution", () => {
    // 10 g KNO3 (molar mass ~101.1 g/mol) in 100 mL water
    // extent = 10 / 101.1 ~ 0.0989 mol
    // ΔH_soln = +34.89 kJ/mol
    // totalMass = 10 + 100 = 110 g
    // C = 110 * 4.184 = 460.24 J/°C
    // q_rxn = 0.0989 * 34890 = 3450.6 J
    // ΔT = -3450.6 / 460.24 = -7.5 °C
    const result = computeCalorimetry({
      inputs: [
        { chemicalId: "kno3", amount: 10, unit: "g" },
        { chemicalId: "water", amount: 100, unit: "mL" },
      ],
      extentMoles: 0.0989,
      enthalpyKjPerMol: 34.89,
      initialTemperatureC: 25.0,
    });

    expect(result.temperatureDeltaC).toBeLessThan(0);
    expect(result.temperatureDeltaC).toBeCloseTo(-7.5, 0.5);
    expect(result.finalTemperatureC).toBeCloseTo(17.5, 0.5);
    expect(result.summaryText).toContain("Decreased by");
    expect(result.summaryText).toContain("from 25.0 °C to");
  });

  it("calculates temperature increase for exothermic neutralization", () => {
    // 25 mL of 1 M HCl (0.025 mol) + 25 mL of 1 M NaOH (0.025 mol)
    // ΔH = -57.1 kJ/mol
    // totalMass = 50 g
    // C = 50 * 4.184 = 209.2 J/°C
    // q_rxn = 0.025 * (-57100) = -1427.5 J
    // q_soln = +1427.5 J
    // ΔT = +1427.5 / 209.2 ~ +6.8 °C
    const result = computeCalorimetry({
      inputs: [
        { chemicalId: "hcl", amount: 25, unit: "mL" },
        { chemicalId: "naoh", amount: 25, unit: "mL" },
      ],
      extentMoles: 0.025,
      enthalpyKjPerMol: -57.1,
      initialTemperatureC: 25.0,
    });

    expect(result.temperatureDeltaC).toBeGreaterThan(0);
    expect(result.temperatureDeltaC).toBeCloseTo(6.8, 0.5);
    expect(result.finalTemperatureC).toBeCloseTo(31.8, 0.5);
    expect(result.summaryText).toContain("Increased by");
  });

  it("handles solid solute when solvent volume is implicit", () => {
    // 5 g KNO3 without explicit water amount (uses default 50 g solvent)
    const result = computeCalorimetry({
      inputs: [{ chemicalId: "kno3", amount: 5, unit: "g" }],
      extentMoles: 0.0494,
      enthalpyKjPerMol: 34.89,
      initialTemperatureC: 22.0,
    });

    expect(result.temperatureDeltaC).toBeLessThan(0);
    expect(result.finalTemperatureC).toBeLessThan(22.0);
    expect(result.summaryText).toContain("Decreased by");
  });

  it("scales final temperature proportionally when increasing reactant/product quantity (2x scale)", () => {
    // 50 mL of 1 M HCl (0.050 mol) + 50 mL of 1 M NaOH (0.050 mol)
    // Doubles extent of product formation (0.050 mol vs 0.025 mol)
    // q_rxn = 0.050 * (-57100) = -2855 J => q_soln = +2855 J
    // In bench vessel (209.2 J/°C), ΔT = +2855 / 209.2 ~ +13.6 °C
    // Final temperature rises from 25.0 °C to ~38.6 °C
    const result = computeCalorimetry({
      inputs: [
        { chemicalId: "hcl", amount: 50, unit: "mL" },
        { chemicalId: "naoh", amount: 50, unit: "mL" },
      ],
      extentMoles: 0.050,
      enthalpyKjPerMol: -57.1,
      initialTemperatureC: 25.0,
    });

    expect(result.temperatureDeltaC).toBeGreaterThan(0);
    expect(result.temperatureDeltaC).toBeCloseTo(13.6, 0.5);
    expect(result.finalTemperatureC).toBeCloseTo(38.6, 0.5);
  });

  it("scales final temperature proportionally when decreasing reactant/product quantity (0.5x scale)", () => {
    // 12.5 mL of 1 M HCl (0.0125 mol) + 12.5 mL of 1 M NaOH (0.0125 mol)
    // Halves extent of product formation (0.0125 mol vs 0.025 mol)
    // q_rxn = 0.0125 * (-57100) = -713.8 J => q_soln = +713.8 J
    // In bench vessel (209.2 J/°C), ΔT = +713.8 / 209.2 ~ +3.4 °C
    // Final temperature rises mildly from 25.0 °C to ~28.4 °C
    const result = computeCalorimetry({
      inputs: [
        { chemicalId: "hcl", amount: 12.5, unit: "mL" },
        { chemicalId: "naoh", amount: 12.5, unit: "mL" },
      ],
      extentMoles: 0.0125,
      enthalpyKjPerMol: -57.1,
      initialTemperatureC: 25.0,
    });

    expect(result.temperatureDeltaC).toBeGreaterThan(0);
    expect(result.temperatureDeltaC).toBeCloseTo(3.4, 0.5);
    expect(result.finalTemperatureC).toBeCloseTo(28.4, 0.5);
  });

  it("deepens temperature drop when increasing dissolved solute quantity", () => {
    // 20 g KNO3 in 100 mL water (doubled solute quantity)
    // extent = 20 / 101.1 ~ 0.1978 mol
    // totalMass = 20 + 100 = 120 g
    // C = 120 * 4.184 = 502.08 J/°C
    // q_rxn = 0.1978 * 34890 = 6901.2 J
    // ΔT = -6901.2 / 502.08 ~ -13.7 °C
    // Final temperature drops to ~11.3 °C (deeper cooling than standard 10g at 17.5 °C)
    const result = computeCalorimetry({
      inputs: [
        { chemicalId: "kno3", amount: 20, unit: "g" },
        { chemicalId: "water", amount: 100, unit: "mL" },
      ],
      extentMoles: 0.1978,
      enthalpyKjPerMol: 34.89,
      initialTemperatureC: 25.0,
    });

    expect(result.temperatureDeltaC).toBeLessThan(0);
    expect(result.temperatureDeltaC).toBeCloseTo(-13.7, 0.5);
    expect(result.finalTemperatureC).toBeCloseTo(11.3, 0.5);
  });
});
