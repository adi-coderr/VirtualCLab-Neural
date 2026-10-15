import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../data/chemlab.db");
const db = new Database(dbPath);

console.log("Starting Part 1 chemical database physical form enrichment (first 1/3)...");

const totalRow = db.prepare("SELECT count(*) as count FROM chemicals").get() as { count: number };
const total = totalRow.count;
const part1Limit = Math.ceil(total / 3); // 20528
console.log(`Total database chemicals: ${total}. Part 1 target: ${part1Limit} chemicals.`);

interface ChemRecord {
  id: string;
  common_name: string;
  formula: string;
  physical_state: string;
  chemical_class: string;
  melting_point_c: number | null;
  boiling_point_c: number | null;
  is_elemental: number;
}

const rows = db.prepare(`
  SELECT id, common_name, formula, physical_state, chemical_class, melting_point_c, boiling_point_c, is_elemental
  FROM chemicals
  ORDER BY rowid ASC
  LIMIT ?
`).all(part1Limit) as ChemRecord[];

const updateStmt = db.prepare("UPDATE chemicals SET physical_form = ? WHERE id = ?");

let liquidCount = 0;
let powderCount = 0;
let crystalCount = 0;
let solidMetalCount = 0;
let gasCount = 0;

function determineForm(c: ChemRecord): "liquid" | "powder" | "crystal" | "solid" | "gas" {
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
  const isMetal =
    c.is_elemental === 1 &&
    (/^(Fe|Cu|Zn|Mg|Al|Na|K|Ca|Ag|Au|Pt|Pb|Sn|Ni|Co|Li|Ba|Sr|Cr|Mn|Ti|V|W|Mo)$/i.test(f) || chemClass === "metal");
  if (
    isMetal ||
    normName.includes("ribbon") ||
    normName.includes("strip") ||
    normName.includes("filings") ||
    normName.includes("wire") ||
    normName.includes("foil") ||
    normName.includes("turnings") ||
    normName.includes("granule") ||
    normName.includes("pellet") ||
    normName.includes("chunk") ||
    normName.includes("sheet") ||
    normName.includes("mossy") ||
    normName.includes("bar")
  ) {
    return "solid";
  }

  // 4. Crystals: hydrates, vitreous salts, crystalline lattices, sugars, transparent prism salts
  if (
    f.includes("·") ||
    f.includes(".H2O") ||
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
    normName.includes("copper(ii) sulfate") ||
    normName.includes("iron(ii) sulfate") ||
    normName.includes("zinc sulfate") ||
    normName.includes("magnesium sulfate") ||
    normName.includes("sodium chloride") ||
    normName.includes("potassium chloride") ||
    normName.includes("sodium bromide") ||
    normName.includes("potassium iodide") ||
    normName.includes("silver nitrate") ||
    normName.includes("lead(ii) nitrate") ||
    normName.includes("barium chloride") ||
    normName.includes("calcium chloride") ||
    normName.includes("copper(ii) chloride") ||
    normName.includes("ferric chloride") ||
    normName.includes("rock salt")
  ) {
    return "crystal";
  }

  // 5. Powders: oxides, carbonates, hydroxides, chalk, sulfur, charcoal, pigments, insoluble salts
  if (
    normName.includes("powder") ||
    normName.includes("dust") ||
    normName.includes("oxide") ||
    normName.includes("carbonate") ||
    normName.includes("bicarbonate") ||
    normName.includes("hydroxide") ||
    normName.includes("sulfur") ||
    normName.includes("sulfide") ||
    normName.includes("carbon black") ||
    normName.includes("charcoal") ||
    normName.includes("starch") ||
    normName.includes("flour") ||
    normName.includes("talc") ||
    normName.includes("gypsum") ||
    normName.includes("chalk") ||
    chemClass === "oxide"
  ) {
    return "powder";
  }

  // General heuristic for remaining solid compounds:
  // Most inorganic ionic salts are crystalline; organic solids and multi-ring bulk solids are powders
  if (chemClass === "salt") {
    return "crystal";
  }
  return "powder";
}

const tx = db.transaction(() => {
  for (const c of rows) {
    const form = determineForm(c);
    if (form === "liquid") liquidCount++;
    else if (form === "powder") powderCount++;
    else if (form === "crystal") crystalCount++;
    else if (form === "solid") solidMetalCount++;
    else if (form === "gas") gasCount++;

    updateStmt.run(form, c.id);
  }
});

tx();

console.log(`\n=== Part 1 Enrichment Complete (${rows.length} chemicals updated) ===`);
console.log(` - Liquids: ${liquidCount}`);
console.log(` - Powders: ${powderCount}`);
console.log(` - Crystals: ${crystalCount}`);
console.log(` - Solids / Metal strips: ${solidMetalCount}`);
console.log(` - Gases: ${gasCount}`);
