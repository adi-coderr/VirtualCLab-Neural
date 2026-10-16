import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STANDARD_BOND_LENGTHS: Record<string, number> = {
  "H-H": 0.74, "C-H": 1.09, "N-H": 1.01, "O-H": 0.96, "F-H": 0.92,
  "Cl-H": 1.27, "Br-H": 1.41, "I-H": 1.61, "C-C": 1.54, "C=C": 1.34,
  "C#C": 1.20, "C-N": 1.47, "C=N": 1.28, "C#N": 1.16, "C-O": 1.43,
  "C=O": 1.22, "C#O": 1.13, "C-F": 1.35, "C-Cl": 1.77, "C-Br": 1.94,
  "C-I": 2.14, "C-S": 1.82, "C=S": 1.61, "N-O": 1.40, "N=O": 1.22,
  "N-N": 1.45, "N=N": 1.25, "N#N": 1.10, "O-O": 1.48, "O=O": 1.21,
  "S-O": 1.49, "S=O": 1.43, "S-S": 2.05, "P-O": 1.54, "P=O": 1.48,
  "P-Cl": 2.04, "Si-O": 1.63, "Si-C": 1.87, "Fe-O": 1.98, "Fe-Cl": 2.16,
  "Cu-O": 1.95, "Cu-Cl": 2.15, "Zn-O": 1.95, "Zn-Cl": 2.05, "Al-O": 1.85,
  "Al-Cl": 2.06, "Ag-Cl": 2.35, "Ag-O": 2.05, "Na-O": 1.85, "Na-Cl": 2.36,
  "K-Cl": 2.67, "Mg-Cl": 2.18, "Ca-O": 2.12, "Ba-Cl": 2.60,
};

const COVALENT_RADII_A: Record<string, number> = {
  H: 0.31, He: 0.28, Li: 1.28, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Ne: 0.58,
  Na: 1.66, Mg: 1.41, Al: 1.21, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02, Ar: 1.06,
  K: 2.03, Ca: 1.76, Sc: 1.70, Ti: 1.60, V: 1.53, Cr: 1.39, Mn: 1.39, Fe: 1.32,
  Co: 1.26, Ni: 1.24, Cu: 1.32, Zn: 1.22, Ga: 1.22, Ge: 1.20, As: 1.19, Se: 1.20,
  Br: 1.20, Kr: 1.16, Rb: 2.20, Sr: 1.95, Ag: 1.45, Cd: 1.44, In: 1.42, Sn: 1.39,
  Sb: 1.39, I: 1.39, Ba: 2.15, Pt: 1.36, Au: 1.36, Hg: 1.32, Pb: 1.46, Bi: 1.48,
};

interface AtomRecord {
  atom_index: number;
  element_symbol: string;
  x2d: number;
  y2d: number;
  x3d: number;
  y3d: number;
  z3d: number;
}

interface BondRow {
  id: number;
  chemical_id: string;
  atom_index_1: number;
  atom_index_2: number;
  bond_order: number;
  bond_type: string;
  bond_length: number | null;
  bond_angle: number | null;
  angle_label: string | null;
}

function calc3DAngle(origin: AtomRecord, p1: AtomRecord, p2: AtomRecord): number {
  let v1x = p1.x3d - origin.x3d;
  let v1y = p1.y3d - origin.y3d;
  let v1z = p1.z3d - origin.z3d;
  let v2x = p2.x3d - origin.x3d;
  let v2y = p2.y3d - origin.y3d;
  let v2z = p2.z3d - origin.z3d;

  let l1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
  let l2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);

  if (l1 < 0.05 || l2 < 0.05) {
    v1x = p1.x2d - origin.x2d;
    v1y = p1.y2d - origin.y2d;
    v1z = 0;
    v2x = p2.x2d - origin.x2d;
    v2y = p2.y2d - origin.y2d;
    v2z = 0;
    l1 = Math.hypot(v1x, v1y);
    l2 = Math.hypot(v2x, v2y);
  }
  if (l1 < 0.001 || l2 < 0.001) return 180.0;
  const denom = l1 * l2;
  if (denom < 1e-6 || isNaN(denom)) return 180.0;
  const dot = v1x * v2x + v1y * v2y + v1z * v2z;
  const cosTheta = Math.max(-1, Math.min(1, dot / denom));
  const deg = (Math.acos(cosTheta) * 180) / Math.PI;
  return isNaN(deg) ? 180.0 : deg;
}

