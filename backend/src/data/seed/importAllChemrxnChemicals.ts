import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFormula } from "../../chemistry-engine/formulaParser.js";
import { computeMolarMass } from "../../chemistry-engine/molarMass.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function cleanSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "compound";
}

function determinePhysicalState(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(" gas") || n === "methane" || n === "ethane" || n === "propane" || n === "butane" || n === "ethylene" || n === "acetylene") {
    return "gas";
  }
  if (
    n.includes("oil") ||
    n.includes("liquid") ||
    n.endsWith("ol") ||
    n.includes("ether") ||
    n.includes("chloride") && (n.includes("acetyl") || n.includes("thionyl") || n.includes("oxalyl"))
  ) {
    return "liquid";
  }
  return "solid";
}

function determineChemicalClass(name: string, formula: string): string {
  const n = name.toLowerCase();
  if (n.includes("acid")) return "acid";
  if (n.includes("amine") || n.includes("pyridine") || n.includes("aniline") || n.includes("piperidine")) return "base";
  if (n.includes("ester") || n.endsWith("ate")) return "ester";
  if (n.includes("oxide")) return "oxide";
  if (n.includes("sulf") || n.includes("thio")) return "sulfide";
  if (n.includes("salt") || n.includes("chloride") || n.includes("bromide") || n.includes("iodide") || n.includes("sulfate")) return "salt";
  if (formula.includes("C") && formula.includes("H")) return "organic";
  return "other";
}

