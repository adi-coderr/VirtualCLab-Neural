import type { ChemicalRepository } from "../data/repositories/chemicalRepository.js";
import { computeMolarMass } from "./molarMass.js";
import { parseFormula } from "./formulaParser.js";
import type { ElementComposition } from "./types.js";

export interface ProductChemicalProfile {
  smiles: string;
  name: string;
  formula: string;
  molarMass: number;
  physicalState: "solid" | "liquid" | "gas" | "aqueous";
  appearance: string;
  chemicalClass: string;
  functionalGroups: string[];
  safetyNotes?: string;
}

export interface ReactionAnalysisReport {
  reactionType: string;
  mechanismCategory: string;
  products: ProductChemicalProfile[];
  theoreticalAtomEconomyPercent: number;
  expectedByproducts: string[];
  observationsSummary: string;
}

/**
 * Strips atom mapping numbers (e.g., [CH3:1] -> [CH3] or C) and CXSMILES annotations (e.g., |f:0.1|).
 */
export function normalizeSmiles(rawSmiles: string): string {
  if (!rawSmiles) return "";
  let s = rawSmiles.trim();
  // Remove CXSMILES pipe annotations: |...|
  s = s.replace(/\|[^|]*\|/g, "").trim();
  // Remove atom-mapping digits like :1, :24 in [C:1], [O:35]
  s = s.replace(/:([0-9]+)\]/g, "]");
  // Clean whitespace
  s = s.replace(/\s+/g, "");
  return s;
}

/**
 * Parses functional groups present in a molecular SMILES string.
 */
export function detectFunctionalGroups(smiles: string): string[] {
  const groups: string[] = [];
  const s = normalizeSmiles(smiles);

  if (/C\(=O\)O[CH0-9A-Za-z]/i.test(s) || /C\(=O\)O[C]/i.test(s)) {
    groups.push("Ester (-COO-)");
  } else if (/C\(=O\)O|C\(=O\)\[OH\]|C\(=O\)\[O-\]/i.test(s)) {
    groups.push("Carboxylic Acid (-COOH)");
  }

  if (/C\(=O\)N/i.test(s)) {
    groups.push("Amide (-CONH-)");
  }

  if (/[c]1[c][c][c][c][c]1|[c]1[n][c][c][n]1/i.test(s) || (s.match(/[c]/g) || []).length >= 5) {
    groups.push("Aromatic Ring (Arene)");
  }

  if (/C\(=O\)C|C\(=O\)H/i.test(s) && !groups.includes("Ester (-COO-)") && !groups.includes("Carboxylic Acid (-COOH)")) {
    if (/C\(=O\)H/i.test(s)) {
      groups.push("Aldehyde (-CHO)");
    } else {
      groups.push("Ketone (C=O)");
    }
  }

  if (/[CH0-9]O[CH0-9]/i.test(s) && !groups.includes("Ester (-COO-)")) {
    groups.push("Ether (-O-)");
  }

  if (/[C]O|CCO|CO|\[OH\]/i.test(s) && !groups.includes("Carboxylic Acid (-COOH)")) {
    groups.push("Alcohol (-OH)");
  }

  const sNoMetals = s.replace(/\[?Na\+?\]?/gi, "").replace(/\[?Ni\+?\]?/gi, "");
  if (/[Nn]/.test(sNoMetals) && !groups.includes("Amide (-CONH-)")) {
    if (/N#N/i.test(s)) {
      groups.push("Azo / Diazo (-N=N-)");
    } else if (/\[N\+\]\(=O\)\[O-\]|NO2/i.test(s)) {
      groups.push("Nitro Group (-NO2)");
    } else {
      groups.push("Amine (-NH2 / -NR2)");
    }
  }

  if (/\[Na\+\]|\[K\+\]|\[Li\+\]|\[Ca2\+\]|\[Mg2\+\]|\[Cl-\]|\[Br-\]|\[OH-\]|\[SO4-2\]/i.test(s)) {
    groups.push("Ionic Salt / Counterion");
  }

  if (/Cl/i.test(s) && !/\[Cl-\]/i.test(s)) groups.push("Organochloride (-Cl)");
  if (/Br/i.test(s) && !/\[Br-\]/i.test(s)) groups.push("Organobromide (-Br)");
  if (/F/i.test(s)) groups.push("Fluoroalkyl (-F / -CF3)");

  return groups.length > 0 ? Array.from(new Set(groups)) : ["Hydrocarbon / Aliphatic"];
}

/**
 * Estimates element composition and Hill formula from a SMILES string when not present in curated database.
 */
