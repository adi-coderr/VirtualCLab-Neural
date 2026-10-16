import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

import { parseFormula } from "../src/chemistry-engine/formulaParser.js";
import { computeMolarMass } from "../src/chemistry-engine/molarMass.js";
import { generateMoleculeStructure } from "../src/chemistry-engine/moleculeStructureGenerator.js";
import { ELEMENT_DATA } from "../src/chemistry-engine/elementData.js";

// Common duplicate merges (deprecated/scraped IDs -> canonical IDs)
const DUPLICATE_MERGES: Record<string, string> = {
  "nh4-2cr2o7": "nh4-2-cr2o7",
  "nh4-2so4": "nh4-2-so4",
  "c3h4o4": "malonic-acid",
  "ch3cooh": "acetic-acid",
  "ch3coona": "sodium-acetate",
  "cu-no3-2": "cuno32",
  "salicylic-acid": "c7h6o3",
  "aspirin": "c9h8o4",
  "sodium-hydroxide": "naoh",
  "potassium-hydroxide": "koh",
  "slaked-lime": "caoh2",
  "calcium-hydroxide": "caoh2",
  "magnesium-sulfate": "mgso4",
  "calcium-chloride": "cacl2",
};

// Known subliming or decomposing chemicals where boiling point is not applicable
const DECOMPOSING_OR_SUBLIMING = new Set([
  "co2", "nh4cl", "caco3", "mgco3", "nahco3", "khco3", "agno3", "kclo3", "kmno4",
  "h2co3", "h2so3", "nh4no3", "cu-oh-2", "fe-oh-3", "al-oh-3"
]);

// Emission flame colors
const FLAME_COLORS: Record<string, string> = {
  Li: "crimson",
  Na: "intense_yellow",
  K: "lilac_pale_violet",
  Rb: "red_violet",
  Cs: "blue_violet",
  Ca: "brick_red",
  Sr: "bright_scarlet",
  Ba: "apple_green",
  Cu: "blue_green",
  B: "bright_green",
  Pb: "pale_blue",
};

// Common valence electrons for elemental groups
const ELEMENTAL_VALENCE: Record<string, number> = {
  H: 1, He: 2, Li: 1, Be: 2, B: 3, C: 4, N: 5, O: 6, F: 7, Ne: 8,
  Na: 1, Mg: 2, Al: 3, Si: 4, P: 5, S: 6, Cl: 7, Ar: 8,
  K: 1, Ca: 2, Ga: 3, Ge: 4, As: 5, Se: 6, Br: 7, Kr: 8,
  Rb: 1, Sr: 2, In: 3, Sn: 4, Sb: 5, Te: 6, I: 7, Xe: 8,
  Cs: 1, Ba: 2, Tl: 3, Pb: 4, Bi: 5,
};

// Common oxidation states for primary elements
const ELEMENT_OXIDATION_STATES: Record<string, number[]> = {
  H: [-1, 1], He: [0], Li: [1], Be: [2], B: [3], C: [-4, -2, 2, 4], N: [-3, 1, 2, 3, 4, 5],
  O: [-2, -1], F: [-1], Ne: [0], Na: [1], Mg: [2], Al: [3], Si: [-4, 4], P: [-3, 3, 5],
  S: [-2, 2, 4, 6], Cl: [-1, 1, 3, 5, 7], Ar: [0], K: [1], Ca: [2], Sc: [3], Ti: [2, 3, 4],
  V: [2, 3, 4, 5], Cr: [2, 3, 6], Mn: [2, 3, 4, 6, 7], Fe: [2, 3], Co: [2, 3], Ni: [2, 3],
  Cu: [1, 2], Zn: [2], Ga: [3], Ge: [2, 4], As: [-3, 3, 5], Se: [-2, 4, 6], Br: [-1, 1, 3, 5],
  Kr: [0], Rb: [1], Sr: [2], Ag: [1], Cd: [2], In: [3], Sn: [2, 4], Sb: [-3, 3, 5],
  I: [-1, 1, 3, 5, 7], Xe: [0, 2, 4, 6], Cs: [1], Ba: [2], W: [4, 6], Pt: [2, 4], Au: [1, 3],
  Hg: [1, 2], Pb: [2, 4], Bi: [3, 5], U: [3, 4, 5, 6]
};

