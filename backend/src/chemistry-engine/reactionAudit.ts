import { parseFormula } from "./formulaParser.js";
import { estimateFormulaAndComposition } from "./molecularAnalysis.js";
import { balanceEquation, type BalancerSpecies } from "./balancer.js";
import type { ElementComposition, ResolvedSpecies } from "./types.js";
import { ELEMENT_SYMBOLS } from "./elementData.js";

export interface ReactionAuditReport {
  passed: boolean;
  isInertAlkanes: boolean;
  failureReason?: string;
  balancedEquation?: string;
  balancedReactants?: ResolvedSpecies[];
  balancedProducts?: ResolvedSpecies[];
}

/**
 * Normalizes formula casing (e.g. "c4h6" -> "C4H6", "c2h2" -> "C2H2", "mg" -> "Mg").
 */
export function normalizeFormulaCasing(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim().replace(/\s+/g, "");

  // If already standard mixed case e.g. "NaCl", "C4H6", leave as-is
  if (/[A-Z]/.test(clean)) {
    return clean;
  }

  // If entirely lowercase e.g. "c4h6", "c2h2", "c2h6", "c3h8"
  // Capitalize element symbols
  let result = "";
  let i = 0;
  while (i < clean.length) {
    const two = clean.slice(i, i + 2);
    const twoCandidate = two.charAt(0).toUpperCase() + two.charAt(1).toLowerCase();
    if (two.length === 2 && ELEMENT_SYMBOLS.has(twoCandidate)) {
      result += twoCandidate;
      i += 2;
    } else {
      const one = clean.charAt(i);
      const oneCandidate = one.toUpperCase();
      if (ELEMENT_SYMBOLS.has(oneCandidate)) {
        result += oneCandidate;
      } else {
        result += one;
      }
      i += 1;
    }
  }
  return result;
}

/**
 * Extracts element composition and charge for any species (formula, SMILES, or name).
 */
export function extractSpeciesComposition(species: {
  formula: string;
  chemicalId?: string;
  commonName?: string;
  charge?: number;
}): { composition: ElementComposition; charge: number; formula: string } {
  const normFormula = normalizeFormulaCasing(species.formula || species.chemicalId || "");

  try {
    const parsed = parseFormula(normFormula);
    if (Object.keys(parsed.composition).length > 0) {
      return { composition: parsed.composition, charge: parsed.charge ?? species.charge ?? 0, formula: normFormula };
    }
  } catch {
    // Formula parser could not parse e.g. if it is a complex SMILES or novel structure
  }

  // Fallback to SMILES estimate
  const smilesCandidate = species.formula || species.chemicalId || "";
  const est = estimateFormulaAndComposition(smilesCandidate);
  return {
    composition: est.composition,
    charge: species.charge ?? 0,
    formula: est.formula || normFormula || "Unknown",
  };
}

/**
 * Detects whether a species is a saturated alkane (C_n H_{2n+2} with n >= 1).
 */
export function isSaturatedAlkane(comp: ElementComposition): boolean {
  const elements = Object.keys(comp);
  if (elements.length !== 2) return false;
  const c = comp["C"] ?? 0;
  const h = comp["H"] ?? 0;
  if (c < 1) return false;
  return h === 2 * c + 2;
}

/**
 * Rigorously audits any proposed reaction against the fundamental principles of chemistry:
 * 1. Conservation of Mass & Elements (no alien elements in products, no vanished elements).
 * 2. Stoichiometric Atom Balance (must be balanceable by Gaussian elimination).
 * 3. Chemical Plausibility (detects inert mixtures such as unreactive alkanes under ambient conditions).
 * 4. Product Sanity (rejects empty products or impossible fragments).
 */
