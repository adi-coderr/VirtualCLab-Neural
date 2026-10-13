import { ChemistryEngineError } from "./types.js";
import type { ReactionInputSpecies } from "./types.js";

/**
 * Deliberate scope limit: this engine converts mass <-> moles (via molar
 * mass) and solution volume + molar concentration <-> moles. It does NOT
 * convert a bare gas volume to moles via the ideal gas law, because doing
 * that correctly requires temperature and pressure to be pinned down
 * precisely and it is easy to silently imply more precision than the model
 * actually has. If you need gas-volume dosing, convert to moles yourself
 * using PV = nRT for your specific conditions, or provide mass/moles directly.
 */

export function normalizeUnit(rawUnit: string): "g" | "kg" | "mg" | "mL" | "L" | "mol" | "mmol" {
  const u = (rawUnit || "").trim();
  const lower = u.toLowerCase();
  if (lower === "ml") return "mL";
  if (lower === "l") return "L";
  if (lower === "g") return "g";
  if (lower === "kg") return "kg";
  if (lower === "mg") return "mg";
  if (lower === "mol") return "mol";
  if (lower === "mmol") return "mmol";
  return u as any;
}

export function massToGrams(amount: number, unit: string): number {
  const norm = normalizeUnit(unit);
  switch (norm) {
    case "g":
      return amount;
    case "kg":
      return amount * 1000;
    case "mg":
      return amount / 1000;
    default:
      return amount;
  }
}

export function molesFromUnit(amount: number, unit: string): number {
  const norm = normalizeUnit(unit);
  return norm === "mol" ? amount : amount / 1000;
}

export function volumeToLiters(amount: number, unit: string): number {
  const norm = normalizeUnit(unit);
  return norm === "L" ? amount : amount / 1000;
}

export interface MolesResult {
  moles: number;
  massGrams?: number;
}

/** Resolves the number of moles supplied by a reaction input, given the chemical's molar mass. */
export function toMoles(input: ReactionInputSpecies, molarMass: number): MolesResult {
  const { amount } = input;
  const unit = normalizeUnit(input.unit);
  if (amount <= 0) {
    throw new ChemistryEngineError(`Amount must be a positive number (got ${amount}).`, "INVALID_AMOUNT", {
      amount,
    });
  }

  if (unit === "g" || unit === "kg" || unit === "mg") {
    const grams = massToGrams(amount, unit);
    return { moles: grams / molarMass, massGrams: grams };
  }

  if (unit === "mol" || unit === "mmol") {
    const moles = molesFromUnit(amount, unit);
    return { moles, massGrams: moles * molarMass };
  }

  if (unit === "mL" || unit === "L") {
    if (input.concentrationMolar === undefined) {
      if (input.chemicalId === "water") {
        const liters = volumeToLiters(amount, unit);
        const massGrams = liters * 1000;
        return { moles: massGrams / molarMass, massGrams };
      }
      throw new ChemistryEngineError(
        `A volume ("${amount} ${unit}") was given without a concentration. Provide concentrationMolar ` +
          `(mol/L) for a solution, or specify the amount as mass or moles instead.`,
        "MISSING_CONCENTRATION",
        { amount, unit }
      );
    }
    if (input.concentrationMolar <= 0) {
      throw new ChemistryEngineError("concentrationMolar must be a positive number.", "INVALID_CONCENTRATION");
    }
    const liters = volumeToLiters(amount, unit);
    const moles = liters * input.concentrationMolar;
    return { moles, massGrams: moles * molarMass };
  }

  throw new ChemistryEngineError(`Unsupported unit "${unit}".`, "UNSUPPORTED_UNIT", { unit });
}