// Standard elemental isotopes (primary stable isotope reference)
const ELEMENT_ISOTOPES: Record<string, Array<{ massNumber: number; isotopicMassU: number; abundancePercent: number; halfLife: string; isStable: number }>> = {
  H: [
    { massNumber: 1, isotopicMassU: 1.007825, abundancePercent: 99.9885, halfLife: "stable", isStable: 1 },
    { massNumber: 2, isotopicMassU: 2.014102, abundancePercent: 0.0115, halfLife: "stable", isStable: 1 },
  ],
  C: [
    { massNumber: 12, isotopicMassU: 12.0, abundancePercent: 98.93, halfLife: "stable", isStable: 1 },
    { massNumber: 13, isotopicMassU: 13.003355, abundancePercent: 1.07, halfLife: "stable", isStable: 1 },
  ],
  N: [
    { massNumber: 14, isotopicMassU: 14.003074, abundancePercent: 99.636, halfLife: "stable", isStable: 1 },
    { massNumber: 15, isotopicMassU: 15.000109, abundancePercent: 0.364, halfLife: "stable", isStable: 1 },
  ],
  O: [
    { massNumber: 16, isotopicMassU: 15.994915, abundancePercent: 99.757, halfLife: "stable", isStable: 1 },
    { massNumber: 18, isotopicMassU: 17.99916, abundancePercent: 0.205, halfLife: "stable", isStable: 1 },
  ],
  Cl: [
    { massNumber: 35, isotopicMassU: 34.968853, abundancePercent: 75.76, halfLife: "stable", isStable: 1 },
    { massNumber: 37, isotopicMassU: 36.965903, abundancePercent: 24.24, halfLife: "stable", isStable: 1 },
  ],
  Fe: [
    { massNumber: 56, isotopicMassU: 55.934937, abundancePercent: 91.754, halfLife: "stable", isStable: 1 },
    { massNumber: 54, isotopicMassU: 53.939611, abundancePercent: 5.845, halfLife: "stable", isStable: 1 },
  ],
  Cu: [
    { massNumber: 63, isotopicMassU: 62.929597, abundancePercent: 69.15, halfLife: "stable", isStable: 1 },
    { massNumber: 65, isotopicMassU: 64.927789, abundancePercent: 30.85, halfLife: "stable", isStable: 1 },
  ]
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const unifiedDbPath = path.resolve(__dirname, "../data/chemlab_unified.db");
const reportPath = path.resolve(__dirname, "../data/reactants_import_report.json");

// Ensure data directory exists
fs.mkdirSync(path.dirname(unifiedDbPath), { recursive: true });

const db = new Database(unifiedDbPath);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

console.log("=== INITIATING TASK 2: BATCH CLEANING, IMPORT, AND VALIDATION ===");
console.log(`Target Unified Database: ${unifiedDbPath}`);

// 1. Initialize Unified Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS _import_progress (
    batch_id INTEGER PRIMARY KEY,
    batch_name TEXT NOT NULL,
    start_index INTEGER NOT NULL,
    end_index INTEGER NOT NULL,
    records_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    completed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reactants_unified (
    id TEXT PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    iupac_name TEXT,
    formula TEXT NOT NULL,
    cas_number TEXT,
    smiles TEXT,
    inchi TEXT,
    inchi_key TEXT,
    category_tags TEXT NOT NULL,
    bonding_type TEXT NOT NULL,
    
    atomic_number INTEGER,
    molar_mass_kg_mol REAL NOT NULL,
    molar_mass_g_mol REAL NOT NULL,
    physical_state_room_temp TEXT NOT NULL,
    melting_point_k REAL,
    boiling_point_k REAL,
    density_kg_m3 REAL,
    appearance_color TEXT NOT NULL,
    odor TEXT NOT NULL DEFAULT 'odorless',
    solubility_water_g_per_100g REAL,
    solubility_category TEXT NOT NULL,
    valence_electrons INTEGER,
    common_oxidation_states TEXT NOT NULL,
    electronegativity_pauling REAL,
    ionization_energy_j_mol REAL,
    atomic_radius_pm REAL,
    
    electrical_conductivity_s_m REAL,
    thermal_conductivity_w_m_k REAL,
    malleability TEXT,
    ductility TEXT,
    luster TEXT,
    oxide_acid_base_behavior TEXT,
    electron_tendency TEXT,
    brittleness TEXT,
    is_chemically_inert INTEGER NOT NULL DEFAULT 0,
    
    is_amphoteric INTEGER NOT NULL DEFAULT 0,
    magnetic_behavior TEXT NOT NULL DEFAULT 'diamagnetic',
    is_radioactive INTEGER NOT NULL DEFAULT 0,
    redox_character TEXT NOT NULL DEFAULT 'none',
    acid_base_class TEXT NOT NULL DEFAULT 'neutral',
    pka REAL,
    pkb REAL,
    ph_1m_solution REAL,
    has_variable_oxidation_states INTEGER NOT NULL DEFAULT 0,
    
    reacts_with_water INTEGER NOT NULL DEFAULT 0,
    water_reaction_notes TEXT,
    reacts_with_acid INTEGER NOT NULL DEFAULT 0,
    acid_reaction_notes TEXT,
    reacts_with_base INTEGER NOT NULL DEFAULT 0,
    base_reaction_notes TEXT,
    reacts_with_oxygen INTEGER NOT NULL DEFAULT 0,
    oxygen_reaction_notes TEXT,
    is_flammable INTEGER NOT NULL DEFAULT 0,
    flash_point_k REAL,
    autoignition_temp_k REAL,
    flame_test_color TEXT,
    ghs_hazard_codes TEXT NOT NULL DEFAULT '[]',
    handling_precautions TEXT,
    ppe_requirements TEXT,
    
    data_version TEXT NOT NULL DEFAULT '2.0',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reactant_property_provenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reactant_id TEXT NOT NULL REFERENCES reactants_unified(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    status TEXT NOT NULL,
    raw_value TEXT,
    provenance_source TEXT NOT NULL,
    confidence_score REAL NOT NULL DEFAULT 1.0,
    UNIQUE(reactant_id, property_name)
  );

  CREATE TABLE IF NOT EXISTS reactant_isotopes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reactant_id TEXT NOT NULL REFERENCES reactants_unified(id) ON DELETE CASCADE,
    mass_number INTEGER NOT NULL,
    isotopic_mass_u REAL NOT NULL,
    abundance_percent REAL NOT NULL DEFAULT 0.0,
    half_life TEXT,
    is_stable INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS reactant_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reactant_id TEXT NOT NULL REFERENCES reactants_unified(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    alias_type TEXT NOT NULL DEFAULT 'synonym',
    UNIQUE(reactant_id, alias)
  );

  CREATE INDEX IF NOT EXISTS idx_reactants_formula ON reactants_unified(formula);
  CREATE INDEX IF NOT EXISTS idx_reactants_cas ON reactants_unified(cas_number);
  CREATE INDEX IF NOT EXISTS idx_reactant_aliases_alias ON reactant_aliases(alias);
  CREATE INDEX IF NOT EXISTS idx_provenance_lookup ON reactant_property_provenance(reactant_id, property_name);
`);

// 2. Aggregate Raw Reactant Entities
interface RawRecord {
  id: string;
  commonName?: string;
  iupacName?: string;
  formula?: string;
  molarMass?: number;
  casNumber?: string;
  smiles?: string;
  inchi?: string;
  inchiKey?: string;
  physicalState?: string;
  density?: number;
  meltingPointC?: number;
  boilingPointC?: number;
  solubilityNotes?: string;
  isAcid?: boolean | number;
  isBase?: boolean | number;
  acidBaseStrength?: string;
  pKa?: number;
  pKb?: number;
  chemicalClass?: string;
  charge?: number;
  substanceColor?: string;
  isElemental?: boolean | number;
  source?: string;
  notes?: string;
  hazardCodes?: string[];
}

const rawCandidateMap = new Map<string, RawRecord>();

// A. Existing chemlab.db
const sourceDbPath = path.resolve(__dirname, "../data/chemlab.db");
if (fs.existsSync(sourceDbPath)) {
  const sDb = new Database(sourceDbPath);
  const rows = sDb.prepare("SELECT * FROM chemicals").all() as any[];
  for (const r of rows) {
    rawCandidateMap.set(r.id.toLowerCase().trim(), {
      id: r.id,
      commonName: r.common_name,
      iupacName: r.iupac_name,
      formula: r.formula,
      molarMass: r.molar_mass,
      casNumber: r.cas_number,
      smiles: r.smiles,
      inchi: r.inchi,
      inchiKey: r.inchi_key,
      physicalState: r.physical_state,
      density: r.density,
      meltingPointC: r.melting_point_c,
      boilingPointC: r.boiling_point_c,
      solubilityNotes: r.solubility_notes,
      isAcid: r.is_acid,
      isBase: r.is_base,
      acidBaseStrength: r.acid_base_strength,
      pKa: r.pka,
      pKb: r.pkb,
      chemicalClass: r.chemical_class,
      charge: r.charge,
      substanceColor: r.substance_color,
      isElemental: r.is_elemental,
      source: r.source || "chemlab.db (curated database)",
      notes: r.notes,
    });
  }
}

// B. Compiled Seed Batches
const seedBatches = [
  { file: "../dist/data/seed/chemicals.js", key: "SEED_CHEMICALS" },
  { file: "../dist/data/seed/chemicalsCurated.js", key: "CHEMICALS_CURATED" },
  { file: "../dist/data/seed/chemicalsBatch4.js", key: "CHEMICALS_BATCH_4" },
  { file: "../dist/data/seed/chemicalsBatch5.js", key: "CHEMICALS_BATCH_5" },
  { file: "../dist/data/seed/chemicalsBatch6.js", key: "CHEMICALS_BATCH_6" },
  { file: "../dist/data/seed/chemicalsBatch7.js", key: "CHEMICALS_BATCH_7" },
  { file: "../dist/data/seed/chemicalsBatch8.js", key: "CHEMICALS_BATCH_8" },
  { file: "../dist/data/seed/chemicalsBatch9.js", key: "CHEMICALS_BATCH_9" },
  { file: "../dist/data/seed/chemicalsBatch10.js", key: "CHEMICALS_BATCH_10" },
];

for (const b of seedBatches) {
  const p = path.resolve(__dirname, b.file);
  if (fs.existsSync(p)) {
    try {
      const mod = require(p);
      const list = mod[b.key] || [];
      for (const item of list) {
        if (!item.id) continue;
        const normId = item.id.toLowerCase().trim();
        if (!rawCandidateMap.has(normId)) {
          rawCandidateMap.set(normId, { ...item, source: item.source || b.file });
        }
      }
    } catch (e: any) {
      console.warn(`Could not load batch ${b.file}: ${e.message}`);
    }
  }
}

// C. chemicalColors.json
const colorsPath = path.resolve(__dirname, "../../frontend/src/data/chemicalColors.json");
if (fs.existsSync(colorsPath)) {
  const colorMap = JSON.parse(fs.readFileSync(colorsPath, "utf8"));
  for (const [id, c] of Object.entries<any>(colorMap)) {
    const normId = id.toLowerCase().trim();
    if (!rawCandidateMap.has(normId)) {
      rawCandidateMap.set(normId, {
        id: normId,
        formula: c.formula,
        commonName: c.name,
        physicalState: c.state || "solid",
        substanceColor: c.color,
        source: "frontend/chemicalColors.json",
      });
    }
  }
}

console.log(`Loaded ${rawCandidateMap.size} chemical candidates for cleaning and ingestion.`);

// 3. Batch Ingestion Loop
const BATCH_SIZE = 1000;
const candidates = Array.from(rawCandidateMap.values());
const totalCandidates = candidates.length;
const totalBatches = Math.ceil(totalCandidates / BATCH_SIZE);

let importedCount = 0;
let mergedCount = 0;
let flaggedCount = 0;
let rejectedCount = 0;

const rejectedRecords: Array<{ id: string; reason: string }> = [];
const flaggedRecords: Array<{ id: string; formula: string; flags: string[] }> = [];

const insertReactantStmt = db.prepare(`
  INSERT OR REPLACE INTO reactants_unified (
    id, canonical_name, iupac_name, formula, cas_number, smiles, inchi, inchi_key,
    category_tags, bonding_type, atomic_number, molar_mass_kg_mol, molar_mass_g_mol,
    physical_state_room_temp, melting_point_k, boiling_point_k, density_kg_m3,
    appearance_color, odor, solubility_water_g_per_100g, solubility_category,
    valence_electrons, common_oxidation_states, electronegativity_pauling,
    ionization_energy_j_mol, atomic_radius_pm, electrical_conductivity_s_m,
    thermal_conductivity_w_m_k, malleability, ductility, luster, oxide_acid_base_behavior,
    electron_tendency, brittleness, is_chemically_inert, is_amphoteric,
    magnetic_behavior, is_radioactive, redox_character, acid_base_class,
    pka, pkb, ph_1m_solution, has_variable_oxidation_states, reacts_with_water,
    water_reaction_notes, reacts_with_acid, acid_reaction_notes, reacts_with_base,
    base_reaction_notes, reacts_with_oxygen, oxygen_reaction_notes, is_flammable,
    flash_point_k, autoignition_temp_k, flame_test_color, ghs_hazard_codes,
    handling_precautions, ppe_requirements, data_version, created_at, updated_at
  ) VALUES (
    @id, @canonical_name, @iupac_name, @formula, @cas_number, @smiles, @inchi, @inchi_key,
    @category_tags, @bonding_type, @atomic_number, @molar_mass_kg_mol, @molar_mass_g_mol,
    @physical_state_room_temp, @melting_point_k, @boiling_point_k, @density_kg_m3,
    @appearance_color, @odor, @solubility_water_g_per_100g, @solubility_category,
    @valence_electrons, @common_oxidation_states, @electronegativity_pauling,
    @ionization_energy_j_mol, @atomic_radius_pm, @electrical_conductivity_s_m,
    @thermal_conductivity_w_m_k, @malleability, @ductility, @luster, @oxide_acid_base_behavior,
    @electron_tendency, @brittleness, @is_chemically_inert, @is_amphoteric,
    @magnetic_behavior, @is_radioactive, @redox_character, @acid_base_class,
    @pka, @pkb, @ph_1m_solution, @has_variable_oxidation_states, @reacts_with_water,
    @water_reaction_notes, @reacts_with_acid, @acid_reaction_notes, @reacts_with_base,
    @base_reaction_notes, @reacts_with_oxygen, @oxygen_reaction_notes, @is_flammable,
    @flash_point_k, @autoignition_temp_k, @flame_test_color, @ghs_hazard_codes,
    @handling_precautions, @ppe_requirements, @data_version, @created_at, @updated_at
  )
`);

const insertProvenanceStmt = db.prepare(`
  INSERT OR REPLACE INTO reactant_property_provenance (
    reactant_id, property_name, status, raw_value, provenance_source, confidence_score
  ) VALUES (?, ?, ?, ?, ?, ?)
`);

const insertAliasStmt = db.prepare(`
  INSERT OR IGNORE INTO reactant_aliases (reactant_id, alias, alias_type) VALUES (?, ?, ?)
`);

const insertIsotopeStmt = db.prepare(`
  INSERT INTO reactant_isotopes (
    reactant_id, mass_number, isotopic_mass_u, abundance_percent, half_life, is_stable
  ) VALUES (?, ?, ?, ?, ?, ?)
`);

const pendingAliases: Array<{ targetId: string; alias: string; type: string }> = [];

for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
  const start = bIdx * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, totalCandidates);
  const chunk = candidates.slice(start, end);

  console.log(`[BATCH ${bIdx + 1}/${totalBatches}] Processing candidate records ${start + 1} to ${end}...`);

  const runBatchTransaction = db.transaction(() => {
    for (const raw of chunk) {
      let id = (raw.id || "").toLowerCase().trim();
      let formula = (raw.formula || "").trim();
      let name = (raw.commonName || "").trim();

      // Check duplicate merge
      if (DUPLICATE_MERGES[id]) {
        const canonicalTarget = DUPLICATE_MERGES[id]!;
        pendingAliases.push({ targetId: canonicalTarget, alias: id, type: "deprecated_id" });
        mergedCount++;
        continue;
      }

      // Filter noise / patent artifacts
      if (!formula || /^(product|unknown|none|null|example|intermediate)/i.test(formula) || /^[0-9]+(?:\.[0-9]+)?g$/i.test(name)) {
        rejectedRecords.push({ id, reason: `Noise or invalid formula "${formula}"` });
        rejectedCount++;
        continue;
      }

      // Validate formula syntax
      let parsedComp: Record<string, number> | null = null;
      try {
        const parsed = parseFormula(formula);
        parsedComp = parsed.composition;
      } catch (err: any) {
        rejectedRecords.push({ id, reason: `Formula parse failed: ${err.message}` });
        rejectedCount++;
        continue;
      }

      const flags: string[] = [];

      // Molar Mass Consistency
      let molarMassGMol = raw.molarMass;
      let calculatedMolarMass: number | null = null;
      try {
        calculatedMolarMass = computeMolarMass(parsedComp);
      } catch {
        // Element not in atomic weight table
      }

      if (calculatedMolarMass) {
        if (!molarMassGMol || molarMassGMol <= 0) {
          molarMassGMol = calculatedMolarMass;
        } else if (Math.abs(molarMassGMol - calculatedMolarMass) > 1.0) {
          flags.push(`Molar mass stated (${molarMassGMol}) deviates from calculated (${calculatedMolarMass})`);
        }
      }

      if (!molarMassGMol || molarMassGMol <= 0) {
        molarMassGMol = 100.0;
        flags.push("Molar mass missing; defaulted to 100.0");
      }

      const molarMassKgMol = Number((molarMassGMol * 0.001).toFixed(6));

      // Temperatures & Thermal Validation
      let meltingPointK: number | null = null;
      let meltingStatus: "value" | "unknown" = "unknown";
      if (raw.meltingPointC !== undefined && raw.meltingPointC !== null && !isNaN(Number(raw.meltingPointC))) {
        meltingPointK = Number((Number(raw.meltingPointC) + 273.15).toFixed(2));
        meltingStatus = "value";
      }

      let boilingPointK: number | null = null;
      let boilingStatus: "value" | "not_applicable" | "unknown" = "unknown";
      if (DECOMPOSING_OR_SUBLIMING.has(id)) {
        boilingStatus = "not_applicable";
      } else if (raw.boilingPointC !== undefined && raw.boilingPointC !== null && !isNaN(Number(raw.boilingPointC))) {
        boilingPointK = Number((Number(raw.boilingPointC) + 273.15).toFixed(2));
        boilingStatus = "value";
      }

      if (meltingPointK && boilingPointK && meltingPointK >= boilingPointK) {
        flags.push(`Melting point (${meltingPointK}K) >= Boiling point (${boilingPointK}K)`);
        boilingStatus = "not_applicable";
        boilingPointK = null;
      }

      // Density normalization to kg/m³
      let densityKgM3: number | null = null;
      let densityStatus: "value" | "unknown" = "unknown";
      if (raw.density !== undefined && raw.density !== null && !isNaN(Number(raw.density)) && Number(raw.density) > 0) {
        const rawD = Number(raw.density);
        densityKgM3 = rawD > 50 ? rawD : Number((rawD * 1000).toFixed(2));
        densityStatus = "value";
      }

      // Elemental check
      const isSingleElement = Object.keys(parsedComp).length === 1 && Object.values(parsedComp)[0] === 1;
      const elementSymbol = isSingleElement ? Object.keys(parsedComp)[0]! : null;
      const elemInfo = elementSymbol ? ELEMENT_DATA.get(elementSymbol) : null;

      // Category tags
      const tags = new Set<string>();
      if (elemInfo) {
        tags.add("element");
        tags.add(elemInfo.category);
        if (elemInfo.category.includes("metal")) tags.add("metal");
      } else {
        tags.add("compound");
      }

      if (raw.isAcid || (raw.chemicalClass || "").includes("acid")) tags.add("acid");
      if (raw.isBase || (raw.chemicalClass || "").includes("base")) tags.add("base");
      if ((raw.chemicalClass || "").includes("salt") || (raw.chemicalClass || "").includes("halide")) tags.add("salt");
      if ((raw.chemicalClass || "").includes("organic")) tags.add("organic");
      if (parsedComp["O"] && Object.keys(parsedComp).length === 2) tags.add("oxide");

      // Bonding type
      let bondingType = "covalent";
      if (tags.has("metal") && isSingleElement) bondingType = "metallic";
      else if (tags.has("salt") || raw.charge !== 0) bondingType = "ionic";

      // Elemental properties
      const atomicNumber = elemInfo ? elemInfo.atomicNumber : null;
      const valenceElectrons = elementSymbol && ELEMENTAL_VALENCE[elementSymbol] ? ELEMENTAL_VALENCE[elementSymbol]! : null;
      const oxidationStates = elementSymbol && ELEMENT_OXIDATION_STATES[elementSymbol]
        ? ELEMENT_OXIDATION_STATES[elementSymbol]!
        : [0];
      const atomicRadiusPm = elemInfo ? elemInfo.covalentRadiusPm : null;

      // Reactivity heuristics
      const reactsWithWater = tags.has("alkali_metal") || ["cacl2", "p2o5", "so3", "alcl3"].includes(id) ? 1 : 0;
      const reactsWithAcid = tags.has("base") || tags.has("alkali_metal") || formula.includes("CO3") ? 1 : 0;
      const reactsWithBase = tags.has("acid") ? 1 : 0;
      const reactsWithOxygen = tags.has("alkali_metal") || ["p", "s", "fe", "mg"].includes(id) ? 1 : 0;
      const isFlammable = tags.has("organic") || ["h2", "ch4", "c2h5oh"].includes(id) ? 1 : 0;
      const flameColor = elementSymbol && FLAME_COLORS[elementSymbol] ? FLAME_COLORS[elementSymbol]! : null;

      // 2D & 3D Structure generation test
      try {
        generateMoleculeStructure(id, formula, parsedComp);
      } catch (err: any) {
        flags.push(`MoleculeStructureGenerator error: ${err.message}`);
      }

      if (flags.length > 0) {
        flaggedRecords.push({ id, formula, flags });
        flaggedCount++;
      }

      // Insert Main Reactant
      const now = new Date().toISOString();
      const reactantRecord = {
        id,
        canonical_name: name || formula,
        iupac_name: raw.iupacName || null,
        formula,
        cas_number: raw.casNumber || null,
        smiles: raw.smiles || null,
        inchi: raw.inchi || null,
        inchi_key: raw.inchiKey || null,
        category_tags: JSON.stringify(Array.from(tags)),
        bonding_type: bondingType,
        atomic_number: atomicNumber,
        molar_mass_kg_mol: molarMassKgMol,
        molar_mass_g_mol: molarMassGMol,
        physical_state_room_temp: (raw.physicalState || "solid").toLowerCase(),
        melting_point_k: meltingPointK,
        boiling_point_k: boilingPointK,
        density_kg_m3: densityKgM3,
        appearance_color: raw.substanceColor || (elemInfo ? elemInfo.cpkColor : "#FFFFFF"),
        odor: "odorless",
        solubility_water_g_per_100g: null,
        solubility_category: (raw.solubilityNotes || "").toLowerCase().includes("insoluble") ? "insoluble" : "soluble",
        valence_electrons: valenceElectrons,
        common_oxidation_states: JSON.stringify(oxidationStates),
        electronegativity_pauling: null,
        ionization_energy_j_mol: null,
        atomic_radius_pm: atomicRadiusPm,
        electrical_conductivity_s_m: null,
        thermal_conductivity_w_m_k: null,
        malleability: tags.has("metal") ? "high" : "not_applicable",
        ductility: tags.has("metal") ? "high" : "not_applicable",
        luster: tags.has("metal") ? "metallic" : "not_applicable",
        oxide_acid_base_behavior: tags.has("metal") ? "basic" : "acidic",
        electron_tendency: tags.has("metal") ? "lose" : "gain",
        brittleness: tags.has("nonmetal") ? "brittle" : "not_applicable",
        is_chemically_inert: tags.has("noble_gas") ? 1 : 0,
        is_amphoteric: ["al2o3", "zno", "pbo", "sno"].includes(id) ? 1 : 0,
        magnetic_behavior: ["fe", "co", "ni"].includes(id) ? "ferromagnetic" : "diamagnetic",
        is_radioactive: ["u", "th", "ra", "rn"].includes(id) ? 1 : 0,
        redox_character: tags.has("alkali_metal") ? "reducer" : ["kmno4", "k2cr2o7", "h2o2"].includes(id) ? "oxidizer" : "none",
        acid_base_class: tags.has("acid") ? "strong_acid" : tags.has("base") ? "strong_base" : "neutral",
        pka: raw.pKa || null,
        pkb: raw.pKb || null,
        ph_1m_solution: null,
        has_variable_oxidation_states: ["fe", "cu", "cr", "mn", "sn", "pb"].includes(id) ? 1 : 0,
        reacts_with_water: reactsWithWater,
        water_reaction_notes: reactsWithWater ? "Vigorous reaction with water" : null,
        reacts_with_acid: reactsWithAcid,
        acid_reaction_notes: reactsWithAcid ? "Reacts with dilute acids" : null,
        reacts_with_base: reactsWithBase,
        base_reaction_notes: reactsWithBase ? "Neutralization reaction with bases" : null,
        reacts_with_oxygen: reactsWithOxygen,
        oxygen_reaction_notes: reactsWithOxygen ? "Oxidizes in air" : null,
        is_flammable: isFlammable,
        flash_point_k: null,
        autoignition_temp_k: null,
        flame_test_color: flameColor,
        ghs_hazard_codes: JSON.stringify(raw.hazardCodes || (raw.isAcid ? ["CORROSIVE"] : [])),
        handling_precautions: raw.notes || "Standard chemical lab PPE required.",
        ppe_requirements: "Safety goggles, chemical-resistant gloves, lab coat.",
        data_version: "2.0",
        created_at: now,
        updated_at: now,
      };

      insertReactantStmt.run(reactantRecord);
      importedCount++;

      // Provenance Entries
      const provSrc = raw.source || "chemlab reference knowledge";
      insertProvenanceStmt.run(id, "molar_mass", calculatedMolarMass ? "predicted" : "value", String(molarMassGMol), "Periodic Table standard weights", 1.0);
      insertProvenanceStmt.run(id, "melting_point_k", meltingStatus, meltingPointK ? String(meltingPointK) : null, provSrc, 0.95);
      insertProvenanceStmt.run(id, "boiling_point_k", boilingStatus, boilingPointK ? String(boilingPointK) : null, provSrc, 0.95);
      insertProvenanceStmt.run(id, "density_kg_m3", densityStatus, densityKgM3 ? String(densityKgM3) : null, provSrc, 0.9);
      insertProvenanceStmt.run(id, "valence_electrons", valenceElectrons ? "value" : "not_applicable", valenceElectrons ? String(valenceElectrons) : null, "Electron configuration tables", 1.0);
      insertProvenanceStmt.run(id, "bonding_type", "predicted", bondingType, "Chemistry engine classification", 0.95);

      // Isotopes if elemental
      if (elementSymbol && ELEMENT_ISOTOPES[elementSymbol]) {
        for (const iso of ELEMENT_ISOTOPES[elementSymbol]!) {
          insertIsotopeStmt.run(id, iso.massNumber, iso.isotopicMassU, iso.abundancePercent, iso.halfLife, iso.isStable);
        }
      }

      // Add Aliases
      pendingAliases.push({ targetId: id, alias: formula, type: "formula_alias" });
      if (name && name.toLowerCase() !== id) {
        pendingAliases.push({ targetId: id, alias: name, type: "common_name" });
      }
    }

    // Record Batch Progress
    db.prepare(`
      INSERT OR REPLACE INTO _import_progress (
        batch_id, batch_name, start_index, end_index, records_count, status, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(bIdx + 1, `Batch_${bIdx + 1}`, start, end, chunk.length, "SUCCESS", new Date().toISOString());
  });

  runBatchTransaction();
}

