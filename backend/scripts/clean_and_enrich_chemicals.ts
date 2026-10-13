import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../data/chemlab.db");
const db = new Database(dbPath);

console.log("=== STARTING CHEMICAL DATABASE CLEANUP AND ENRICHMENT ===");

// 1. Identify Noise Chemicals
const allChems = db.prepare("SELECT id, formula, common_name, smiles FROM chemicals").all() as {
  id: string;
  formula: string;
  common_name: string;
  smiles?: string;
}[];

function isNoiseChemical(c: { id: string; formula: string; common_name: string }): boolean {
  const name = (c.common_name || "").trim();
  const id = (c.id || "").trim().toLowerCase();
  const form = (c.formula || "").trim();

  // Keep protected canonical element IDs and formulas
  const protectedIds = new Set(["p", "i", "h", "s", "c", "v", "w", "b", "f", "k", "n", "o"]);
  if (protectedIds.has(id)) return false;

  // 1. Parenthesized/bracketed short codes: ( a ), ( 5-c ), [ 3 ], ( 83 )
  if (/^[\(\[]\s*[0-9a-zA-Z_-]{1,6}\s*[\)\]]$/.test(name)) return true;

  // 2. Pure numbers or alphanumeric patent tags: 16, 32, 1L, 2A, 1c, 2j, 1cx, 2-b, 5-c
  if (/^[0-9]{1,4}[a-zA-Z]{0,2}$/.test(name)) return true;
  if (/^[0-9]{1,3}-[a-zA-Z]$/.test(name)) return true;

  // 3. Weight / volume strings scraped as names: 94g, 81g, 126g, 300g, 50ml
  if (/^[0-9]+(?:\.[0-9]+)?\s*(?:g|mg|kg|ml|l|mol|mmol)$/i.test(name)) return true;

  // 4. Placeholders
  if (/^(product|products|intermediate|example|compound)\b/i.test(name) || /#(?:[0-9]+)/.test(name)) return true;

  // 5. Physical states / crude mixture
  const lowerName = name.toLowerCase();
  if (["ice", "ice water", "ice hcl", "aqueous solution", "crude mixture", "liquid"].includes(lowerName)) return true;

  // 6. Fragment prefixes / isomers
  if (["2,4-", "2,6- isomers", "diazonium salt", "hydrazo", "acetyl"].includes(lowerName)) return true;

  // 7. Invalid formulas
  if (!form || /^(product|producta|unknown|none|formula|null)$/i.test(form)) return true;

  return false;
}

const noise = allChems.filter(isNoiseChemical);
console.log(`Identified ${noise.length} noise chemical entries to purge.`);

const noiseIds = noise.map((c) => c.id);

// 2. Transaction to Purge Noise
const cleanupTx = db.transaction(() => {
  if (noiseIds.length > 0) {
    const chunk = 500;
    for (let i = 0; i < noiseIds.length; i += chunk) {
      const slice = noiseIds.slice(i, i + chunk);
      const marks = slice.map(() => "?").join(",");

      // Remove dependent rows first
      db.prepare(`DELETE FROM chemical_aliases WHERE chemical_id IN (${marks})`).run(...slice);
      db.prepare(`DELETE FROM chemical_hazards WHERE chemical_id IN (${marks})`).run(...slice);
      db.prepare(`DELETE FROM chemical_elements WHERE chemical_id IN (${marks})`).run(...slice);
      db.prepare(`DELETE FROM molecule_atoms WHERE chemical_id IN (${marks})`).run(...slice);
      db.prepare(`DELETE FROM molecule_bonds WHERE chemical_id IN (${marks})`).run(...slice);

      // Find any patent reaction referencing these noise chemicals
      const rxnIds = (
        db
          .prepare(
            `SELECT DISTINCT reaction_id FROM reaction_reactants WHERE chemical_id IN (${marks})
             UNION
             SELECT DISTINCT reaction_id FROM reaction_products WHERE chemical_id IN (${marks})`
          )
          .all(...slice, ...slice) as { reaction_id: string }[]
      ).map((r) => r.reaction_id);

      if (rxnIds.length > 0) {
        const rxnMarks = rxnIds.map(() => "?").join(",");
        db.prepare(`DELETE FROM reaction_reactants WHERE reaction_id IN (${rxnMarks})`).run(...rxnIds);
        db.prepare(`DELETE FROM reaction_products WHERE reaction_id IN (${rxnMarks})`).run(...rxnIds);
        db.prepare(`DELETE FROM reaction_observable_effects WHERE reaction_id IN (${rxnMarks})`).run(...rxnIds);
        db.prepare(`DELETE FROM reactions WHERE id IN (${rxnMarks})`).run(...rxnIds);
      }

      db.prepare(`DELETE FROM chemicals WHERE id IN (${marks})`).run(...slice);
    }
  }

  // 3. Fix Corrupted / Misrepresented Canonical Chemicals
  // Phosphorus
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Phosphorus', formula = 'P', molar_mass = 30.974, chemical_class = 'nonmetal', is_elemental = 1
    WHERE id = 'p'
  `).run();

  // Iodine
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Iodine', formula = 'I2', molar_mass = 253.808, chemical_class = 'halogen', is_elemental = 1
    WHERE id = 'i'
  `).run();

  // Hydrogen
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Hydrogen', formula = 'H2', molar_mass = 2.016, chemical_class = 'nonmetal', is_elemental = 1
    WHERE id = 'h'
  `).run();

  // Sodium thiosulfate
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Sodium thiosulfate', formula = 'Na2S2O3', molar_mass = 158.11, chemical_class = 'salt'
    WHERE id = 'sodium-thiosulfate'
  `).run();

  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Sodium thiosulfate pentahydrate', formula = 'Na2S2O3', molar_mass = 248.18, chemical_class = 'salt'
    WHERE id = 'sodium-thiosulfate-pentahydrate'
  `).run();

  // Sodium sulfate & sulfite
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Sodium sulfate', formula = 'Na2SO4', molar_mass = 142.04, chemical_class = 'salt'
    WHERE id = 'sodium-sulphate'
  `).run();

  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Sodium sulfite', formula = 'Na2SO3', molar_mass = 126.04, chemical_class = 'salt'
    WHERE id = 'sodium-sulphite' OR id = 'sodium-sulfite-heptahydrate'
  `).run();

  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Sodium dithionite', formula = 'Na2S2O4', molar_mass = 174.11, chemical_class = 'salt'
    WHERE id = 'sodium-hydrosulfite'
  `).run();

  // Cupric chloride & copper iodide
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Copper(II) chloride', formula = 'CuCl2', molar_mass = 134.45, chemical_class = 'salt'
    WHERE id = 'cupric-chloride' OR id = 'cupric-chloride-dihydrate'
  `).run();

  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Copper(I) iodide', formula = 'CuI', molar_mass = 190.45, chemical_class = 'salt'
    WHERE id = 'copper-iodide'
  `).run();

  // Tin(II) chloride
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Tin(II) chloride', formula = 'SnCl2', molar_mass = 189.60, chemical_class = 'salt'
    WHERE id = 'stannous-chloride'
  `).run();

  // Carbon tetrachloride
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Carbon tetrachloride', formula = 'CCl4', molar_mass = 153.82, chemical_class = 'organic'
    WHERE id = 'carbontetrachloride'
  `).run();

  // Osmium tetroxide & Platinum oxide
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Osmium tetroxide', formula = 'OsO4', molar_mass = 254.23, chemical_class = 'oxide'
    WHERE id = 'osmium-tetroxide'
  `).run();

  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Platinum(IV) oxide', formula = 'PtO2', molar_mass = 227.08, chemical_class = 'oxide'
    WHERE id = 'platinum-oxide'
  `).run();

  // Iron salts
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Iron(II) chloride tetrahydrate', formula = 'FeCl2', molar_mass = 198.81, chemical_class = 'salt'
    WHERE id = 'iron-ii-chloride-tetrahydrate'
  `).run();

  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Iron(II) sulfate heptahydrate', formula = 'FeSO4', molar_mass = 278.01, chemical_class = 'salt'
    WHERE id = 'iron-ii-sulphate-heptahydrate'
  `).run();

  // Aluminum reagents
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Aluminum isopropoxide', formula = 'C9H21AlO3', molar_mass = 204.25, chemical_class = 'organic'
    WHERE id = 'aluminum-isopropoxide' OR id = 'aluminum-isopropylate'
  `).run();

  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Diisobutylaluminum hydride', formula = 'C8H19Al', molar_mass = 142.22, chemical_class = 'organic'
    WHERE id = 'diisobutylaluminum-hydride'
  `).run();

  // Purge bogus non-chemical descriptors
  db.prepare(`
    DELETE FROM chemicals
    WHERE id IN (
      '14n-potassium-hydroxide', 'iron-ii', 'sodium-amalgam', 'oily-nitrated-product',
      'acid-chloride-2', 'peroxide', 'hydrobromide-salt', 'potassium-dichromate-sulfuric-acid',
      'bis-4-hydroxyphenyl-methane-bisphenol-f', 'bis-tert-butyl-chromate'
    )
  `).run();

  // Sodium tetraborate (Borax)
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Sodium tetraborate (Borax)', molar_mass = 201.22
    WHERE id = 'na2b4o7'
  `).run();

  // Sodium periodate
  db.prepare(`
    UPDATE chemicals
    SET common_name = 'Sodium periodate', molar_mass = 213.89
    WHERE id = 'naio4'
  `).run();

  // 4. Add Missing Standard Reagents
  const newChemicals: {
    id: string;
    commonName: string;
    formula: string;
    molarMass: number;
    chemicalClass: string;
    physicalState: string;
    substanceColor?: string;
    density?: number;
    solubilityNotes?: string;
    aliases: string[];
    elements: Record<string, number>;
  }[] = [
    {
      id: "namno4",
      commonName: "Sodium permanganate",
      formula: "NaMnO4",
      molarMass: 141.925,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#800080",
      density: 1.97,
      solubilityNotes: "Very soluble in water (readily soluble oxidizing agent).",
      aliases: ["sodiumpermanganate", "sodium-permanganate", "sodium manganate(vii)"],
      elements: { Na: 1, Mn: 1, O: 4 },
    },
    {
      id: "k2mno4",
      commonName: "Potassium manganate",
      formula: "K2MnO4",
      molarMass: 197.132,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#006400",
      density: 2.78,
      solubilityNotes: "Soluble in water, forms intense dark green solution.",
      aliases: ["potassiummanganate", "potassium-manganate", "potassium manganate(vi)"],
      elements: { K: 2, Mn: 1, O: 4 },
    },
    {
      id: "na2mno4",
      commonName: "Sodium manganate",
      formula: "Na2MnO4",
      molarMass: 164.921,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#006400",
      density: 2.5,
      solubilityNotes: "Soluble in alkaline water.",
      aliases: ["sodiummanganate", "sodium-manganate", "sodium manganate(vi)"],
      elements: { Na: 2, Mn: 1, O: 4 },
    },
    {
      id: "k2s2o3",
      commonName: "Potassium thiosulfate",
      formula: "K2S2O3",
      molarMass: 190.32,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 2.1,
      solubilityNotes: "Freely soluble in water.",
      aliases: ["potassiumthiosulfate", "potassium-thiosulfate"],
      elements: { K: 2, S: 2, O: 3 },
    },
    {
      id: "nh4-2-s2o3",
      commonName: "Ammonium thiosulfate",
      formula: "(NH4)2S2O3",
      molarMass: 148.2,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 1.67,
      solubilityNotes: "Rapid fixer in photography, highly water soluble.",
      aliases: ["ammoniumthiosulfate", "ammonium-thiosulfate", "ats"],
      elements: { N: 2, H: 8, S: 2, O: 3 },
    },
    {
      id: "na4-fe-cn-6",
      commonName: "Sodium ferrocyanide",
      formula: "Na4[Fe(CN)6]",
      molarMass: 303.93,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFE0",
      density: 1.46,
      solubilityNotes: "Soluble in water, yellow crystals.",
      aliases: [
        "sodium ferrocyanide",
        "sodiumferrocyanide",
        "sodium-ferrocyanide",
        "yellow prussiate of soda",
        "sodium hexacyanoferrate(ii)",
      ],
      elements: { Na: 4, Fe: 1, C: 6, N: 6 },
    },
    {
      id: "na3-fe-cn-6",
      commonName: "Sodium ferricyanide",
      formula: "Na3[Fe(CN)6]",
      molarMass: 280.93,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#B22222",
      density: 1.8,
      solubilityNotes: "Soluble in water, red crystals.",
      aliases: [
        "sodium ferricyanide",
        "sodiumferricyanide",
        "sodium-ferricyanide",
        "red prussiate of soda",
        "sodium hexacyanoferrate(iii)",
      ],
      elements: { Na: 3, Fe: 1, C: 6, N: 6 },
    },
    {
      id: "khso3",
      commonName: "Potassium bisulfite",
      formula: "KHSO3",
      molarMass: 120.17,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 2.3,
      solubilityNotes: "Soluble in water.",
      aliases: ["potassiumbisulfite", "potassium-bisulfite", "potassium hydrogen sulfite"],
      elements: { K: 1, H: 1, S: 1, O: 3 },
    },
    {
      id: "k2s2o5",
      commonName: "Potassium metabisulfite",
      formula: "K2S2O5",
      molarMass: 222.32,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 2.34,
      solubilityNotes: "Common antioxidant and antimicrobial agent, soluble in water.",
      aliases: ["potassiummetabisulfite", "potassium-metabisulfite", "potassium pyrosulfite", "kmb"],
      elements: { K: 2, S: 2, O: 5 },
    },
    {
      id: "kno2",
      commonName: "Potassium nitrite",
      formula: "KNO2",
      molarMass: 85.1,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 1.92,
      solubilityNotes: "Deliquescent white crystalline solid, very soluble in water.",
      aliases: ["potassiumnitrite", "potassium-nitrite"],
      elements: { K: 1, N: 1, O: 2 },
    },
    {
      id: "kclo",
      commonName: "Potassium hypochlorite",
      formula: "KClO",
      molarMass: 90.55,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 1.16,
      solubilityNotes: "Strong oxidizer, soluble in water.",
      aliases: ["potassiumhypochlorite", "potassium-hypochlorite"],
      elements: { K: 1, Cl: 1, O: 1 },
    },
    {
      id: "ca-clo-2",
      commonName: "Calcium hypochlorite",
      formula: "Ca(ClO)2",
      molarMass: 142.98,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 2.35,
      solubilityNotes: "Bleaching powder, water disinfectant.",
      aliases: ["calcium hypochlorite", "calciumhypochlorite", "bleaching powder"],
      elements: { Ca: 1, Cl: 2, O: 2 },
    },
    {
      id: "naclo3",
      commonName: "Sodium chlorate",
      formula: "NaClO3",
      molarMass: 106.44,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 2.49,
      solubilityNotes: "Very soluble in water, strong oxidizer.",
      aliases: ["sodiumchlorate", "sodium-chlorate"],
      elements: { Na: 1, Cl: 1, O: 3 },
    },
    {
      id: "nabro3",
      commonName: "Sodium bromate",
      formula: "NaBrO3",
      molarMass: 150.89,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 3.34,
      solubilityNotes: "Soluble in water.",
      aliases: ["sodiumbromate", "sodium-bromate"],
      elements: { Na: 1, Br: 1, O: 3 },
    },
    {
      id: "kbro3",
      commonName: "Potassium bromate",
      formula: "KBrO3",
      molarMass: 167.0,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 3.27,
      solubilityNotes: "Soluble in water, oxidizing agent.",
      aliases: ["potassiumbromate", "potassium-bromate"],
      elements: { K: 1, Br: 1, O: 3 },
    },
    {
      id: "naio3",
      commonName: "Sodium iodate",
      formula: "NaIO3",
      molarMass: 197.89,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 4.28,
      solubilityNotes: "Moderately soluble in water.",
      aliases: ["sodiumiodate", "sodium-iodate"],
      elements: { Na: 1, I: 1, O: 3 },
    },
    {
      id: "kio3",
      commonName: "Potassium iodate",
      formula: "KIO3",
      molarMass: 214.0,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 3.93,
      solubilityNotes: "Soluble in water, analytical redox standard.",
      aliases: ["potassiumiodate", "potassium-iodate"],
      elements: { K: 1, I: 1, O: 3 },
    },
    {
      id: "kio4",
      commonName: "Potassium periodate",
      formula: "KIO4",
      molarMass: 230.0,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 3.62,
      solubilityNotes: "Sparingly soluble in cold water, soluble in hot water.",
      aliases: ["potassiumperiodate", "potassium-periodate", "potassium metaperiodate"],
      elements: { K: 1, I: 1, O: 4 },
    },
    {
      id: "naocn",
      commonName: "Sodium cyanate",
      formula: "NaOCN",
      molarMass: 65.01,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 1.94,
      solubilityNotes: "Soluble in water.",
      aliases: ["sodiumcyanate", "sodium-cyanate"],
      elements: { Na: 1, O: 1, C: 1, N: 1 },
    },
    {
      id: "kocn",
      commonName: "Potassium cyanate",
      formula: "KOCN",
      molarMass: 81.11,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 2.06,
      solubilityNotes: "Soluble in water, precursor in Wöhler urea synthesis.",
      aliases: ["potassiumcyanate", "potassium-cyanate"],
      elements: { K: 1, O: 1, C: 1, N: 1 },
    },
    {
      id: "na3c6h5o7",
      commonName: "Sodium citrate",
      formula: "Na3C6H5O7",
      molarMass: 258.07,
      chemicalClass: "salt",
      physicalState: "solid",
      substanceColor: "#FFFFFF",
      density: 1.7,
      solubilityNotes: "Freely soluble in water, buffering agent and anticoagulant.",
      aliases: ["sodiumcitrate", "sodium-citrate", "trisodium citrate"],
      elements: { Na: 3, C: 6, H: 5, O: 7 },
    },
  ];

  const insertChem = db.prepare(`
    INSERT OR REPLACE INTO chemicals (
      id, common_name, formula, molar_mass, physical_state, chemical_class, charge,
      substance_color, density, solubility_notes, source, confidence, data_version
    ) VALUES (
      @id, @commonName, @formula, @molarMass, @physicalState, @chemicalClass, 0,
      @substanceColor, @density, @solubilityNotes, 'VirtualCLab Curated General Reagents', 'high', '1.0'
    )
  `);

  const insertAlias = db.prepare(`INSERT OR IGNORE INTO chemical_aliases (chemical_id, alias) VALUES (?, ?)`);
  const insertElem = db.prepare(
    `INSERT OR IGNORE INTO chemical_elements (chemical_id, element_symbol, count) VALUES (?, ?, ?)`
  );

  for (const n of newChemicals) {
    insertChem.run({
      id: n.id,
      commonName: n.commonName,
      formula: n.formula,
      molarMass: n.molarMass,
      physicalState: n.physicalState,
      chemicalClass: n.chemicalClass,
      substanceColor: n.substanceColor ?? null,
      density: n.density ?? null,
      solubilityNotes: n.solubilityNotes ?? null,
    });
    for (const a of n.aliases) {
      insertAlias.run(n.id, a);
    }
    for (const [sym, count] of Object.entries(n.elements)) {
      insertElem.run(n.id, sym, count);
    }
  }

  // 5. Inject Synonyms for Existing Key Chemicals
  const keyAliases: Record<string, string[]> = {
    na2cro4: ["sodiumchromate", "sodium-chromate", "disodium chromate", "chromic acid disodium salt"],
    k2cro4: ["potassiumchromate", "potassium-chromate", "dipotassium chromate"],
    na2cr2o7: ["sodiumdichromate", "sodium-dichromate", "disodium dichromate"],
    k2cr2o7: ["potassiumdichromate", "potassium-dichromate", "dipotassium dichromate"],
    pbcro4: ["lead chromate", "leadchromate", "chrome yellow"],
    bacro4: ["barium chromate", "bariumchromate"],
    ag2cro4: ["silver chromate", "silverchromate"],
    srcro4: ["strontium chromate", "strontiumchromate"],
    "nh4-2-cr2o7": ["ammonium dichromate", "ammoniumdichromate"],
    "nh4-2-cro4": ["ammonium chromate", "ammoniumchromate"],
    kmno4: ["potassiumpermanganate", "potassium-permanganate", "permanganate of potash"],
    "sodium-thiosulfate": ["sodiumthiosulfate", "sodium-thiosulfate", "na2s2o3", "hypo"],
    nascn: ["sodiumthiocyanate", "sodium-thiocyanate"],
    kscn: ["potassiumthiocyanate", "potassium-thiocyanate"],
    nh4scn: ["ammoniumthiocyanate", "ammonium-thiocyanate"],
    "k4-fe-cn-6": [
      "potassium ferrocyanide",
      "potassiumferrocyanide",
      "potassium-ferrocyanide",
      "potassium hexacyanoferrate(ii)",
    ],
    "k3-fe-cn-6": [
      "potassium ferricyanide",
      "potassiumferricyanide",
      "potassium-ferricyanide",
      "potassium hexacyanoferrate(iii)",
    ],
    na2c2o4: ["sodiumoxalate", "sodium-oxalate", "disodium oxalate"],
    k2c2o4: ["potassiumoxalate", "potassium-oxalate", "dipotassium oxalate"],
    cac2o4: ["calciumoxalate", "calcium-oxalate"],
    "nh4-2-c2o4": ["ammoniumoxalate", "ammonium-oxalate"],
    na2so3: ["sodiumsulfite", "sodium-sulfite"],
    k2so3: ["potassiumsulfite", "potassium-sulfite"],
    "sodium-bisulfite": ["sodiumbisulfite", "sodium-bisulfite", "nahso3", "sodium hydrogen sulfite"],
    "sodium-metabisulfite": ["sodiummetabisulfite", "sodium-metabisulfite", "na2s2o5", "sodium pyrosulfite"],
    nano2: ["sodiumnitrite", "sodium-nitrite"],
    naclo: ["sodiumhypochlorite", "sodium-hypochlorite", "bleach", "liquid bleach"],
    "sodium-chlorite": ["sodiumchlorite", "sodium-chlorite", "naclo2"],
    naclo4: ["sodiumperchlorate", "sodium-perchlorate"],
    kclo3: ["potassiumchlorate", "potassium-chlorate"],
    kclo4: ["potassiumperchlorate", "potassium-perchlorate"],
    "sodium-borohydride": ["sodiumborohydride", "sodium-borohydride", "nabh4"],
    "lithium-aluminum-hydride": ["lithiumaluminumhydride", "lithium-aluminum-hydride", "lialh4", "lah"],
    na2b4o7: ["borax", "sodium borate", "sodiumborate", "sodium-borate", "sodium tetraborate"],
    naio4: ["sodiumperiodate", "sodium-periodate", "sodium metaperiodate"],
  };

  for (const [chemId, aliases] of Object.entries(keyAliases)) {
    for (const a of aliases) {
      insertAlias.run(chemId, a);
    }
  }
});

cleanupTx();

const finalCount = (db.prepare("SELECT count(*) as count FROM chemicals").get() as { count: number }).count;
console.log(`=== COMPLETED CLEANUP: ${noise.length} noise entries purged, ${finalCount} valid chemicals remaining ===`);
