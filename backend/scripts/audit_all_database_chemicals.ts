import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateMoleculeStructure } from "../src/chemistry-engine/moleculeStructureGenerator.js";
import { parseFormula } from "../src/chemistry-engine/formulaParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../data/chemlab.db");
const db = new Database(dbPath);

console.log("Starting comprehensive 3D structure audit across chemlab.db...");

const totalRow = db.prepare("SELECT count(*) as count FROM chemicals").get() as { count: number };
const total = totalRow.count;
console.log(`Total chemicals in database: ${total}`);

const BATCH_SIZE = 2000;
let checkedCount = 0;
let clashCount = 0;
let bondCount = 0;
let exceptionCount = 0;
const errors: { id: string; formula: string; error: string }[] = [];

for (let offset = 0; offset < total; offset += BATCH_SIZE) {
  const batch = db.prepare(`
    SELECT id, common_name, formula, smiles
    FROM chemicals
    LIMIT ? OFFSET ?
  `).all(BATCH_SIZE, offset) as { id: string; common_name: string; formula: string; smiles?: string }[];

  for (const chem of batch) {
    checkedCount++;
    let struct;
    try {
      let comp: Record<string, number> = {};
      try {
        if (chem.formula && chem.formula.trim().length > 0) {
          comp = parseFormula(chem.formula).composition;
        }
      } catch {
        comp = {};
      }

      struct = generateMoleculeStructure(chem.id, chem.formula || "", comp, chem.common_name || "", chem.smiles);
    } catch (err: any) {
      exceptionCount++;
      if (errors.length < 50) {
        errors.push({ id: chem.id, formula: chem.formula, error: `Exception: ${err.message}` });
      }
      continue;
    }

    if (!struct || !struct.atoms || struct.atoms.length === 0) {
      continue;
    }

    // 1. Check coordinates
    for (const a of struct.atoms) {
      if (!Number.isFinite(a.x3d) || !Number.isFinite(a.y3d) || !Number.isFinite(a.z3d)) {
        if (errors.length < 50) {
          errors.push({ id: chem.id, formula: chem.formula, error: `Non-finite coordinate for atom ${a.element}` });
        }
        break;
      }
    }

    // 2. Check atom overlap
    let hasClash = false;
    for (let i = 0; i < struct.atoms.length; i++) {
      for (let j = i + 1; j < struct.atoms.length; j++) {
        const a1 = struct.atoms[i]!;
        const a2 = struct.atoms[j]!;
        const dist = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
        if (dist < 0.65) {
          clashCount++;
          hasClash = true;
          if (errors.length < 50) {
            errors.push({
              id: chem.id,
              formula: chem.formula,
              error: `Overlap ${dist.toFixed(3)} Å between ${a1.element}[${i}] and ${a2.element}[${j}]`,
            });
          }
          break;
        }
      }
      if (hasClash) break;
    }

    // 3. Check bonds
    for (const b of struct.bonds) {
      const a1 = struct.atoms[b.atomIndex1];
      const a2 = struct.atoms[b.atomIndex2];
      if (!a1 || !a2) {
        bondCount++;
        if (errors.length < 50) {
          errors.push({ id: chem.id, formula: chem.formula, error: `Invalid bond indices (${b.atomIndex1}, ${b.atomIndex2})` });
        }
        break;
      }
      if (b.type === "covalent") {
        const d = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
        if (d < 0.70 || d > 2.60) {
          bondCount++;
          if (errors.length < 50) {
            errors.push({
              id: chem.id,
              formula: chem.formula,
              error: `Unphysical covalent bond length ${d.toFixed(3)} Å between ${a1.element} and ${a2.element}`,
            });
          }
          break;
        }
      }
    }
  }

  process.stdout.write(`\rChecked ${checkedCount}/${total} chemicals... Clashes: ${clashCount}, Bond errors: ${bondCount}, Exceptions: ${exceptionCount}`);
}

console.log("\n\n=== AUDIT RESULTS ===");
console.log(`Total Checked: ${checkedCount}`);
console.log(`Total Clashes: ${clashCount}`);
console.log(`Total Bond Errors: ${bondCount}`);
console.log(`Total Exceptions: ${exceptionCount}`);

if (errors.length > 0) {
  console.log("\nSample of detected issues:");
  for (const e of errors.slice(0, 30)) {
    console.log(` - [${e.id}] (${e.formula}): ${e.error}`);
  }
} else {
  console.log("\nALL STRUCTURES PASSED CLEANLY!");
}
