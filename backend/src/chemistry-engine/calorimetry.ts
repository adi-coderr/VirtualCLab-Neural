import type { ReactionInputSpecies, CalorimetryResult } from "./types.js";

export type { CalorimetryResult };

export interface CalorimetryOptions {
  inputs: ReactionInputSpecies[];
  extentMoles: number;
  enthalpyKjPerMol: number;
  initialTemperatureC?: number;
  molarMassLookup?: (chemicalId: string) => number | undefined;
}

const SPECIFIC_HEAT_AQUEOUS_J_PER_G_C = 4.184;
const DEFAULT_SOLVENT_MASS_GRAMS = 50.0; // Standard bench scale reference working volume (50 mL water)
const BENCH_HEAT_CAPACITY_J_PER_C = DEFAULT_SOLVENT_MASS_GRAMS * SPECIFIC_HEAT_AQUEOUS_J_PER_G_C; // ~209.2 J/°C

export function computeCalorimetry(options: CalorimetryOptions): CalorimetryResult {
  const { inputs, extentMoles, enthalpyKjPerMol, initialTemperatureC = 25.0, molarMassLookup } = options;

  let totalMassGrams = 0;
  let explicitSolventMassGrams = 0;
  let soluteOrReactantMassGrams = 0;
  let hasExplicitSolvent = false;

  for (const input of inputs) {
    const unit = (input.unit || "").toLowerCase();
    const chemIdLower = (input.chemicalId || "").toLowerCase();
    const formulaUpper = (input.formula || "").toUpperCase();
    const isExplicitWater =
      chemIdLower === "water" ||
      chemIdLower === "h2o" ||
      formulaUpper === "H2O";

    let mass = 0;
    switch (unit) {
      case "g":
        mass = input.amount;
        break;
      case "kg":
        mass = input.amount * 1000;
        break;
      case "mg":
        mass = input.amount / 1000;
        break;
      case "ml":
        // Assume density ~ 1.0 g/mL for aqueous solutions/liquids
        mass = input.amount * 1.0;
        break;
      case "l":
        mass = input.amount * 1000;
        break;
      case "mol":
      case "mmol": {
        const molarMass = molarMassLookup?.(input.chemicalId) ?? 50;
        const moles = unit === "mol" ? input.amount : input.amount / 1000;
        mass = moles * molarMass;
        break;
      }
      default:
        mass = input.amount;
    }

    if (isExplicitWater) {
      hasExplicitSolvent = true;
      explicitSolventMassGrams += mass;
    } else {
      soluteOrReactantMassGrams += mass;
    }
    totalMassGrams += mass;
  }

  // If only a solid solute was provided without solvent amount, assume default aqueous solvent
  const totalMixtureMassGrams =
    hasExplicitSolvent || totalMassGrams >= 5.0
      ? totalMassGrams
      : totalMassGrams + DEFAULT_SOLVENT_MASS_GRAMS;

  // Thermal capacity calculation:
  // In bench laboratory calorimetry, reactions take place in a standard glassware vessel
  // with a baseline working thermal mass (50 mL water equivalent, ~209.2 J/°C).
  //
  // - If explicit bulk solvent >= 100 mL was specified along with a solid solute (e.g. 10g KNO3 in 100 mL water),
  //   the thermal capacity is anchored to that specific solvent + solute system.
  // - Otherwise, for bench solutions, gases, and vessel reactions, the effective heat capacity is anchored
  //   to the container bench baseline (209.2 J/°C) plus any excess non-reacting solvent.
  //
  // This decoupling prevents the self-dilution artifact where scaling reactant/product quantities (numerator)
  // simultaneously scaled total mass (denominator), causing ΔT and final temperature to freeze unchanged.
  let heatCapacityJPerC: number;

  const hasSolidSolute = inputs.some((inp) => {
    const u = (inp.unit || "").toLowerCase();
    const isWater =
      (inp.chemicalId || "").toLowerCase() === "water" ||
      (inp.chemicalId || "").toLowerCase() === "h2o" ||
      (inp.formula || "").toUpperCase() === "H2O";
    return !isWater && (u === "g" || u === "mg" || u === "kg");
  });

  if (hasSolidSolute && hasExplicitSolvent && explicitSolventMassGrams >= 100.0) {
    // Explicit bulk solvent container (e.g. 10g KNO3 dissolved in 100 mL water)
    const systemMass = explicitSolventMassGrams + soluteOrReactantMassGrams;
    heatCapacityJPerC = Math.max(BENCH_HEAT_CAPACITY_J_PER_C, systemMass * SPECIFIC_HEAT_AQUEOUS_J_PER_G_C);
  } else {
    // Standard bench vessel baseline (209.2 J/°C), plus any excess non-reacting solvent beyond standard volume
    const excessSolventMass = Math.max(0, explicitSolventMassGrams - 100.0);
    heatCapacityJPerC = BENCH_HEAT_CAPACITY_J_PER_C + excessSolventMass * SPECIFIC_HEAT_AQUEOUS_J_PER_G_C;
  }

  // q_rxn = n * ΔH (kJ -> J)
  const heatJoules = extentMoles * enthalpyKjPerMol * 1000;
  // q_solution = - q_rxn
  const solutionHeatJoules = -heatJoules;

  // ΔT = q_solution / C
  const rawDeltaT = solutionHeatJoules / heatCapacityJPerC;
  const rawFinalT = initialTemperatureC + rawDeltaT;

  // Bound to physical liquid range for aqueous experiments (-5 °C to 100 °C) only when water is explicitly present
  const isAqueousSystem = hasExplicitSolvent
    ? inputs.some((inp) => {
        const id = (inp.chemicalId || "").toLowerCase();
        const f = (inp.formula || "").toUpperCase();
        return id === "water" || id === "h2o" || f === "H2O";
      })
    : false;

  const clampedFinalT =
    isAqueousSystem && initialTemperatureC <= 100.0
      ? Math.min(100.0, Math.max(-5.0, rawFinalT))
      : Math.max(-273.15, rawFinalT);
  const effectiveDeltaT = clampedFinalT - initialTemperatureC;

  const initialRound = Math.round(initialTemperatureC * 10) / 10;
  const finalRound = Math.round(clampedFinalT * 10) / 10;
  const deltaRound = Math.round(effectiveDeltaT * 10) / 10;

  let summaryText = "";
  if (deltaRound < 0) {
    summaryText = `Decreased by ${Math.abs(deltaRound).toFixed(1)} °C (from ${initialRound.toFixed(1)} °C to ${finalRound.toFixed(1)} °C)`;
  } else if (deltaRound > 0) {
    summaryText = `Increased by ${deltaRound.toFixed(1)} °C (from ${initialRound.toFixed(1)} °C to ${finalRound.toFixed(1)} °C)`;
  } else {
    summaryText = `No significant temperature change (remains at ${initialRound.toFixed(1)} °C)`;
  }

  return {
    enthalpyKjPerMol,
    extentMoles,
    heatJoules,
    solutionHeatJoules,
    initialTemperatureC: initialRound,
    finalTemperatureC: finalRound,
    temperatureDeltaC: deltaRound,
    totalMassGrams: Math.round(totalMixtureMassGrams * 10) / 10,
    heatCapacityJPerC: Math.round(heatCapacityJPerC * 10) / 10,
    summaryText,
  };
}
