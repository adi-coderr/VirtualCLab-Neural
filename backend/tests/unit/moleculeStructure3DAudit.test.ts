import { describe, it, expect } from "vitest";
import { SEED_CHEMICALS } from "../../src/data/seed/chemicals.js";
import { generateMoleculeStructure } from "../../src/chemistry-engine/moleculeStructureGenerator.js";
import { parseFormula } from "../../src/chemistry-engine/formulaParser.js";

describe("3D Molecule Structure Audit", () => {
  it("generates valid, collision-free 3D geometries for all seed chemicals", () => {
    let checkedCount = 0;
    const errors: string[] = [];

    for (const chem of SEED_CHEMICALS) {
      const comp = parseFormula(chem.formula).composition;
      const struct = generateMoleculeStructure(chem.id, chem.formula, comp, chem.commonName);

      if (!struct || !struct.atoms || struct.atoms.length === 0) {
        continue;
      }
      checkedCount++;

      // 1. Verify atom coordinates are finite numbers
      for (const a of struct.atoms) {
        if (!Number.isFinite(a.x3d) || !Number.isFinite(a.y3d) || !Number.isFinite(a.z3d)) {
          errors.push(`${chem.id}: Non-finite 3D coordinate for atom ${a.atomIndex} (${a.element})`);
        }
      }

      // 2. Check for overlapping atoms (distance < 0.65 Å)
      for (let i = 0; i < struct.atoms.length; i++) {
        for (let j = i + 1; j < struct.atoms.length; j++) {
          const a1 = struct.atoms[i]!;
          const a2 = struct.atoms[j]!;
          const dist = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
          if (dist < 0.65) {
            errors.push(
              `${chem.id} (${chem.formula}): Overlap between ${a1.element}[${i}] and ${a2.element}[${j}] (dist: ${dist.toFixed(3)} Å)`
            );
          }
        }
      }

      // 3. Check bond lengths and indices
      for (const b of struct.bonds) {
        if (b.atomIndex1 < 0 || b.atomIndex1 >= struct.atoms.length) {
          errors.push(`${chem.id}: Invalid atomIndex1 ${b.atomIndex1}`);
        }
        if (b.atomIndex2 < 0 || b.atomIndex2 >= struct.atoms.length) {
          errors.push(`${chem.id}: Invalid atomIndex2 ${b.atomIndex2}`);
        }
        if (b.atomIndex1 === b.atomIndex2) {
          errors.push(`${chem.id}: Self-referential bond on atom ${b.atomIndex1}`);
        }

        const a1 = struct.atoms[b.atomIndex1];
        const a2 = struct.atoms[b.atomIndex2];
        if (a1 && a2) {
          const d = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
          if (b.type === "covalent" && (d < 0.70 || d > 2.50)) {
            errors.push(
              `${chem.id} (${chem.formula}): Unphysical covalent bond length ${d.toFixed(3)} Å between ${a1.element}[${b.atomIndex1}] and ${a2.element}[${b.atomIndex2}]`
            );
          }
        }
      }
    }

    expect(checkedCount).toBeGreaterThan(400);
    expect(errors).toEqual([]);
  });

  it("handles complex multi-carbon oxygenated organics with valid 3D backbones", () => {
    const testCases = [
      { id: "ch3coch3", formula: "CH3COCH3", name: "Acetone" },
      { id: "c3h8o", formula: "C3H8O", name: "Propanol" },
      { id: "c4h10o", formula: "C4H10O", name: "Butanol" },
      { id: "c4h8o", formula: "C4H8O", name: "Tetrahydrofuran" },
      { id: "c6h6o", formula: "C6H6O", name: "Phenol" },
    ];

    for (const tc of testCases) {
      const comp = parseFormula(tc.formula).composition;
      const struct = generateMoleculeStructure(tc.id, tc.formula, comp, tc.name);
      expect(struct.atoms.length).toBeGreaterThan(5);

      for (let i = 0; i < struct.atoms.length; i++) {
        for (let j = i + 1; j < struct.atoms.length; j++) {
          const a1 = struct.atoms[i]!;
          const a2 = struct.atoms[j]!;
          const dist = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
          expect(dist).toBeGreaterThan(0.70);
        }
      }
    }
  });

  it("handles coordination complexes and poly-oxoanion salts without collisions", () => {
    const testCases = [
      { id: "co-nh3-6-cl3", formula: "[Co(NH3)6]Cl3", name: "Hexamminecobalt(III) chloride" },
      { id: "cr2-so4-3", formula: "Cr2(SO4)3", name: "Chromium(III) sulfate" },
      { id: "fe2-so4-3", formula: "Fe2(SO4)3", name: "Iron(III) sulfate" },
      { id: "al2-so4-3", formula: "Al2(SO4)3", name: "Aluminium sulfate" },
    ];

    for (const tc of testCases) {
      const comp = parseFormula(tc.formula).composition;
      const struct = generateMoleculeStructure(tc.id, tc.formula, comp, tc.name);
      expect(struct.atoms.length).toBeGreaterThan(10);

      for (let i = 0; i < struct.atoms.length; i++) {
        for (let j = i + 1; j < struct.atoms.length; j++) {
          const a1 = struct.atoms[i]!;
          const a2 = struct.atoms[j]!;
          const dist = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
          expect(dist).toBeGreaterThan(0.70);
        }
      }
    }
  });

  it("handles oxoacids and oxosalts with authentic bond distances and no H/Metal clashes", () => {
    const testCases = [
      { id: "h2so4", formula: "H2SO4", name: "Sulfuric acid" },
      { id: "hno3", formula: "HNO3", name: "Nitric acid" },
      { id: "h3po4", formula: "H3PO4", name: "Phosphoric acid" },
      { id: "na2so4", formula: "Na2SO4", name: "Sodium sulfate" },
      { id: "nahco3", formula: "NaHCO3", name: "Sodium bicarbonate" },
      { id: "kmno4", formula: "KMnO4", name: "Potassium permanganate" },
      { id: "na3po4", formula: "Na3PO4", name: "Trisodium phosphate" },
    ];

    for (const tc of testCases) {
      const comp = parseFormula(tc.formula).composition;
      const struct = generateMoleculeStructure(tc.id, tc.formula, comp, tc.name);
      expect(struct.atoms.length).toBeGreaterThan(4);

      for (let i = 0; i < struct.atoms.length; i++) {
        for (let j = i + 1; j < struct.atoms.length; j++) {
          const a1 = struct.atoms[i]!;
          const a2 = struct.atoms[j]!;
          const dist = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
          expect(dist, `Collision between ${a1.element} and ${a2.element} in ${tc.id}`).toBeGreaterThan(0.70);
        }
      }
    }
  });

  it("handles disconnected SMILES salts with authentic 3D ionic coordination and no floating ions", () => {
    const testCases = [
      { id: "nacl", formula: "NaCl", smiles: "[Na+].[Cl-]", name: "Sodium chloride" },
      { id: "naoh", formula: "NaOH", smiles: "[Na+].[OH-]", name: "Sodium hydroxide" },
      { id: "agno3", formula: "AgNO3", smiles: "[Ag+].[O-][N+](=O)[O-]", name: "Silver nitrate" },
      { id: "nano3", formula: "NaNO3", smiles: "[N+](=O)([O-])[O-].[Na+]", name: "Sodium nitrate" },
      { id: "mgcl2", formula: "MgCl2", smiles: "[Cl-].[Mg+2].[Cl-]", name: "Magnesium chloride" },
      { id: "cacl2", formula: "CaCl2", smiles: "[Cl-].[Ca+2].[Cl-]", name: "Calcium chloride" },
      { id: "alcl3", formula: "AlCl3", smiles: "[Cl-].[Al+3].[Cl-].[Cl-]", name: "Aluminium chloride" },
      { id: "na2so4", formula: "Na2SO4", smiles: "S(=O)(=O)([O-])[O-].[Na+].[Na+]", name: "Sodium sulfate" },
      { id: "na2co3", formula: "Na2CO3", smiles: "C([O-])([O-])=O.[Na+].[Na+]", name: "Sodium carbonate" },
      { id: "k3po4", formula: "K3PO4", smiles: "P(=O)([O-])([O-])[O-].[K+].[K+].[K+]", name: "Tripotassium phosphate" },
      { id: "sodium-acetate", formula: "CH3COONa", smiles: "C(C)(=O)[O-].[Na+]", name: "Sodium acetate" },
    ];

    for (const tc of testCases) {
      const comp = parseFormula(tc.formula).composition;
      const struct = generateMoleculeStructure(tc.id, tc.formula, comp, tc.name, tc.smiles);
      expect(struct.atoms.length).toBeGreaterThanOrEqual(2);

      const bondedAtoms = new Set<number>();
      for (const b of struct.bonds) {
        bondedAtoms.add(b.atomIndex1);
        bondedAtoms.add(b.atomIndex2);
        const a1 = struct.atoms[b.atomIndex1]!;
        const a2 = struct.atoms[b.atomIndex2]!;
        const d = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
        expect(d, `Unphysical bond ${b.atomIndex1}-${b.atomIndex2} in ${tc.id}`).toBeLessThanOrEqual(2.65);
        expect(d, `Unphysical bond ${b.atomIndex1}-${b.atomIndex2} in ${tc.id}`).toBeGreaterThanOrEqual(0.70);
      }
      for (const a of struct.atoms) {
        expect(bondedAtoms.has(a.atomIndex), `Isolated unbonded atom ${a.element}[${a.atomIndex}] in ${tc.id}`).toBe(true);
      }

      for (let i = 0; i < struct.atoms.length; i++) {
        for (let j = i + 1; j < struct.atoms.length; j++) {
          const a1 = struct.atoms[i]!;
          const a2 = struct.atoms[j]!;
          const dist = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
          expect(dist, `Collision between ${a1.element} and ${a2.element} in ${tc.id}`).toBeGreaterThan(0.65);
        }
      }
    }
  });
});