function processDb(dbPath: string) {
  if (!fs.existsSync(dbPath)) return;
  console.log(`Processing database: ${dbPath}`);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  const chemicals = db.prepare("SELECT DISTINCT chemical_id FROM molecule_bonds").all() as { chemical_id: string }[];
  console.log(`Found ${chemicals.length} distinct chemicals in molecule_bonds.`);

  const updateStmt = db.prepare(`
    UPDATE molecule_bonds
    SET bond_length = ?, bond_angle = ?, angle_label = ?
    WHERE id = ?
  `);

  let updatedCount = 0;

  const tx = db.transaction(() => {
    for (const { chemical_id } of chemicals) {
      const atoms = db.prepare("SELECT * FROM molecule_atoms WHERE chemical_id = ? ORDER BY atom_index").all(chemical_id) as AtomRecord[];
      const atomMap = new Map<number, AtomRecord>();
      for (const a of atoms) {
        atomMap.set(a.atom_index, a);
      }

      const bonds = db.prepare("SELECT * FROM molecule_bonds WHERE chemical_id = ?").all(chemical_id) as BondRow[];

      for (const b of bonds) {
        let length = b.bond_length;
        let angle = b.bond_angle;
        let label = b.angle_label;

        const a1 = atomMap.get(b.atom_index_1);
        const a2 = atomMap.get(b.atom_index_2);

        // 1. Compute Length
        if (length === null || isNaN(length) || length <= 0) {
          if (a1 && a2) {
            const dx = a2.x3d - a1.x3d;
            const dy = a2.y3d - a1.y3d;
            const dz = a2.z3d - a1.z3d;
            const d3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d3d > 0.35 && d3d < 5.0 && !isNaN(d3d)) {
              length = Number(d3d.toFixed(2));
            } else {
              const orderSymbol = b.bond_order === 3 ? "#" : b.bond_order === 2 ? "=" : "-";
              const key1 = `${a1.element_symbol}${orderSymbol}${a2.element_symbol}`;
              const key2 = `${a2.element_symbol}${orderSymbol}${a1.element_symbol}`;
              const keySingle1 = `${a1.element_symbol}-${a2.element_symbol}`;
              const keySingle2 = `${a2.element_symbol}-${a1.element_symbol}`;

              if (STANDARD_BOND_LENGTHS[key1]) {
                length = STANDARD_BOND_LENGTHS[key1];
              } else if (STANDARD_BOND_LENGTHS[key2]) {
                length = STANDARD_BOND_LENGTHS[key2];
              } else if (STANDARD_BOND_LENGTHS[keySingle1]) {
                const factor = b.bond_order === 3 ? 0.78 : b.bond_order === 2 ? 0.88 : 1.0;
                length = Number((STANDARD_BOND_LENGTHS[keySingle1] * factor).toFixed(2));
              } else if (STANDARD_BOND_LENGTHS[keySingle2]) {
                const factor = b.bond_order === 3 ? 0.78 : b.bond_order === 2 ? 0.88 : 1.0;
                length = Number((STANDARD_BOND_LENGTHS[keySingle2] * factor).toFixed(2));
              } else {
                const r1 = COVALENT_RADII_A[a1.element_symbol] ?? 1.1;
                const r2 = COVALENT_RADII_A[a2.element_symbol] ?? 1.1;
                const orderFactor = b.bond_order === 3 ? 0.78 : b.bond_order === 2 ? 0.88 : 1.0;
                length = Number(((r1 + r2) * orderFactor).toFixed(2));
              }
            }
          }
          if (!length || isNaN(length) || length <= 0) {
            length = 1.48;
          }
        }

        // 2. Compute Angle
        if (angle === null || isNaN(angle) || angle <= 0 || !label) {
          if (a1 && a2) {
            const neighbors1: number[] = [];
            const neighbors2: number[] = [];
            for (const other of bonds) {
              if (other.id === b.id) continue;
              if (other.atom_index_1 === b.atom_index_1 && other.atom_index_2 !== b.atom_index_2) {
                neighbors1.push(other.atom_index_2);
              } else if (other.atom_index_2 === b.atom_index_1 && other.atom_index_1 !== b.atom_index_2) {
                neighbors1.push(other.atom_index_1);
              }
              if (other.atom_index_1 === b.atom_index_2 && other.atom_index_2 !== b.atom_index_1) {
                neighbors2.push(other.atom_index_2);
              } else if (other.atom_index_2 === b.atom_index_2 && other.atom_index_1 !== b.atom_index_1) {
                neighbors2.push(other.atom_index_1);
              }
            }

            if (neighbors1.length > 0 && atomMap.get(neighbors1[0]!)) {
              const nAtom = atomMap.get(neighbors1[0]!)!;
              const rawAngle = calc3DAngle(a1, nAtom, a2);
              angle = Number((isNaN(rawAngle) ? 109.5 : rawAngle).toFixed(1));
              label = `${nAtom.element_symbol}–${a1.element_symbol}–${a2.element_symbol}`;
            } else if (neighbors2.length > 0 && atomMap.get(neighbors2[0]!)) {
              const nAtom = atomMap.get(neighbors2[0]!)!;
              const rawAngle = calc3DAngle(a2, a1, nAtom);
              angle = Number((isNaN(rawAngle) ? 109.5 : rawAngle).toFixed(1));
              label = `${a1.element_symbol}–${a2.element_symbol}–${nAtom.element_symbol}`;
            } else {
              angle = 180.0;
              label = "linear";
            }
          } else {
            angle = 180.0;
            label = "linear";
          }
        }

        updateStmt.run(length, angle, label, b.id);
        updatedCount++;
      }
    }
  });

  tx();
  console.log(`Successfully verified and updated ${updatedCount} bonds in ${dbPath}.`);
  db.close();
}

const dbPaths = [
  path.resolve(__dirname, "../data/chemlab.db"),
  path.resolve(__dirname, "../../data/chemlab.db"),
];

for (const p of dbPaths) {
  processDb(p);
}
console.log("Completed all curated database bond enrichments!");