export function auditReactionChemistry(
  reactants: ResolvedSpecies[],
  products: ResolvedSpecies[]
): ReactionAuditReport {
  if (reactants.length === 0) {
    return { passed: false, isInertAlkanes: false, failureReason: "No reactants provided." };
  }
  if (products.length === 0) {
    return { passed: false, isInertAlkanes: false, failureReason: "No products provided." };
  }

  // 1. Extract compositions
  const rComps = reactants.map((r) => ({
    ...r,
    ...extractSpeciesComposition(r),
  }));

  const pComps = products.map((p) => ({
    ...p,
    ...extractSpeciesComposition(p),
  }));

  // Reject empty product formulas or placeholders
  for (const p of pComps) {
    if (!p.formula || p.formula === "[]" || p.formula === "Unknown" || Object.keys(p.composition).length === 0) {
      return {
        passed: false,
        isInertAlkanes: false,
        failureReason: `Invalid product structure or empty fragment detected: "${p.formula}".`,
      };
    }
  }

  // 2. Element Conservation Audit (Conservation of Mass)
  const rElements = new Set<string>();
  for (const r of rComps) {
    for (const el of Object.keys(r.composition)) {
      if ((r.composition[el] ?? 0) > 0) rElements.add(el);
    }
  }

  const pElements = new Set<string>();
  for (const p of pComps) {
    for (const el of Object.keys(p.composition)) {
      if ((p.composition[el] ?? 0) > 0) pElements.add(el);
    }
  }

  // Principle: Conservation of Mass. Every element in products MUST be present in reactants!
  const alienElements = [...pElements].filter((el) => !rElements.has(el));
  if (alienElements.length > 0) {
    return {
      passed: false,
      isInertAlkanes: false,
      failureReason: `Conservation of mass failed: Product contains element(s) [${alienElements.join(
        ", "
      )}], but no reactant supplies this element.`,
    };
  }

  // Principle: Conservation of Atoms. Every element in reactants MUST appear in products!
  const missingElements = [...rElements].filter((el) => !pElements.has(el));
  if (missingElements.length > 0) {
    return {
      passed: false,
      isInertAlkanes: false,
      failureReason: `Conservation of atoms failed: Reactant element(s) [${missingElements.join(
        ", "
      )}] completely vanished from products.`,
    };
  }

  // 3. Chemical Plausibility Audit: Saturated Alkanes (e.g. Ethane + Propane)
  // If all reactants are saturated alkanes and there is no oxidizer/halogen/catalyst present, they are chemically inert.
  const allReactantsAreAlkanes = rComps.every((r) => isSaturatedAlkane(r.composition));
  if (allReactantsAreAlkanes && rComps.length >= 2) {
    return {
      passed: false,
      isInertAlkanes: true,
      failureReason: "Saturated alkanes (paraffins) are chemically inert toward each other under ambient conditions.",
    };
  }

  // 4. Stoichiometric Atom Balance Audit (Gaussian linear algebra)
  try {
    const rBal: BalancerSpecies[] = rComps.map((r) => ({
      label: r.formula,
      formula: r.formula,
      composition: r.composition,
      charge: r.charge,
    }));
    const pBal: BalancerSpecies[] = pComps.map((p) => ({
      label: p.formula,
      formula: p.formula,
      composition: p.composition,
      charge: p.charge,
    }));

    const balanceRes = balanceEquation(rBal, pBal);

    const balancedReactants = reactants.map((r, i) => ({
      ...r,
      formula: rComps[i]?.formula || r.formula,
      coefficient: balanceRes.reactantCoefficients[i] || r.coefficient || 1,
    }));

    const balancedProducts = products.map((p, i) => ({
      ...p,
      formula: pComps[i]?.formula || p.formula,
      coefficient: balanceRes.productCoefficients[i] || p.coefficient || 1,
    }));

    return {
      passed: true,
      isInertAlkanes: false,
      balancedEquation: balanceRes.balancedEquationText,
      balancedReactants,
      balancedProducts,
    };
  } catch (err: any) {
    return {
      passed: false,
      isInertAlkanes: false,
      failureReason: `Atom balance failed: Equation cannot be balanced (${err.message}).`,
    };
  }
}

/**
 * Checks if a set of reactants is an inert mixture of saturated alkanes (e.g. C2H6 + C3H8).
 * If so, returns a scientifically grounded NO_REACTION resolution.
 */
export function checkInertAlkaneMixture(
  reactants: Array<{ formula: string; chemicalId?: string; commonName?: string; coefficient?: number }>
): import("./types.js").ReactionResolution | null {
  if (reactants.length < 2) return null;
  const comps = reactants.map((r) => extractSpeciesComposition(r));
  const allAlkanes = comps.every((c) => isSaturatedAlkane(c.composition));
  if (!allAlkanes) return null;

  const resolvedReactants: ResolvedSpecies[] = reactants.map((r, i) => {
    const comp = comps[i];
    const form = comp?.formula || r.formula;
    return {
      chemicalId: r.chemicalId || form.toLowerCase(),
      formula: form,
      commonName: r.commonName || form,
      coefficient: 1,
      isRegistered: true,
    };
  });

  const equation = `${resolvedReactants.map((r) => r.formula).join(" + ")} -> No Reaction`;
  return {
    status: "NO_REACTION",
    confidenceTier: "SUPPORTED",
    confidenceScore: 0.99,
    balancedEquation: equation,
    reactants: resolvedReactants,
    products: [],
    observableEffects: [],
    energyClassification: "unknown",
    enthalpyKjPerMol: 0,
    explanation:
      "Saturated alkanes (paraffins) possess strong, nonpolar C–C and C–H σ-bonds and lack reactive functional groups or π-bonds. They do not react with each other under standard ambient conditions.",
    ruleApplied: "inert_alkane_mixture",
    safetyNotes: "Alkanes are flammable hydrocarbon gases or liquids. Handle away from open flames or ignition sources.",
    warnings: [
      "Ethane and propane (and saturated alkanes in general) do not react with each other under standard ambient conditions.",
    ],
  };
}

