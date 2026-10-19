import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateMoleculeStructure } from "../src/chemistry-engine/moleculeStructureGenerator.js";
import { parseFormula } from "../src/chemistry-engine/formulaParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const smilesFile = path.resolve(__dirname, "../data/verified_597_smiles.json");
if (!fs.existsSync(smilesFile)) {
  console.error("Missing verified_597_smiles.json! Run map_all_597.py first.");
  process.exit(1);
}
const verifiedSmilesMap: Record<string, string> = JSON.parse(fs.readFileSync(smilesFile, "utf8"));

const dbPaths = [
  path.resolve(__dirname, "../data/chemlab.db"),
  path.resolve(__dirname, "../../data/chemlab.db"),
];

const KNOWN_PEROXIDES = new Set([
  "o2",
  "h2o2",
  "na2o2",
  "ba-o2",
  "k2o2",
  "k2s2o8",
  "na2s2o8",
  "(nh4)2s2o8",
]);

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`Database does not exist at ${dbPath}, skipping.`);
    continue;
  }

  console.log(`\n======================================================`);
  console.log(`Processing Database: ${dbPath}`);
  console.log(`======================================================\n`);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  const chemicals = db
    .prepare("SELECT id, common_name, formula, smiles FROM chemicals ORDER BY id")
    .all() as { id: string; common_name: string; formula: string; smiles?: string }[];

  console.log(`Found ${chemicals.length} chemicals to process.`);

  const updateSmiles = db.prepare("UPDATE chemicals SET smiles = ? WHERE id = ?");
  const deleteAtoms = db.prepare("DELETE FROM molecule_atoms WHERE chemical_id = ?");
  const deleteBonds = db.prepare("DELETE FROM molecule_bonds WHERE chemical_id = ?");

  const insertAtom = db.prepare(`
    INSERT INTO molecule_atoms (chemical_id, atom_index, element_symbol, x2d, y2d, x3d, y3d, z3d, formal_charge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBond = db.prepare(`
    INSERT INTO molecule_bonds (chemical_id, atom_index_1, atom_index_2, bond_order, bond_type, bond_length, bond_angle, angle_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalProcessed = 0;
  let totalAtomsStored = 0;
  let totalBondsStored = 0;
  let clashCount = 0;
  let bogusOOCount = 0;
  let exceptions = 0;

  const failedChemicals: { id: string; reason: string }[] = [];

  const tx = db.transaction(() => {
    for (const chem of chemicals) {
      const smiles = verifiedSmilesMap[chem.id] || chem.smiles || "";
      if (smiles) {
        updateSmiles.run(smiles, chem.id);
      }

      let comp: Record<string, number> = {};
      try {
        if (chem.formula && chem.formula.trim().length > 0) {
          comp = parseFormula(chem.formula).composition;
        }
      } catch {
        comp = {};
      }

      let struct;
      try {
        struct = generateMoleculeStructure(
          chem.id,
          chem.formula || "",
          comp,
          chem.common_name || "",
          smiles,
          false
        );
      } catch (err: any) {
        exceptions++;
        failedChemicals.push({ id: chem.id, reason: `Generation exception: ${err.message}` });
        continue;
      }

      if (!struct || !struct.atoms || struct.atoms.length === 0) {
        failedChemicals.push({ id: chem.id, reason: "0 atoms generated" });
        continue;
      }

      // Check atom clashes
      const atoms = struct.atoms;
      let hasClash = false;
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const d = Math.hypot(
            atoms[i]!.x3d - atoms[j]!.x3d,
            atoms[i]!.y3d - atoms[j]!.y3d,
            atoms[i]!.z3d - atoms[j]!.z3d
          );
          if (d < 0.60) {
            hasClash = true;
            clashCount++;
            failedChemicals.push({
              id: chem.id,
              reason: `Atom clash ${d.toFixed(2)}Å between ${atoms[i]!.element}[${i}] and ${atoms[j]!.element}[${j}]`,
            });
            break;
          }
        }
        if (hasClash) break;
      }

      // Check bogus O-O bonds
      const bonds = struct.bonds || [];
      const isPerox = KNOWN_PEROXIDES.has(chem.id.toLowerCase());
      for (const b of bonds) {
        const a1 = atoms[b.atomIndex1];
        const a2 = atoms[b.atomIndex2];
        if (a1 && a2 && a1.element === "O" && a2.element === "O" && !isPerox) {
          bogusOOCount++;
          failedChemicals.push({
            id: chem.id,
            reason: `Bogus O-O bond between atom ${b.atomIndex1} and ${b.atomIndex2}`,
          });
          break;
        }
      }

      // Store in DB
      deleteAtoms.run(chem.id);
      deleteBonds.run(chem.id);

      for (const a of atoms) {
        insertAtom.run(
          chem.id,
          a.atomIndex,
          a.element,
          a.x2d,
          a.y2d,
          a.x3d,
          a.y3d,
          a.z3d,
          a.formalCharge || 0
        );
        totalAtomsStored++;
      }

      for (const b of bonds) {
        insertBond.run(
          chem.id,
          b.atomIndex1,
          b.atomIndex2,
          b.order,
          b.type || "covalent",
          b.length ?? null,
          b.angle ?? null,
          b.angleLabel ?? null
        );
        totalBondsStored++;
      }

      totalProcessed++;
    }
  });

  tx();

  console.log(`\n=== COMPLETED ${dbPath} ===`);
  console.log(`Total Chemicals Processed: ${totalProcessed} / ${chemicals.length}`);
  console.log(`Total Atoms Stored in DB: ${totalAtomsStored}`);
  console.log(`Total Bonds Stored in DB: ${totalBondsStored}`);
  console.log(`Atom Clashes Detected: ${clashCount}`);
  console.log(`Bogus O-O Bonds Detected: ${bogusOOCount}`);
  console.log(`Exceptions: ${exceptions}`);

  if (failedChemicals.length > 0) {
    console.log(`\nDetected ${failedChemicals.length} issues:`);
    for (const f of failedChemicals.slice(0, 30)) {
      console.log(`  - [${f.id}]: ${f.reason}`);
    }
  } else {
    console.log("\nALL CHEMICALS PASSED AND STORED WITH ZERO ERRORS!");
  }
}
