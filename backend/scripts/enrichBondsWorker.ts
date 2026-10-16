import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllChemicalCandidates, type ChemicalCandidate } from "./chemicalUniverse.ts";
import { generateMoleculeStructure } from "../src/chemistry-engine/moleculeStructureGenerator.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface BatchResult {
  batchIndex: number;
  startIdx: number;
  endIdx: number;
  processedCount: number;
  totalBondsEnriched: number;
  totalAtomsStored: number;
  durationMs: number;
}

export function processBatch(batchIndex: number, startIdx: number, endIdx: number): BatchResult {
  const startTime = Date.now();
  const allCandidates = loadAllChemicalCandidates();
  const slice = allCandidates.slice(startIdx, Math.min(endIdx, allCandidates.length));

  console.log(`\n======================================================`);
  console.log(`TASK ${batchIndex}: Processing Chemical Batch [${startIdx} to ${Math.min(endIdx, allCandidates.length)}]`);
  console.log(`Total Candidates in this Batch: ${slice.length}`);
  console.log(`======================================================\n`);

  const dbPath = path.resolve(__dirname, "../data/chemlab_unified.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS molecule_atoms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chemical_id TEXT NOT NULL,
      atom_index INTEGER NOT NULL,
      element_symbol TEXT NOT NULL,
      x2d REAL NOT NULL,
      y2d REAL NOT NULL,
      x3d REAL NOT NULL,
      y3d REAL NOT NULL,
      z3d REAL NOT NULL,
      formal_charge INTEGER NOT NULL DEFAULT 0,
      UNIQUE (chemical_id, atom_index)
    );

    CREATE TABLE IF NOT EXISTS molecule_bonds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chemical_id TEXT NOT NULL,
      atom_index_1 INTEGER NOT NULL,
      atom_index_2 INTEGER NOT NULL,
      bond_order INTEGER NOT NULL DEFAULT 1,
      bond_type TEXT NOT NULL DEFAULT 'covalent',
      bond_length REAL,
      bond_angle REAL,
      angle_label TEXT,
      UNIQUE (chemical_id, atom_index_1, atom_index_2)
    );
  `);

  const insertAtom = db.prepare(`
    INSERT INTO molecule_atoms (chemical_id, atom_index, element_symbol, x2d, y2d, x3d, y3d, z3d, formal_charge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chemical_id, atom_index) DO UPDATE SET
      element_symbol = excluded.element_symbol,
      x2d = excluded.x2d,
      y2d = excluded.y2d,
      x3d = excluded.x3d,
      y3d = excluded.y3d,
      z3d = excluded.z3d,
      formal_charge = excluded.formal_charge
  `);

  const insertBond = db.prepare(`
    INSERT INTO molecule_bonds (chemical_id, atom_index_1, atom_index_2, bond_order, bond_type, bond_length, bond_angle, angle_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chemical_id, atom_index_1, atom_index_2) DO UPDATE SET
      bond_order = excluded.bond_order,
      bond_type = excluded.bond_type,
      bond_length = excluded.bond_length,
      bond_angle = excluded.bond_angle,
      angle_label = excluded.angle_label
  `);

  let totalBondsEnriched = 0;
  let totalAtomsStored = 0;
  let processedCount = 0;

  // Process in chunks inside transactions
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < slice.length; i += CHUNK_SIZE) {
    const chunk = slice.slice(i, i + CHUNK_SIZE);
    const tx = db.transaction(() => {
      for (const chem of chunk) {
        try {
          const struct = generateMoleculeStructure(chem.id, chem.formula, undefined, chem.commonName, chem.smiles, true);
          if (struct && struct.atoms && struct.atoms.length > 0) {
            for (const a of struct.atoms) {
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

            if (struct.bonds && struct.bonds.length > 0) {
              for (const b of struct.bonds) {
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
                totalBondsEnriched++;
              }
            }
          }
          processedCount++;
        } catch {
          // If a structure fails to parse, continue
        }
      }
    });

    tx();
    const currentProgress = Math.min(i + CHUNK_SIZE, slice.length);
    if (currentProgress % 5000 === 0 || currentProgress === slice.length) {
      console.log(`Task ${batchIndex} Progress: ${currentProgress} / ${slice.length} chemicals processed (${totalBondsEnriched} bonds, ${totalAtomsStored} atoms).`);
    }
  }

  // Also mirror curated compounds to chemlab.db if they belong there
  const mainChemlabPath = path.resolve(__dirname, "../data/chemlab.db");
  if (fs.existsSync(mainChemlabPath)) {
    try {
      const mainDb = new Database(mainChemlabPath);
      const mainInsertBond = mainDb.prepare(`
        INSERT INTO molecule_bonds (chemical_id, atom_index_1, atom_index_2, bond_order, bond_type, bond_length, bond_angle, angle_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(chemical_id, atom_index_1, atom_index_2) DO UPDATE SET
          bond_order = excluded.bond_order,
          bond_type = excluded.bond_type,
          bond_length = excluded.bond_length,
          bond_angle = excluded.bond_angle,
          angle_label = excluded.angle_label
      `);
      const mirrorTx = mainDb.transaction(() => {
        for (const chem of slice) {
          const check = mainDb.prepare("SELECT id FROM chemicals WHERE id = ?").get(chem.id);
          if (check) {
            const struct = generateMoleculeStructure(chem.id, chem.formula, undefined, chem.commonName, chem.smiles, true);
            if (struct?.bonds) {
              for (const b of struct.bonds) {
                mainInsertBond.run(chem.id, b.atomIndex1, b.atomIndex2, b.order, b.type || "covalent", b.length ?? null, b.angle ?? null, b.angleLabel ?? null);
              }
            }
          }
        }
      });
      mirrorTx();
      mainDb.close();
    } catch {}
  }

  db.close();
  const durationMs = Date.now() - startTime;
  console.log(`✓ Task ${batchIndex} Completed in ${(durationMs / 1000).toFixed(2)}s: ${processedCount} chemicals, ${totalBondsEnriched} bonds enriched.\n`);

  return {
    batchIndex,
    startIdx,
    endIdx,
    processedCount,
    totalBondsEnriched,
    totalAtomsStored,
    durationMs,
  };
}
