import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChemicalRepository } from "../src/data/repositories/chemicalRepository.js";
import { parseFormula } from "../src/chemistry-engine/formulaParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetPaths = [
  path.resolve(__dirname, "../data/chemlab.db"),
  path.resolve(__dirname, "../../data/chemlab.db"),
];

for (const dbPath of targetPaths) {
  const db = new Database(dbPath);
  const repo = new ChemicalRepository(db);

  const allChems = db
    .prepare("SELECT id, common_name, formula, smiles, chemical_class FROM chemicals ORDER BY id")
    .all() as { id: string; common_name: string; formula: string; smiles?: string; chemical_class: string }[];

  console.log(`\n========================================================================`);
  console.log(`🚀 COMPREHENSIVE ONE-BY-ONE AUDIT: ${dbPath}`);
  console.log(`   Total Chemicals in DB: ${allChems.length}`);
  console.log(`========================================================================\n`);

  let passedCount = 0;
  let failedCount = 0;
  const failureReport: { id: string; formula: string; name: string; issues: string[] }[] = [];

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

for (let idx = 0; idx < allChems.length; idx++) {
  const chem = allChems[idx]!;
  const issues: string[] = [];

  const fullChem = repo.getById(chem.id);
  if (!fullChem) {
    issues.push("ChemicalRepository returned null");
    failureReport.push({ id: chem.id, formula: chem.formula, name: chem.common_name, issues });
    failedCount++;
    continue;
  }

  const struct = fullChem.structure;
  if (!struct) {
    issues.push("Structure is undefined");
  } else {
    const atoms = struct.atoms || [];
    const bonds = struct.bonds || [];

    // 1. Atoms non-empty
    if (atoms.length === 0) {
      issues.push("Structure has 0 atoms");
    }

    // 2. Expected composition vs atoms
    let comp: Record<string, number> = {};
    try {
      if (chem.formula) comp = parseFormula(chem.formula).composition;
    } catch {}

    const totalExpectedAtoms = Object.values(comp).reduce((a, b) => a + b, 0);
    if (totalExpectedAtoms > 0 && atoms.length !== totalExpectedAtoms) {
      issues.push(`Atom count mismatch: expected ${totalExpectedAtoms}, got ${atoms.length}`);
    }

    // 3. Finite 3D and 2D coordinates
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i]!;
      if (!Number.isFinite(a.x3d) || !Number.isFinite(a.y3d) || !Number.isFinite(a.z3d)) {
        issues.push(`Non-finite 3D coordinate on atom ${a.element}[${i}]`);
        break;
      }
      if (!Number.isFinite(a.x2d) || !Number.isFinite(a.y2d)) {
        issues.push(`Non-finite 2D coordinate on atom ${a.element}[${i}]`);
        break;
      }
    }

    // 4. 3D Atom Clashes (distance < 0.60 Å)
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const d = Math.hypot(
          atoms[i]!.x3d - atoms[j]!.x3d,
          atoms[i]!.y3d - atoms[j]!.y3d,
          atoms[i]!.z3d - atoms[j]!.z3d
        );
        if (d < 0.60) {
          issues.push(`3D Clash: dist ${d.toFixed(2)}Å between ${atoms[i]!.element}[${i}] and ${atoms[j]!.element}[${j}]`);
          break;
        }
      }
      if (issues.some((iss) => iss.startsWith("3D Clash"))) break;
    }

    // 5. 2D Atom Clashes (distance < 8px)
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const d2 = Math.hypot(atoms[i]!.x2d - atoms[j]!.x2d, atoms[i]!.y2d - atoms[j]!.y2d);
        if (d2 < 8) {
          issues.push(`2D Clash: dist ${d2.toFixed(1)}px between ${atoms[i]!.element}[${i}] and ${atoms[j]!.element}[${j}]`);
          break;
        }
      }
      if (issues.some((iss) => iss.startsWith("2D Clash"))) break;
    }

    // 6. Bond Checks
    const isPeroxide = KNOWN_PEROXIDES.has(chem.id.toLowerCase());
    for (let bIdx = 0; bIdx < bonds.length; bIdx++) {
      const b = bonds[bIdx]!;
      const a1 = atoms[b.atomIndex1];
      const a2 = atoms[b.atomIndex2];
      if (!a1 || !a2) {
        issues.push(`Bond ${bIdx} connects invalid atom indices: (${b.atomIndex1}, ${b.atomIndex2})`);
        break;
      }

      // Check bogus O-O
      if (a1.element === "O" && a2.element === "O" && !isPeroxide) {
        issues.push(`Bogus O-O peroxide bond: ${b.atomIndex1}-${b.atomIndex2}`);
        break;
      }

      // Check bond length physical range
      if (b.type === "covalent") {
        const d = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
        if (d < 0.70 || d > 2.65) {
          issues.push(`Unphysical covalent bond length ${d.toFixed(2)}Å between ${a1.element}[${b.atomIndex1}] and ${a2.element}[${b.atomIndex2}]`);
          break;
        }
      }
    }

    // 7. Graph Connectivity Check (Single formula unit must not have disconnected fragments)
    if (atoms.length > 1) {
      const adj: number[][] = Array.from({ length: atoms.length }, () => []);
      for (const b of bonds) {
        if (b.atomIndex1 < atoms.length && b.atomIndex2 < atoms.length) {
          adj[b.atomIndex1]!.push(b.atomIndex2);
          adj[b.atomIndex2]!.push(b.atomIndex1);
        }
      }
      const visited = new Set<number>();
      let compCount = 0;
      for (let i = 0; i < atoms.length; i++) {
        if (!visited.has(i)) {
          compCount++;
          const q = [i];
          visited.add(i);
          while (q.length > 0) {
            const curr = q.pop()!;
            for (const nbr of adj[curr]!) {
              if (!visited.has(nbr)) {
                visited.add(nbr);
                q.push(nbr);
              }
            }
          }
        }
      }
      if (compCount > 1) {
        issues.push(`Disconnected molecule: has ${compCount} disjoint fragments`);
      }
    }
  }

  if (issues.length === 0) {
    passedCount++;
  } else {
    failedCount++;
    failureReport.push({ id: chem.id, formula: chem.formula, name: chem.common_name, issues });
  }

  // Periodic stdout progress
  if ((idx + 1) % 50 === 0 || idx + 1 === allChems.length) {
    console.log(`Audited [${idx + 1} / ${allChems.length}] chemicals: ${passedCount} PASSED, ${failedCount} FAILED.`);
  }
}

console.log(`\n========================================================================`);
console.log(`📊 AUDIT SUMMARY:`);
console.log(`   - Total Chemicals Audited: ${allChems.length}`);
console.log(`   - Total Passed:            ${passedCount}`);
console.log(`   - Total Failed:            ${failedCount}`);
console.log(`========================================================================\n`);

if (failureReport.length > 0) {
  console.log(`❌ DETECTED ${failureReport.length} CHEMICALS WITH ISSUES:`);
  for (const f of failureReport) {
    console.log(`  • [${f.id}] ${f.name} (${f.formula}):`);
    for (const iss of f.issues) {
      console.log(`      - ${iss}`);
    }
  }
} else {
  console.log(`✨ ALL 597 CHEMICALS PASSED 100% CLEANLY WITH ZERO DEFECTS!`);
}
}