export function estimateFormulaAndComposition(smiles: string): { formula: string; composition: ElementComposition } {
  const norm = normalizeSmiles(smiles);
  const comp: ElementComposition = {};

  // Extract bracketed atoms e.g. [Na+], [OH-], [CH2]
  const bracketMatches = norm.match(/\[([A-Z][a-z]?)([^\]]*)\]/g) || [];
  let working = norm;

  for (const bm of bracketMatches) {
    const elMatch = bm.match(/\[([A-Z][a-z]?)/);
    if (elMatch && elMatch[1]) {
      const el = elMatch[1];
      comp[el] = (comp[el] || 0) + 1;
      const hMatch = bm.match(/H([0-9]*)/);
      if (hMatch) {
        const hCount = hMatch[1] ? parseInt(hMatch[1], 10) : 1;
        comp["H"] = (comp["H"] || 0) + hCount;
      }
    }
    working = working.replace(bm, " ");
  }

  // Count unbracketed elements in organic SMILES: C, c, N, n, O, o, S, s, P, F, Cl, Br, I
  const tokenRegex = /Cl|Br|[A-Z][a-z]?|[a-z]/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(working)) !== null) {
    const tok = match[0];
    if (tok === "Cl") comp["Cl"] = (comp["Cl"] || 0) + 1;
    else if (tok === "Br") comp["Br"] = (comp["Br"] || 0) + 1;
    else if (tok === "C" || tok === "c") comp["C"] = (comp["C"] || 0) + 1;
    else if (tok === "N" || tok === "n") comp["N"] = (comp["N"] || 0) + 1;
    else if (tok === "O" || tok === "o") comp["O"] = (comp["O"] || 0) + 1;
    else if (tok === "S" || tok === "s") comp["S"] = (comp["S"] || 0) + 1;
    else if (tok === "P") comp["P"] = (comp["P"] || 0) + 1;
    else if (tok === "F") comp["F"] = (comp["F"] || 0) + 1;
    else if (tok === "I") comp["I"] = (comp["I"] || 0) + 1;
  }

  // Estimate implicit hydrogens if none or few were counted for organic carbons
  const carbonCount = comp["C"] || 0;
  if (carbonCount > 0 && (!comp["H"] || comp["H"] < carbonCount)) {
    // Standard approximation: alkane 2n+2, aromatic subtract 1 per double bond/ring
    const estimatedH = Math.max(1, Math.round(carbonCount * 2 + 2 - (comp["N"] || 0)));
    comp["H"] = (comp["H"] || 0) + estimatedH;
  }

  // Format in Hill order: C first, H second, followed by others alphabetically
  const elements = Object.keys(comp).sort((a, b) => {
    if (a === "C") return -1;
    if (b === "C") return 1;
    if (a === "H") return -1;
    if (b === "H") return 1;
    return a.localeCompare(b);
  });

  let formula = "";
  for (const el of elements) {
    const count = comp[el]!;
    formula += count > 1 ? `${el}${count}` : el;
  }

  return { formula: formula || "Compound", composition: comp };
}

/**
 * Resolves or synthesizes a rich Chemical Profile for any product SMILES.
 */
export function analyzeProduct(
  rawSmiles: string,
  chemicalRepo?: ChemicalRepository
): ProductChemicalProfile {
  const clean = normalizeSmiles(rawSmiles);

  // 1. Check curated database match
  if (chemicalRepo) {
    const summary = chemicalRepo.search(clean, 1, 0).items[0];
    if (summary) {
      const match = chemicalRepo.getById(summary.id);
      if (match && match.smiles && normalizeSmiles(match.smiles) === clean) {
        return {
          smiles: clean,
          name: match.commonName,
          formula: match.formula,
          molarMass: match.molarMass,
          physicalState: (match.physicalState as any) || "liquid",
          appearance: match.substanceColor || (match.physicalState === "solid" ? "White crystalline solid" : "Colorless liquid"),
          chemicalClass: match.chemicalClass || "organic",
          functionalGroups: detectFunctionalGroups(clean),
          safetyNotes: match.hazards && match.hazards.length > 0 ? match.hazards.map((h: any) => h.label).join(", ") : undefined,
        };
      }
    }
  }

  // 2. Computed profile
  const { formula, composition } = estimateFormulaAndComposition(clean);
  let molarMass = 0;
  try {
    molarMass = computeMolarMass(composition);
  } catch {
    // Fallback mass if missing unusual isotope
    molarMass = Math.round(((composition["C"] || 0) * 12.011 + (composition["H"] || 0) * 1.008 + (composition["O"] || 0) * 15.999 + (composition["N"] || 0) * 14.007) * 100) / 100;
  }

  const functionalGroups = detectFunctionalGroups(clean);

  // Infer physical state
  let physicalState: "solid" | "liquid" | "gas" | "aqueous" = "liquid";
  const isSalt = /\[(Na\+|K\+|Li\+|Ca2\+|Mg2\+|Cl-|Br-)\]/i.test(clean);
  if (isSalt || molarMass > 180 || functionalGroups.includes("Ionic Salt / Counterion")) {
    physicalState = "solid";
  } else if (molarMass < 45 && !clean.includes("O") && !clean.includes("N")) {
    physicalState = "gas";
  } else {
    physicalState = "liquid";
  }

  // Infer appearance & sensory description
  let appearance = "Colorless clear liquid";
  if (physicalState === "solid") {
    if (clean.includes("c1") || clean.includes("c2")) {
      appearance = "Off-white crystalline powder";
    } else if (isSalt) {
      appearance = "White crystalline precipitate";
    } else {
      appearance = "White crystalline solid";
    }
  } else if (physicalState === "gas") {
    appearance = "Colorless gas";
  } else {
    if (functionalGroups.includes("Ester (-COO-)")) {
      appearance = "Colorless mobile liquid with sweet fruity aroma";
    } else if (functionalGroups.includes("Amine (-NH2 / -NR2)")) {
      appearance = "Pale yellow liquid with pungent amine odor";
    } else if (functionalGroups.includes("Carboxylic Acid (-COOH)")) {
      appearance = "Pungent clear liquid";
    }
  }

  // Infer chemical class
  let chemicalClass = "organic";
  if (isSalt) chemicalClass = "salt";
  else if (functionalGroups.includes("Carboxylic Acid (-COOH)")) chemicalClass = "carboxylic_acid";
  else if (functionalGroups.includes("Ester (-COO-)")) chemicalClass = "ester";
  else if (functionalGroups.includes("Alcohol (-OH)")) chemicalClass = "alcohol";
  else if (functionalGroups.includes("Amine (-NH2 / -NR2)")) chemicalClass = "amine";

  // Name inference
  let name = "Synthesized Organic Molecule";
  if (functionalGroups.includes("Ester (-COO-)")) name = "Organic Ester Compound";
  else if (functionalGroups.includes("Carboxylic Acid (-COOH)")) name = "Carboxylic Acid Derivative";
  else if (isSalt) name = "Ionic Complex / Salt";
  else if (formula && formula !== "Compound") name = `${formula} Intermediate`;

  return {
    smiles: clean,
    name,
    formula,
    molarMass,
    physicalState,
    appearance,
    chemicalClass,
    functionalGroups,
  };
}

