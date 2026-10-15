import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../data/chemlab.db");
const db = new Database(dbPath);

console.log("Running Precision Physical Form Audit & Refinement across database...");

const physicalFormRegex = /\b(ribbon|strip|filings|wire|foil|turnings|granule|granules|pellet|pellets|chunk|chunks|sheet|sheets|mossy|metal bar|ingot|rod|rods)\b/i;

const allRows = db.prepare(`
  SELECT id, common_name, formula, physical_state, chemical_class, melting_point_c, boiling_point_c, is_elemental
  FROM chemicals
`).all() as {
  id: string;
  common_name: string;
  formula: string;
  physical_state: string;
  chemical_class: string;
  melting_point_c: number | null;
  boiling_point_c: number | null;
  is_elemental: number;
}[];

const updateStmt = db.prepare("UPDATE chemicals SET physical_form = ? WHERE id = ?");

let correctedCount = 0;
const counts = {
  liquid: 0,
  powder: 0,
  crystal: 0,
  solid: 0,
  gas: 0,
};

function precisionDetermineForm(c: {
  id: string;
  common_name: string;
  formula: string;
  physical_state: string;
  chemical_class: string;
  melting_point_c: number | null;
  boiling_point_c: number | null;
  is_elemental: number;
}): "liquid" | "powder" | "crystal" | "solid" | "gas" {
  const normState = (c.physical_state || "").toLowerCase();
  const normName = (c.common_name || "").toLowerCase();
  const f = c.formula || "";
  const chemClass = (c.chemical_class || "").toLowerCase();

  // 1. Gas phase
  if (normState === "gas" || /^(O2|N2|H2|Cl2|F2|He|Ne|Ar|Kr|Xe|CO2|CO|CH4|NH3|SO2|NO|NO2|H2S|HCl)$/.test(f)) {
    return "gas";
  }

  // 2. Liquid phase
  if (
    normState === "liquid" ||
    normState === "aqueous" ||
    (c.melting_point_c !== null && c.melting_point_c < 20 && (c.boiling_point_c === null || c.boiling_point_c > 20)) ||
    /^(H2O|Br2|Hg|CH3COOH|C2H5OH|C3H6O|C6H6|C7H8|CS2|CCl4|CHCl3|H2SO4|HNO3|H3PO4)$/i.test(f) ||
    normName.includes("liquid") ||
    normName.includes("acid solution") ||
    normName.includes("hydroxide solution") ||
    normName.includes("oil") ||
    normName.includes("ether") ||
    normName.includes("alcohol")
  ) {
    return "liquid";
  }

  // 3. Elemental metals & physical solid strips/granules/wire/foil
  const isElementalMetal =
    c.is_elemental === 1 &&
    (/^(Fe|Cu|Zn|Mg|Al|Na|K|Ca|Ag|Au|Pt|Pb|Sn|Ni|Co|Li|Ba|Sr|Cr|Mn|Ti|V|W|Mo|Bi|Cd|In|Tl|Sb)$/i.test(f) || chemClass === "metal");

  if (isElementalMetal || physicalFormRegex.test(normName)) {
    return "solid";
  }

  // 4. Crystals: hydrates, vitreous salts, crystalline lattices, sugars, transparent prism salts
  if (
    f.includes("·") ||
    f.includes(".H2O") ||
    chemClass === "salt" ||
    normName.includes("hydrate") ||
    normName.includes("vitriol") ||
    normName.includes("crystal") ||
    normName.includes("alum") ||
    normName.includes("sucrose") ||
    normName.includes("glucose") ||
    normName.includes("fructose") ||
    normName.includes("citric acid") ||
    normName.includes("tartaric acid") ||
    normName.includes("permanganate") ||
    normName.includes("dichromate") ||
    normName.includes("chromate") ||
    normName.includes("sulfate") ||
    normName.includes("chloride") ||
    normName.includes("nitrate") ||
    normName.includes("iodide") ||
    normName.includes("bromide") ||
    normName.includes("phosphate") ||
    normName.includes("fluoride") ||
    normName.includes("rock salt")
  ) {
    return "crystal";
  }

  // 5. Powders: oxides, carbonates, hydroxides, chalk, sulfur, charcoal, pigments, insoluble solids
  return "powder";
}

const tx = db.transaction(() => {
  for (const c of allRows) {
    const refined = precisionDetermineForm(c);
    counts[refined]++;
    updateStmt.run(refined, c.id);
  }
});

tx();

console.log("Refinement complete across entire database of " + allRows.length + " chemicals.");
console.table(counts);

// Verify all solid metal chemicals now
const solidRows = db.prepare(`SELECT id, common_name, formula, chemical_class, is_elemental FROM chemicals WHERE physical_form = 'solid'`).all();
console.log(`\nVerified Solid Form Chemicals (${solidRows.length} total):`);
console.table(solidRows);