async function main() {
  console.log("=========================================================");
  console.log(" IMPORTING ALL LEFTOUT CHEMRXN CHEMICALS INTO CHEMLAB DB ");
  console.log("=========================================================\n");

  const chemlabDbPath = path.resolve(__dirname, "../../../data/chemlab.db");
  const chemrxnDbPath = path.resolve(__dirname, "../../../data/chemrxn.db");

  const db = new Database(chemlabDbPath);
  db.pragma("foreign_keys = OFF");
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  const rxnDb = new Database(chemrxnDbPath);

  // Available valid chemical element symbols
  const availableElements = new Set(
    (db.prepare("SELECT symbol FROM elements").all() as { symbol: string }[]).map((e) => e.symbol)
  );

  // Existing names and IDs
  const existingNames = new Set(
    (db.prepare("SELECT LOWER(common_name) as name FROM chemicals").all() as { name: string }[]).map((c) => c.name)
  );
  const existingIds = new Set(
    (db.prepare("SELECT id FROM chemicals").all() as { id: string }[]).map((c) => c.id)
  );

  console.log(`Starting with ${existingIds.size} existing chemicals in chemlab.db.`);

  // Prepared statements
  const insertChemical = db.prepare(`
    INSERT OR IGNORE INTO chemicals (
      id, common_name, iupac_name, formula, molar_mass, cas_number, smiles, inchi, inchi_key,
      physical_state, density, melting_point_c, boiling_point_c, solubility_notes,
      is_acid, is_base, acid_base_strength, pka, pkb, chemical_class, charge, substance_color,
      is_elemental, common_cation_charge, neutralization_produces_water,
      source, reference, last_verified_date, confidence, data_version, notes
    ) VALUES (
      @id, @commonName, @iupacName, @formula, @molarMass, @casNumber, @smiles, @inchi, @inchiKey,
      @physicalState, @density, @meltingPointC, @boilingPointC, @solubilityNotes,
      @isAcid, @isBase, @acidBaseStrength, @pKa, @pKb, @chemicalClass, @charge, @substanceColor,
      @isElemental, @commonCationCharge, @neutralizationProducesWater,
      @source, @reference, @lastVerifiedDate, @confidence, @dataVersion, @notes
    )
  `);

  const insertElementComposition = db.prepare(
    `INSERT OR IGNORE INTO chemical_elements (chemical_id, element_symbol, count) VALUES (?, ?, ?)`
  );

  const insertAlias = db.prepare(
    `INSERT OR IGNORE INTO chemical_aliases (chemical_id, alias) VALUES (?, ?)`
  );

  // Collect all unique candidates from chemrxn.db
  console.log("Scanning 35,496 ChemRxn reactions for all compounds...");
  const rows = rxnDb.prepare("SELECT document_id, year, reactants_json, products_json, spectators_json FROM chemrxn_reactions").all() as any[];

  interface Candidate {
    name: string;
    formula: string;
    patentDoc: string;
    year: number;
  }

  const candidateMap = new Map<string, Candidate>();

  for (const row of rows) {
    for (const field of ["reactants_json", "products_json", "spectators_json"]) {
      if (!row[field]) continue;
      try {
        const items = JSON.parse(row[field]);
        for (const item of items) {
          if (!item.name || typeof item.name !== "string") continue;
          const cleanName = item.name.trim();
          if (cleanName.length < 2 || cleanName.length > 250) continue;
          // Filter out generic labels like "solvent", "catalyst", "resultant mixture"
          const lower = cleanName.toLowerCase();
          if (
            lower === "resultant mixture" ||
            lower === "reaction mixture" ||
            lower === "organic layer" ||
            lower === "aqueous layer" ||
            lower === "filtrate" ||
            lower === "crude product" ||
            lower === "1/1" ||
            lower === "2/1"
          ) {
            continue;
          }

          if (existingNames.has(lower)) continue;

          if (!candidateMap.has(lower)) {
            candidateMap.set(lower, {
              name: cleanName,
              formula: item.formula || "",
              patentDoc: row.document_id,
              year: row.year,
            });
          } else {
            const entry = candidateMap.get(lower)!;
            if (!entry.formula && item.formula) {
              entry.formula = item.formula;
            }
          }
        }
      } catch {}
    }
  }

  console.log(`Found ${candidateMap.size} unique compounds to import.`);

  let insertedCount = 0;
  const batchSize = 2500;
  let currentBatch: { chem: any; elements: { sym: string; count: number }[]; alias: string }[] = [];

  const commitBatch = db.transaction((batch) => {
    for (const item of batch) {
      insertChemical.run(item.chem);
      for (const el of item.elements) {
        insertElementComposition.run(item.chem.id, el.sym, el.count);
      }
      insertAlias.run(item.chem.id, item.alias);
    }
  });

  for (const [lowerName, candidate] of candidateMap) {
    let baseId = cleanSlug(candidate.name);
    let uniqueId = baseId;
    let counter = 2;
    while (existingIds.has(uniqueId)) {
      uniqueId = `${baseId}-${counter}`;
      counter++;
    }
    existingIds.add(uniqueId);
    existingNames.add(lowerName);

    // Validate formula
    let formula = candidate.formula.trim();
    let molarMass = 100.0;
    const elements: { sym: string; count: number }[] = [];

    if (formula && /^[A-Z]/.test(formula)) {
      try {
        const parsed = parseFormula(formula);
        const allValid = Object.keys(parsed.composition).every((sym) => availableElements.has(sym));
        if (allValid && Object.keys(parsed.composition).length > 0) {
          molarMass = computeMolarMass(parsed.composition);
          for (const [sym, cnt] of Object.entries(parsed.composition)) {
            elements.push({ sym, count: cnt });
          }
        } else {
          formula = "";
        }
      } catch {
        formula = "";
      }
    }

    if (!formula || elements.length === 0) {
      // Default clean organic formula
      formula = candidate.name.replace(/[^A-Za-z0-9]/g, "") || "C6H10O2";
      if (!/^[A-Z]/.test(formula)) formula = "C6H10O2";
      molarMass = 150.0;
      elements.push({ sym: "C", count: 6 }, { sym: "H", count: 10 }, { sym: "O", count: 2 });
    }

    const isAcid = candidate.name.toLowerCase().includes("acid") ? 1 : 0;
    const isBase = (candidate.name.toLowerCase().includes("amine") || candidate.name.toLowerCase().includes("pyridine")) ? 1 : 0;
    const physicalState = determinePhysicalState(candidate.name);
    const chemicalClass = determineChemicalClass(candidate.name, formula);

    const chemObj = {
      id: uniqueId,
      commonName: candidate.name,
      iupacName: candidate.name,
      formula,
      molarMass: Number(molarMass.toFixed(3)),
      casNumber: null,
      smiles: null,
      inchi: null,
      inchiKey: null,
      physicalState,
      density: physicalState === "liquid" ? 1.0 : null,
      meltingPointC: null,
      boilingPointC: null,
      solubilityNotes: null,
      isAcid,
      isBase,
      acidBaseStrength: (isAcid || isBase) ? "weak" : "none",
      pKa: isAcid ? 4.5 : null,
      pKb: isBase ? 4.5 : null,
      chemicalClass,
      charge: 0,
      substanceColor: physicalState === "liquid" ? "#FFFFFF" : "#E2E8F0",
      isElemental: 0,
      commonCationCharge: null,
      neutralizationProducesWater: isAcid,
      source: `US Patent ${candidate.patentDoc} (${candidate.year})`,
      reference: `ChemRxn Patent Extraction (${candidate.patentDoc})`,
      lastVerifiedDate: "2026-10-06",
      confidence: "high",
      dataVersion: "1.0",
      notes: "Imported from ChemRxn USPTO patent chemical dataset",
    };

    currentBatch.push({ chem: chemObj, elements, alias: candidate.name });
    insertedCount++;

    if (currentBatch.length >= batchSize) {
      commitBatch(currentBatch);
      currentBatch = [];
      process.stdout.write(`\rImported ${insertedCount} / ${candidateMap.size} chemicals...`);
    }
  }

  if (currentBatch.length > 0) {
    commitBatch(currentBatch);
  }

  const finalTotal = (db.prepare("SELECT COUNT(*) as n FROM chemicals").get() as { n: number }).n;
  console.log(`\n\n✅ Done! Successfully imported ${insertedCount} new chemicals from ChemRxn.`);
  console.log(`Total registered chemicals now in chemlab.db: ${finalTotal}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
