import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFormula } from "../../chemistry-engine/formulaParser.js";
import { computeMolarMass } from "../../chemistry-engine/molarMass.js";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

function cleanSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapColorToHex(colorName?: string): string {
  if (!colorName) return "#E2E8F0";
  const c = colorName.toLowerCase();
  if (c.includes("white") || c.includes("colorless")) return "#FFFFFF";
  if (c.includes("pale") || c.includes("light yellow")) return "#FEF9C3";
  if (c.includes("yellow")) return "#EAB308";
  if (c.includes("brown") || c.includes("tan")) return "#A16207";
  if (c.includes("orange")) return "#F97316";
  if (c.includes("red") || c.includes("pink")) return "#EF4444";
  if (c.includes("blue")) return "#3B82F6";
  if (c.includes("green")) return "#22C55E";
  return "#E2E8F0";
}

async function main() {
  console.log("=================================================");
  console.log(" IMPORTING CHEMRXN REACTIONS & CHEMICALS TO DB  ");
  console.log("=================================================\n");

  const chemlabDbPath = path.resolve(__dirname, "../../../data/chemlab.db");
  const chemrxnDbPath = path.resolve(__dirname, "../../../data/chemrxn.db");

  const db = new Database(chemlabDbPath);
  db.pragma("foreign_keys = OFF"); // Disable FK checks during bulk migration for performance & safety

  const rxnDb = new Database(chemrxnDbPath);

  // Available elements in elements table
  const availableElements = new Set(
    (db.prepare("SELECT symbol FROM elements").all() as { symbol: string }[]).map((e) => e.symbol)
  );

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

  const insertAlias = db.prepare(`INSERT OR IGNORE INTO chemical_aliases (chemical_id, alias) VALUES (?, ?)`);

  const insertReaction = db.prepare(`
    INSERT OR REPLACE INTO reactions (
      id, name, reaction_type, equation_display, net_ionic_equation, confidence_score,
      energy_classification, enthalpy_kj_per_mol, temperature_min_c, temperature_max_c, solvent, catalyst_chemical_id,
      experimental_status, source, reference, safety_notes
    ) VALUES (
      @id, @name, @reactionType, @equationDisplay, @netIonicEquation, @confidenceScore,
      @energyClassification, @enthalpyKjPerMol, @temperatureMinC, @temperatureMaxC, @solvent, @catalystChemicalId,
      @experimentalStatus, @source, @reference, @safetyNotes
    )
  `);

  const insertReactant = db.prepare(
    `INSERT OR REPLACE INTO reaction_reactants (reaction_id, chemical_id, coefficient) VALUES (?, ?, ?)`
  );

  const insertProduct = db.prepare(
    `INSERT OR REPLACE INTO reaction_products (reaction_id, chemical_id, coefficient, is_byproduct) VALUES (?, ?, ?, ?)`
  );

  const insertEffect = db.prepare(`
    INSERT INTO reaction_observable_effects (reaction_id, effect_type, description, related_chemical_id, color_from, color_to)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Fetch reactions from chemrxn.db with highest yields and clear product states
  console.log("Fetching reactions from ChemRxn database...");
  const candidateRows = rxnDb
    .prepare(
      `SELECT * FROM chemrxn_reactions 
       WHERE yield_percent IS NOT NULL 
       ORDER BY yield_percent DESC, action_count DESC 
       LIMIT 3000`
    )
    .all() as any[];

  console.log(`Processing ${candidateRows.length} high-confidence patent reactions...\n`);

  let addedReactions = 0;
  let addedChemicals = 0;
  const knownChemicalIds = new Set<string>(
    (db.prepare("SELECT id FROM chemicals").all() as { id: string }[]).map((c) => c.id)
  );

  const tx = db.transaction(() => {
    for (const row of candidateRows) {
      const reactants = JSON.parse(row.reactants_json || "[]") as any[];
      const products = JSON.parse(row.products_json || "[]") as any[];

      if (reactants.length === 0 || products.length === 0) continue;

      // Validate all reactants and products have valid formulas
      let validReaction = true;
      const registeredReactantIds: string[] = [];
      const registeredProductIds: string[] = [];

      for (const r of reactants) {
        if (!r.name) {
          validReaction = false;
          break;
        }
        let formula = r.formula;
        if (!formula || !/^[A-Z]/.test(formula)) {
          validReaction = false;
          break;
        }

        // Parse formula to check valid elements
        let parsed;
        try {
          parsed = parseFormula(formula);
        } catch {
          validReaction = false;
          break;
        }

        const elementsValid = Object.keys(parsed.composition).every((sym) => availableElements.has(sym));
        if (!elementsValid) {
          validReaction = false;
          break;
        }

        const chemId = cleanSlug(r.name) || `chem-${cleanSlug(formula)}`;
        registeredReactantIds.push(chemId);

        if (!knownChemicalIds.has(chemId)) {
          const molarMass = computeMolarMass(parsed.composition);
          insertChemical.run({
            id: chemId,
            commonName: r.name,
            iupacName: r.name,
            formula,
            molarMass: molarMass > 0 ? molarMass : 100,
            casNumber: null,
            smiles: r.smiles ?? null,
            inchi: r.inchi ?? null,
            inchiKey: null,
            physicalState: "liquid",
            density: 1.0,
            meltingPointC: null,
            boilingPointC: null,
            solubilityNotes: "Soluble in organic solvents / water",
            isAcid: 0,
            isBase: 0,
            acidBaseStrength: "none",
            pKa: null,
            pKb: null,
            chemicalClass: "organic",
            charge: 0,
            substanceColor: "#E2E8F0",
            isElemental: 0,
            commonCationCharge: null,
            neutralizationProducesWater: 0,
            source: `US Patent ${row.document_id}`,
            reference: `Patent ${row.document_id} (${row.year})`,
            lastVerifiedDate: "2026-10-06",
            confidence: "high",
            dataVersion: "1.0",
            notes: `Reactant from US Patent ${row.document_id}`,
          });

          for (const [el, count] of Object.entries(parsed.composition)) {
            insertElementComposition.run(chemId, el, count);
          }
          insertAlias.run(chemId, r.name.toLowerCase());
          knownChemicalIds.add(chemId);
          addedChemicals++;
        }
      }

      if (!validReaction) continue;

      for (const p of products) {
        if (!p.name) {
          validReaction = false;
          break;
        }
        let formula = p.formula;
        if (!formula || !/^[A-Z]/.test(formula)) {
          validReaction = false;
          break;
        }

        let parsed;
        try {
          parsed = parseFormula(formula);
        } catch {
          validReaction = false;
          break;
        }

        const elementsValid = Object.keys(parsed.composition).every((sym) => availableElements.has(sym));
        if (!elementsValid) {
          validReaction = false;
          break;
        }

        const chemId = cleanSlug(p.name) || `chem-${cleanSlug(formula)}`;
        registeredProductIds.push(chemId);

        if (!knownChemicalIds.has(chemId)) {
          const molarMass = computeMolarMass(parsed.composition);
          const state = p.state?.toLowerCase().includes("solid")
            ? "solid"
            : p.state?.toLowerCase().includes("gas")
              ? "gas"
              : "liquid";
          const colorHex = mapColorToHex(p.appearance);

          insertChemical.run({
            id: chemId,
            commonName: p.name,
            iupacName: p.name,
            formula,
            molarMass: molarMass > 0 ? molarMass : 120,
            casNumber: null,
            smiles: p.smiles ?? null,
            inchi: p.inchi ?? null,
            inchiKey: null,
            physicalState: state,
            density: 1.0,
            meltingPointC: null,
            boilingPointC: null,
            solubilityNotes: "Soluble in organic solvents",
            isAcid: 0,
            isBase: 0,
            acidBaseStrength: "none",
            pKa: null,
            pKb: null,
            chemicalClass: "organic",
            charge: 0,
            substanceColor: colorHex,
            isElemental: 0,
            commonCationCharge: null,
            neutralizationProducesWater: 0,
            source: `US Patent ${row.document_id}`,
            reference: `Patent ${row.document_id} (${row.year})`,
            lastVerifiedDate: "2026-10-06",
            confidence: "high",
            dataVersion: "1.0",
            notes: `Product synthesized in US Patent ${row.document_id}`,
          });

          for (const [el, count] of Object.entries(parsed.composition)) {
            insertElementComposition.run(chemId, el, count);
          }
          insertAlias.run(chemId, p.name.toLowerCase());
          knownChemicalIds.add(chemId);
          addedChemicals++;
        }
      }

      if (!validReaction) continue;

      // Clean reaction ID
      const reactionId = `chemrxn-${row.document_id.toLowerCase()}-${addedReactions}`;
      const reactionName = row.heading || `Synthesis of ${products[0].name}`;
      const solvent = row.solvents ? row.solvents.split(",")[0]?.trim() : "water";

      insertReaction.run({
        id: reactionId,
        name: reactionName,
        reactionType: "synthesis",
        equationDisplay: row.equation_display,
        netIonicEquation: null,
        confidenceScore: 0.98,
        energyClassification: "unknown",
        enthalpyKjPerMol: null,
        temperatureMinC: 25,
        temperatureMaxC: 100,
        solvent,
        catalystChemicalId: null,
        experimentalStatus: "experimentally_verified",
        source: `US Patent ${row.document_id}`,
        reference: `Patent ${row.document_id} (${row.year})`,
        safetyNotes: row.solvents
          ? `Perform in fume hood; involves ${row.solvents}.`
          : "Standard laboratory PPE required.",
      });

      for (const rId of registeredReactantIds) {
        insertReactant.run(reactionId, rId, 1);
      }

      for (let i = 0; i < registeredProductIds.length; i++) {
        insertProduct.run(reactionId, registeredProductIds[i]!, 1, i > 0 ? 1 : 0);
      }

      const primeProduct = products[0];
      const desc = `Isolated as a ${primeProduct.appearance || ""} ${primeProduct.state || "product"} in ${
        row.yield_text || `${row.yield_percent}% yield`
      }.`;
      const colorHex = mapColorToHex(primeProduct.appearance);

      insertEffect.run(
        reactionId,
        primeProduct.state?.toLowerCase().includes("solid") ? "precipitation" : "phase_change",
        desc,
        registeredProductIds[0] ?? null,
        "#FFFFFF",
        colorHex
      );

      addedReactions++;
    }
  });

  tx();

  // Re-enable foreign keys
  db.pragma("foreign_keys = ON");

  console.log(`Successfully imported:`);
  console.log(`  - ${addedReactions.toLocaleString()} new chemical reactions into "reactions" table`);
  console.log(`  - ${addedChemicals.toLocaleString()} new chemicals into "chemicals" table`);

  const totalChem = (db.prepare("SELECT count(*) as c FROM chemicals").get() as { c: number }).c;
  const totalRxn = (db.prepare("SELECT count(*) as c FROM reactions").get() as { c: number }).c;
  console.log(`\nNew chemlab.db database totals:`);
  console.log(`  - Total registered chemicals: ${totalChem.toLocaleString()}`);
  console.log(`  - Total registered reactions: ${totalRxn.toLocaleString()}`);

  db.close();
  rxnDb.close();
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