// 3.5 Bulk Insert Pending Aliases
console.log(`Inserting ${pendingAliases.length} aliases...`);
const validReactantIds = new Set(
  (db.prepare("SELECT id FROM reactants_unified").all() as { id: string }[]).map((r) => r.id)
);

const runAliasTransaction = db.transaction(() => {
  for (const pa of pendingAliases) {
    if (validReactantIds.has(pa.targetId)) {
      insertAliasStmt.run(pa.targetId, pa.alias, pa.type);
    }
  }
});
runAliasTransaction();

// 4. Output Summary Report
const finalReport = {
  timestamp: new Date().toISOString(),
  totalCandidatesProcessed: totalCandidates,
  totalImported: importedCount,
  totalMergedDuplicates: mergedCount,
  totalFlagged: flaggedCount,
  totalRejected: rejectedCount,
  flaggedSamples: flaggedRecords.slice(0, 20),
  rejectedSamples: rejectedRecords.slice(0, 20),
  unifiedDbStats: {
    totalReactants: db.prepare("SELECT count(*) as c FROM reactants_unified").get() as any,
    totalProvenanceRows: db.prepare("SELECT count(*) as c FROM reactant_property_provenance").get() as any,
    totalAliases: db.prepare("SELECT count(*) as c FROM reactant_aliases").get() as any,
    totalIsotopes: db.prepare("SELECT count(*) as c FROM reactant_isotopes").get() as any,
  }
};

fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2), "utf8");

console.log("\n=== TASK 2 BATCH IMPORT & VALIDATION COMPLETED ===");
console.log(`Total Candidates Processed: ${totalCandidates}`);
console.log(`Successfully Imported:      ${importedCount}`);
console.log(`Merged Duplicates:          ${mergedCount}`);
console.log(`Flagged with Discrepancies: ${flaggedCount}`);
console.log(`Rejected (Noise/Invalid):   ${rejectedCount}`);
console.log(`Report written to:          ${reportPath}`);
console.log(`Database saved to:          ${unifiedDbPath}`);
