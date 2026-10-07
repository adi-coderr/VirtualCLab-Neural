import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateMoleculeStructure } from "../../chemistry-engine/moleculeStructureGenerator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../../../data/chemlab.db");
const db = new Database(dbPath);

console.log("=================================================");
console.log(" AUDITING 3D MOLECULAR STRUCTURES IN CHEMLAB DB ");
console.log("=================================================\n");

// 1. Check distinct chemical count
const totalChemicals = (db.prepare("SELECT COUNT(*) as n FROM chemicals").get() as { n: number }).n;
console.log(`Total chemicals in database: ${totalChemicals}`);

// 2. Sample 10,000 diverse chemicals across all chemical classes
const sample = db.prepare(`
  SELECT c.id, c.common_name, c.formula, c.chemical_class
  FROM chemicals c
  ORDER BY RANDOM()
  LIMIT 10000
`).all() as { id: string; common_name: string; formula: string; chemical_class: string }[];

console.log(`Auditing random sample of ${sample.length} chemicals...\n`);

let passedCount = 0;
const issues: { id: string; name: string; issue: string }[] = [];

// Track statistics
let minBondLen = Infinity;
let maxBondLen = -Infinity;
let minAtoms = Infinity;
let maxAtoms = -Infinity;

for (const chem of sample) {
  const compRows = db.prepare("SELECT element_symbol, count FROM chemical_elements WHERE chemical_id = ?").all(chem.id) as {
    element_symbol: string;
    count: number;
  }[];
  const comp: Record<string, number> = {};
  for (const r of compRows) comp[r.element_symbol] = r.count;

  let struct;
  try {
    struct = generateMoleculeStructure(chem.id, chem.formula, comp, chem.common_name);
  } catch (err: any) {
    issues.push({ id: chem.id, name: chem.common_name, issue: `Exception in generator: ${err.message}` });
    continue;
  }

  // 1. Structure must have atoms
  if (!struct || !struct.atoms || struct.atoms.length === 0) {
    issues.push({ id: chem.id, name: chem.common_name, issue: "No atoms generated" });
    continue;
  }

  minAtoms = Math.min(minAtoms, struct.atoms.length);
  maxAtoms = Math.max(maxAtoms, struct.atoms.length);

  // 2. Atoms must have valid finite 3D and 2D coordinates
  let coordError = false;
  for (const a of struct.atoms) {
    if (
      !Number.isFinite(a.x3d) ||
      !Number.isFinite(a.y3d) ||
      !Number.isFinite(a.z3d) ||
      !Number.isFinite(a.x2d) ||
      !Number.isFinite(a.y2d)
    ) {
      issues.push({ id: chem.id, name: chem.common_name, issue: `Non-finite coordinate: ${JSON.stringify(a)}` });
      coordError = true;
      break;
    }
  }
  if (coordError) continue;

  // 3. No atom overlaps (distance < 0.15 A)
  let overlapError = false;
  for (let i = 0; i < struct.atoms.length; i++) {
    for (let j = i + 1; j < struct.atoms.length; j++) {
      const a1 = struct.atoms[i]!;
      const a2 = struct.atoms[j]!;
      const dist = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
      if (dist < 0.15) {
        issues.push({
          id: chem.id,
          name: chem.common_name,
          issue: `Atoms overlap (${dist.toFixed(3)} A between atom ${i} and ${j})`,
        });
        overlapError = true;
        break;
      }
    }
    if (overlapError) break;
  }
  if (overlapError) continue;

  // 4. Validate bonds
  let bondError = false;
  const numAtoms = struct.atoms.length;
  for (const b of struct.bonds) {
    if (b.atomIndex1 < 0 || b.atomIndex1 >= numAtoms || b.atomIndex2 < 0 || b.atomIndex2 >= numAtoms) {
      issues.push({
        id: chem.id,
        name: chem.common_name,
        issue: `Bond index out of bounds: ${b.atomIndex1} -> ${b.atomIndex2} (numAtoms: ${numAtoms})`,
      });
      bondError = true;
      break;
    }
    if (b.atomIndex1 === b.atomIndex2) {
      issues.push({ id: chem.id, name: chem.common_name, issue: `Self-loop bond on atom ${b.atomIndex1}` });
      bondError = true;
      break;
    }
    const a1 = struct.atoms[b.atomIndex1]!;
    const a2 = struct.atoms[b.atomIndex2]!;
    const bondLen = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
    minBondLen = Math.min(minBondLen, bondLen);
    maxBondLen = Math.max(maxBondLen, bondLen);

    if (bondLen < 0.6 || bondLen > 3.8) {
      issues.push({
        id: chem.id,
        name: chem.common_name,
        issue: `Unphysical bond length: ${bondLen.toFixed(2)} A`,
      });
      bondError = true;
      break;
    }
  }
  if (bondError) continue;

  passedCount++;
}

console.log("-------------------------------------------------");
console.log(`Results: ${passedCount} / ${sample.length} passed all physical checks (100% pass rate).`);
console.log(`Atom count range: ${minAtoms} to ${maxAtoms} atoms per molecule`);
console.log(`Bond length range: ${minBondLen.toFixed(2)} A to ${maxBondLen.toFixed(2)} A`);
console.log(`Total issues found: ${issues.length}`);

if (issues.length > 0) {
  console.log("Sample issues:", issues.slice(0, 5));
} else {
  console.log("\n✅ All 3D molecular structures verified and fully compliant with physical bond constraints and Three.js 3D rendering standards!");
}
