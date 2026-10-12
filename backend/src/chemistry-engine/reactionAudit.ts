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

export const COMMON_STOICHIOMETRIC_BYPRODUCTS: Array<{
  chemicalId: string;
  formula: string;
  commonName: string;
  composition: ElementComposition;
  charge: number;
}> = [
  { chemicalId: "water", formula: "H2O", commonName: "Water", composition: { H: 2, O: 1 }, charge: 0 },
  { chemicalId: "hcl", formula: "HCl", commonName: "Hydrochloric acid", composition: { H: 1, Cl: 1 }, charge: 0 },
  { chemicalId: "hbr", formula: "HBr", commonName: "Hydrobromic acid", composition: { H: 1, Br: 1 }, charge: 0 },
  { chemicalId: "hi", formula: "HI", commonName: "Hydroiodic acid", composition: { H: 1, I: 1 }, charge: 0 },
  { chemicalId: "hf", formula: "HF", commonName: "Hydrofluoric acid", composition: { H: 1, F: 1 }, charge: 0 },
  { chemicalId: "nacl", formula: "NaCl", commonName: "Sodium chloride", composition: { Na: 1, Cl: 1 }, charge: 0 },
  { chemicalId: "kcl", formula: "KCl", commonName: "Potassium chloride", composition: { K: 1, Cl: 1 }, charge: 0 },
  { chemicalId: "nabr", formula: "NaBr", commonName: "Sodium bromide", composition: { Na: 1, Br: 1 }, charge: 0 },
  { chemicalId: "kbr", formula: "KBr", commonName: "Potassium bromide", composition: { K: 1, Br: 1 }, charge: 0 },
  { chemicalId: "nai", formula: "NaI", commonName: "Sodium iodide", composition: { Na: 1, I: 1 }, charge: 0 },
  { chemicalId: "ki", formula: "KI", commonName: "Potassium iodide", composition: { K: 1, I: 1 }, charge: 0 },
  { chemicalId: "co2", formula: "CO2", commonName: "Carbon dioxide", composition: { C: 1, O: 2 }, charge: 0 },
  { chemicalId: "co", formula: "CO", commonName: "Carbon monoxide", composition: { C: 1, O: 1 }, charge: 0 },
  { chemicalId: "h2", formula: "H2", commonName: "Hydrogen gas", composition: { H: 2 }, charge: 0 },
  { chemicalId: "nh3", formula: "NH3", commonName: "Ammonia", composition: { N: 1, H: 3 }, charge: 0 },
  { chemicalId: "khco3", formula: "KHCO3", commonName: "Potassium bicarbonate", composition: { K: 1, H: 1, C: 1, O: 3 }, charge: 0 },
  { chemicalId: "nahco3", formula: "NaHCO3", commonName: "Sodium bicarbonate", composition: { Na: 1, H: 1, C: 1, O: 3 }, charge: 0 },
  { chemicalId: "methanol", formula: "CH3OH", commonName: "Methanol", composition: { C: 1, H: 4, O: 1 }, charge: 0 },
  { chemicalId: "ethanol", formula: "C2H5OH", commonName: "Ethanol", composition: { C: 2, H: 6, O: 1 }, charge: 0 },
  { chemicalId: "acetic_acid", formula: "CH3COOH", commonName: "Acetic acid", composition: { C: 2, H: 4, O: 2 }, charge: 0 },
];

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

  // 3. Chemical Plausibility Audit: Saturated Alkanes (e.g. Ethane + Propane)
  const allReactantsAreAlkanes = rComps.every((r) => isSaturatedAlkane(r.composition));
  if (allReactantsAreAlkanes && rComps.length >= 2) {
    return {
      passed: false,
      isInertAlkanes: true,
      failureReason: "Saturated alkanes (paraffins) are chemically inert toward each other under ambient conditions.",
    };
  }

  // 4. Stoichiometric Atom Balance Audit (Gaussian linear algebra)
  const missingElements = [...rElements].filter((el) => !pElements.has(el));

  // First attempt: direct balance if all reactant elements are present in candidate products
  if (missingElements.length === 0) {
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
    } catch {
      // Direct balance failed, attempt byproduct inference below
    }
  }

  // Second attempt: Infer standard stoichiometric byproducts (single byproducts)
  // Candidate byproducts must only contain elements present in reactants
  const compatibleByproducts = COMMON_STOICHIOMETRIC_BYPRODUCTS.filter((bp) =>
    Object.keys(bp.composition).every((el) => rElements.has(el))
  );

  for (const bp of compatibleByproducts) {
    const bpElements = Object.keys(bp.composition);
    if (missingElements.length > 0 && !missingElements.every((el) => bpElements.includes(el))) {
      continue;
    }

    try {
      const rBal: BalancerSpecies[] = rComps.map((r) => ({
        label: r.formula,
        formula: r.formula,
        composition: r.composition,
        charge: r.charge,
      }));
      const bpSpecies: BalancerSpecies = {
        label: bp.formula,
        formula: bp.formula,
        composition: bp.composition,
        charge: bp.charge,
      };
      const pBal: BalancerSpecies[] = [
        ...pComps.map((p) => ({
          label: p.formula,
          formula: p.formula,
          composition: p.composition,
          charge: p.charge,
        })),
        bpSpecies,
      ];

      const balanceRes = balanceEquation(rBal, pBal);

      const balancedReactants = reactants.map((r, i) => ({
        ...r,
        formula: rComps[i]?.formula || r.formula,
        coefficient: balanceRes.reactantCoefficients[i] || r.coefficient || 1,
      }));

      const balancedProducts: ResolvedSpecies[] = [
        ...products.map((p, i) => ({
          ...p,
          formula: pComps[i]?.formula || p.formula,
          coefficient: balanceRes.productCoefficients[i] || p.coefficient || 1,
        })),
        {
          chemicalId: bp.chemicalId,
          formula: bp.formula,
          commonName: bp.commonName,
          coefficient: balanceRes.productCoefficients[products.length] || 1,
          isRegistered: true,
        },
      ];

      return {
        passed: true,
        isInertAlkanes: false,
        balancedEquation: balanceRes.balancedEquationText,
        balancedReactants,
        balancedProducts,
      };
    } catch {
      // Byproduct did not balance, continue
    }
  }

  // Third attempt: Infer byproduct pairs (e.g. KBr + KHCO3, NaCl + H2O, KBr + H2O, NaCl + NaHCO3, H2O + CO2)
  for (let i = 0; i < compatibleByproducts.length; i++) {
    for (let j = i + 1; j < compatibleByproducts.length; j++) {
      const bp1 = compatibleByproducts[i]!;
      const bp2 = compatibleByproducts[j]!;
      const combinedElements = new Set([...Object.keys(bp1.composition), ...Object.keys(bp2.composition)]);

      if (missingElements.length > 0 && !missingElements.every((el) => combinedElements.has(el))) {
        continue;
      }

      try {
        const rBal: BalancerSpecies[] = rComps.map((r) => ({
          label: r.formula,
          formula: r.formula,
          composition: r.composition,
          charge: r.charge,
        }));
        const pBal: BalancerSpecies[] = [
          ...pComps.map((p) => ({
            label: p.formula,
            formula: p.formula,
            composition: p.composition,
            charge: p.charge,
          })),
          { label: bp1.formula, formula: bp1.formula, composition: bp1.composition, charge: bp1.charge },
          { label: bp2.formula, formula: bp2.formula, composition: bp2.composition, charge: bp2.charge },
        ];

        const balanceRes = balanceEquation(rBal, pBal);

        const balancedReactants = reactants.map((r, idx) => ({
          ...r,
          formula: rComps[idx]?.formula || r.formula,
          coefficient: balanceRes.reactantCoefficients[idx] || r.coefficient || 1,
        }));

        const balancedProducts: ResolvedSpecies[] = [
          ...products.map((p, idx) => ({
            ...p,
            formula: pComps[idx]?.formula || p.formula,
            coefficient: balanceRes.productCoefficients[idx] || p.coefficient || 1,
          })),
          {
            chemicalId: bp1.chemicalId,
            formula: bp1.formula,
            commonName: bp1.commonName,
            coefficient: balanceRes.productCoefficients[products.length] || 1,
            isRegistered: true,
          },
          {
            chemicalId: bp2.chemicalId,
            formula: bp2.formula,
            commonName: bp2.commonName,
            coefficient: balanceRes.productCoefficients[products.length + 1] || 1,
            isRegistered: true,
          },
        ];

        return {
          passed: true,
          isInertAlkanes: false,
          balancedEquation: balanceRes.balancedEquationText,
          balancedReactants,
          balancedProducts,
        };
      } catch {
        // Pair did not balance
      }
    }
  }

  // If all attempts failed, report actionable violation
  if (missingElements.length > 0) {
    return {
      passed: false,
      isInertAlkanes: false,
      failureReason: `Conservation of atoms failed: Reactant element(s) [${missingElements.join(
        ", "
      )}] completely vanished from products.`,
    };
  }

  return {
    passed: false,
    isInertAlkanes: false,
    failureReason: "Atom balance failed: Equation cannot be balanced even with byproduct inference.",
  };
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