/**
 * Classifies reaction transformation and computes theoretical atom economy and byproducts.
 */
export function analyzeReactionTransformation(
  reactantSmiles: string[],
  productProfiles: ProductChemicalProfile[]
): ReactionAnalysisReport {
  const allReactantTokens = reactantSmiles.join(".").toLowerCase();
  const allProductGroups = productProfiles.flatMap((p) => p.functionalGroups);

  let reactionType = "Organic Synthesis / Transformation";
  let mechanismCategory = "Heterolytic Bond Rearrangement";
  const expectedByproducts: string[] = [];

  const hasCarboxylicAcid = /c\(=o\)o|acetic|formic|acid/i.test(allReactantTokens);
  const hasAlcohol = /cco|c\(o\)|ethanol|methanol|alcohol/i.test(allReactantTokens);
  const hasBase = /naoh|koh|hydroxide|amine/i.test(allReactantTokens);
  const hasAcid = /hcl|h2so4|sulfuric|hydrochloric/i.test(allReactantTokens);
  const hasEsterProduct = allProductGroups.includes("Ester (-COO-)");

  if ((hasCarboxylicAcid && hasAlcohol) || hasEsterProduct) {
    reactionType = "Fischer Esterification (Condensation)";
    mechanismCategory = "Nucleophilic Acyl Substitution";
    expectedByproducts.push("Water (H2O)");
  } else if ((hasAcid && hasBase) || allReactantTokens.includes("naoh") && allReactantTokens.includes("hcl")) {
    reactionType = "Acid-Base Neutralization";
    mechanismCategory = "Proton Transfer";
    expectedByproducts.push("Water (H2O)", "Sodium Chloride (NaCl)");
  } else if (allProductGroups.includes("Amide (-CONH-)")) {
    reactionType = "Amide Coupling";
    mechanismCategory = "Nucleophilic Acyl Addition-Elimination";
    expectedByproducts.push("Water (H2O)");
  } else if (/\[cl|\[br|halide/i.test(allReactantTokens)) {
    reactionType = "Nucleophilic Substitution";
    mechanismCategory = "SN2 / SN1 Displacement";
    expectedByproducts.push("Halide Salt");
  } else if (/h2|borohydride|alane|hydrogen/i.test(allReactantTokens)) {
    reactionType = "Catalytic Reduction / Hydrogenation";
    mechanismCategory = "Hydride Transfer";
  }

  // Compute Atom Economy
  const mainProduct = productProfiles[0];
  const targetMw = mainProduct?.molarMass || 100;
  // Estimate total reactants Mw
  let totalReactantMw = targetMw;
  if (expectedByproducts.length > 0) {
    totalReactantMw += expectedByproducts.includes("Water (H2O)") ? 18.015 : 0;
    totalReactantMw += expectedByproducts.includes("Sodium Chloride (NaCl)") ? 58.44 : 0;
  }
  const atomEconomyPercent = Math.min(100, Math.round((targetMw / Math.max(targetMw, totalReactantMw)) * 100));

  const observationsSummary = `${reactionType}: Produces ${productProfiles.map((p) => `${p.name} (${p.appearance})`).join(", ")}${expectedByproducts.length > 0 ? ` with ${expectedByproducts.join(", ")} byproduct` : ""
    }.`;

  return {
    reactionType,
    mechanismCategory,
    products: productProfiles,
    theoreticalAtomEconomyPercent: atomEconomyPercent,
    expectedByproducts,
    observationsSummary,
  };
}
