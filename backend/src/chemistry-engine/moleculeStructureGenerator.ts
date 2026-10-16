import type { ElementComposition, MoleculeStructure, AtomRecord, BondRecord } from "./types.js";
import { parseFormula } from "./formulaParser.js";

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
function createSeededRandom(seedStr: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let s = h >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard maximum valence capacity */
const ELEMENT_MAX_VALENCE: Record<string, number> = {
  H: 1,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  O: 2,
  S: 6,
  N: 3,
  P: 5,
  C: 4,
  Si: 4,
  B: 3,
  Li: 1,
  Na: 1,
  K: 1,
  Rb: 1,
  Cs: 1,
  Mg: 2,
  Ca: 2,
  Sr: 2,
  Ba: 2,
  Al: 3,
  Ga: 3,
  In: 3,
  Tl: 3,
  Fe: 3,
  Cu: 2,
  Zn: 2,
  Cd: 2,
  Ni: 2,
  Co: 3,
  Mn: 7,
  Cr: 6,
  Ti: 4,
  Zr: 4,
  Sn: 4,
  Pb: 4,
  Bi: 3,
  Ag: 1,
  Pt: 4,
  Pd: 4,
};

/** Complete periodic table two-letter elements set for accurate SMILES parsing */
const ALL_TWO_LETTER_ELEMENTS = new Set([
  "He", "Li", "Be", "Ne", "Na", "Mg", "Al", "Si", "Cl", "Ar",
  "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu",
  "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Zr",
  "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn",
  "Sb", "Te", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm",
  "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu",
  "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl",
  "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th", "Pa", "U",
]);

/** Accurate covalent bond lengths (in Angstroms) based on experimental crystallographic data */
const BOND_LENGTHS: Record<string, number> = {
  "C-C": 1.54,
  "C=C": 1.34,
  "C#C": 1.20,
  "C:C": 1.39, // aromatic bond
  "C-N": 1.47,
  "C=N": 1.28,
  "C#N": 1.16,
  "C:N": 1.34, // aromatic pyridine bond
  "C-O": 1.43,
  "C=O": 1.22,
  "C-S": 1.82,
  "C=S": 1.61,
  "C-F": 1.35,
  "C-Cl": 1.77,
  "C-Br": 1.94,
  "C-I": 2.14,
  "C-H": 1.09,
  "N-H": 1.01,
  "O-H": 0.96,
  "S-H": 1.34,
  "S-O": 1.49,
  "S=O": 1.43,
  "P-O": 1.54,
  "P=O": 1.48,
  "N-O": 1.40,
  "N=O": 1.22,
  "B-F": 1.31,
  "S-F": 1.56,
  "P-Cl": 2.04,
  "Fe-Cl": 2.16,
  "Cu-O": 1.95,
  "Al-Cl": 2.06,
  "Si-O": 1.63,
  "Si-C": 1.87,
  "H-H": 0.74,
  "O-O": 1.48,
  "O=O": 1.21,
  "N-N": 1.45,
  "N=N": 1.25,
  "N#N": 1.10,
  "Fe-O": 1.98,
  "Al-O": 1.85,
  "Zn-O": 1.95,
  "Ti-O": 1.82,
  "Mn-O": 1.90,
  "Cr-O": 1.88,
  "Pb-O": 2.15,
  "Bi-O": 2.10,
  "Ag-O": 2.05,
  "Sn-O": 2.05,
  "Cu-Cl": 2.15,
  "Pb-Cl": 2.45,
  "Pb-I": 2.55,
  "Bi-Cl": 2.48,
  "Sn-Cl": 2.30,
  "Ti-Cl": 2.18,
  "Zn-Cl": 2.05,
  "Ag-Cl": 2.35,
  "Fe-S": 2.20,
  "Cu-S": 2.15,
  "Zn-S": 2.25,
  "Pb-S": 2.50,
  "Ag-S": 2.45,
};

function getBondDistance(e1: string, e2: string, order: 1 | 2 | 3 | 1.5 = 1): number {
  const sym = order === 3 ? "#" : order === 2 ? "=" : order === 1.5 ? ":" : "-";
  const k1 = `${e1}${sym}${e2}`;
  const k2 = `${e2}${sym}${e1}`;
  if (BOND_LENGTHS[k1]) return BOND_LENGTHS[k1];
  if (BOND_LENGTHS[k2]) return BOND_LENGTHS[k2];

  const single1 = `${e1}-${e2}`;
  const single2 = `${e2}-${e1}`;
  const base = BOND_LENGTHS[single1] ?? BOND_LENGTHS[single2] ?? 1.5;
  if (order === 2) return base * 0.88;
  if (order === 3) return base * 0.78;
  if (order === 1.5) return base * 0.91;
  return base;
}

/** Standard van der Waals radii in Angstroms */
const VDW_RADII: Record<string, number> = {
  H: 1.20,
  C: 1.70,
  N: 1.55,
  O: 1.52,
  F: 1.47,
  P: 1.80,
  S: 1.80,
  Cl: 1.75,
  Br: 1.85,
  I: 1.98,
  Na: 2.27,
  K: 2.75,
  Ca: 2.31,
  Mg: 1.73,
  Fe: 2.00,
  Cu: 2.00,
  Zn: 2.01,
  Ag: 2.10,
  Ba: 2.68,
  Pb: 2.02,
};

function getVdwRadius(element: string): number {
  return VDW_RADII[element] ?? 1.70;
}

// -----------------------------------------------------------------------------
// Vector 3D Utilities
// -----------------------------------------------------------------------------

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function vDist(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function vNormalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1e-6;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vCross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// -----------------------------------------------------------------------------
// 1. SMILES-to-Graph & Kekulization Parser
// -----------------------------------------------------------------------------

interface SmilesNode {
  idx: number;
  elem: string;
  charge: number;
  isAromatic: boolean;
  explicitH: number | null;
  edges: { target: number; order: 1 | 2 | 3 | 1.5 }[];
}

function parseSmilesToGraph(smiles: string): SmilesNode[] {
  const nodes: SmilesNode[] = [];
  const ringMap: Record<number, { nodeIdx: number; order: 1 | 2 | 3 | 1.5 }> = {};
  const branchStack: number[] = [];
  let currentIdx = -1;
  let nextOrder: 1 | 2 | 3 | 1.5 = 1;

  let i = 0;
  while (i < smiles.length) {
    const ch = smiles[i]!;

    if (ch === ".") {
      currentIdx = -1;
      nextOrder = 1;
      i++;
      continue;
    }

    if (ch === "(") {
      branchStack.push(currentIdx);
      i++;
      continue;
    }

    if (ch === ")") {
      currentIdx = branchStack.pop() ?? -1;
      i++;
      continue;
    }

    if (ch === "-") {
      nextOrder = 1;
      i++;
      continue;
    }
    if (ch === "=") {
      nextOrder = 2;
      i++;
      continue;
    }
    if (ch === "#") {
      nextOrder = 3;
      i++;
      continue;
    }
    if (ch === ":") {
      nextOrder = 1.5;
      i++;
      continue;
    }
    if (ch === "/" || ch === "\\") {
      nextOrder = 1;
      i++;
      continue;
    }

    // Ring closure: digit or %number
    if (/[0-9]/.test(ch) || ch === "%") {
      let r = 0;
      if (ch === "%") {
        const numMatch = smiles.slice(i + 1).match(/^[0-9]+/);
        if (numMatch) {
          r = parseInt(numMatch[0]!, 10);
          i += 1 + numMatch[0]!.length;
        } else {
          i++;
          continue;
        }
      } else {
        r = parseInt(ch, 10);
        i++;
      }

      if (ringMap[r] !== undefined) {
        const other = ringMap[r]!;
        delete ringMap[r];
        if (currentIdx >= 0 && currentIdx !== other.nodeIdx) {
          const uNode = nodes[currentIdx]!;
          const vNode = nodes[other.nodeIdx]!;
          const isArom = uNode.isAromatic && vNode.isAromatic;
          const order = other.order !== 1 ? other.order : isArom ? 1.5 : 1;
          uNode.edges.push({ target: other.nodeIdx, order });
          vNode.edges.push({ target: currentIdx, order });
        }
      } else if (currentIdx >= 0) {
        ringMap[r] = { nodeIdx: currentIdx, order: nextOrder };
        nextOrder = 1;
      }
      continue;
    }

    // Bracketed atom: [Na+], [OH-], [N+](=O)[O-], [nH], [NH4+], [BH4-], etc.
    if (ch === "[") {
      const end = smiles.indexOf("]", i);
      if (end !== -1) {
        const inner = smiles.slice(i + 1, end);
        const match = inner.match(/^(?:([0-9]+))?([A-Z][a-z]?|[a-z])(@+)?(?:H([0-9]*))?([+-][0-9]*|[0-9]*[+-])?$/);
        const raw = match ? match[2]! : "C";
        const isAromatic = raw === raw.toLowerCase() && raw.length === 1;
        const elem = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        let charge = 0;
        if (match && match[5]) {
          const c = match[5];
          if (c === "+") charge = 1;
          else if (c === "-") charge = -1;
          else if (c.endsWith("+")) charge = parseInt(c, 10) || 1;
          else if (c.endsWith("-")) charge = -(parseInt(c, 10) || 1);
          else charge = parseInt(c, 10) || 0;
        }
        let explicitH: number | null = null;
        if (match && match[4] !== undefined) {
          explicitH = match[4] === "" ? 1 : parseInt(match[4], 10) || 0;
        } else {
          // OpenSMILES standard: Bracketed atoms without explicit H have 0 implicit hydrogens
          explicitH = 0;
        }

        const idx = nodes.length;
        nodes.push({ idx, elem, charge, isAromatic, explicitH, edges: [] });
        if (currentIdx >= 0) {
          const prev = nodes[currentIdx]!;
          const isArom = isAromatic && prev.isAromatic;
          const order = nextOrder !== 1 ? nextOrder : isArom ? 1.5 : 1;
          prev.edges.push({ target: idx, order });
          nodes[idx]!.edges.push({ target: currentIdx, order: prev.edges[prev.edges.length - 1]!.order });
        }
        currentIdx = idx;
        nextOrder = 1;
        i = end + 1;
        continue;
      }
    }

    // Aromatic or standard multi/single-letter atoms
    let elem = "";
    let isAromatic = false;
    const two = smiles.slice(i, i + 2);
    if (ALL_TWO_LETTER_ELEMENTS.has(two)) {
      elem = two;
      i += 2;
    } else if (/[a-z]/.test(ch)) {
      // Lowercase aromatic atom: c, n, o, s, p
      elem = ch.toUpperCase();
      isAromatic = true;
      i++;
    } else if (/[A-Z]/.test(ch)) {
      elem = ch;
      i++;
    }

    if (elem) {
      const idx = nodes.length;
      nodes.push({ idx, elem, charge: 0, isAromatic, explicitH: null, edges: [] });
      if (currentIdx >= 0) {
        const prev = nodes[currentIdx]!;
        const isArom = isAromatic && prev.isAromatic;
        const order = nextOrder !== 1 ? nextOrder : isArom ? 1.5 : 1;
        prev.edges.push({ target: idx, order });
        nodes[idx]!.edges.push({ target: currentIdx, order });
      }
      currentIdx = idx;
      nextOrder = 1;
    } else {
      i++;
    }
  }

  return nodes;
}

// -----------------------------------------------------------------------------
// 2. Hybridization & Geometry Detection
// -----------------------------------------------------------------------------

type Hybridization = "SP" | "SP2" | "SP3";

function getHybridization(node: SmilesNode): Hybridization {
  if (node.isAromatic) return "SP2";

  let maxOrder = 1;
  let doubleCount = 0;
  for (const e of node.edges) {
    if (e.order === 3) maxOrder = 3;
    if (e.order === 2) {
      if (maxOrder < 2) maxOrder = 2;
      doubleCount++;
    }
    if (e.order === 1.5) maxOrder = 2;
  }

  // Linear: C#C, C#N, or allene =C=
  if (maxOrder === 3 || doubleCount >= 2) return "SP";
  // Trigonal planar: C=C, C=O, aromatic
  if (maxOrder === 2) return "SP2";
  // Tetrahedral
  return "SP3";
}

function getImplicitValence(elem: string, usedV: number): number {
  if (elem === "C" || elem === "Si") return 4;
  if (elem === "N") return 3;
  if (elem === "O") return 2;
  if (elem === "S") {
    if (usedV > 4) return 6;
    if (usedV > 2) return 4;
    return 2;
  }
  if (elem === "P") {
    if (usedV > 3) return 5;
    return 3;
  }
  if (["F", "Cl", "Br", "I", "H"].includes(elem)) return 1;
  if (elem === "B") return 3;
  return 0; // Metals and all other elements have 0 implicit hydrogens in SMILES
}

// -----------------------------------------------------------------------------
// 3. Ring Detection & Perimeter Ordering
// -----------------------------------------------------------------------------

function findRings(nodes: SmilesNode[]): number[][] {
  const rings: number[][] = [];
  const visited = new Set<string>();

  function dfs(start: number, curr: number, path: number[]) {
    if (path.length > 7) return;
    for (const edge of nodes[curr]!.edges) {
      const nxt = edge.target;
      if (nxt === start && path.length >= 3) {
        const sorted = [...path].sort((a, b) => a - b).join("-");
        if (!visited.has(sorted)) {
          visited.add(sorted);
          rings.push([...path]);
        }
      } else if (!path.includes(nxt) && path.length < 6) {
        dfs(start, nxt, [...path, nxt]);
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    dfs(i, i, [i]);
  }

  return rings;
}

function orderRingPerimeter(ring: number[], nodes: SmilesNode[]): number[] {
  const ringSet = new Set(ring);
  // Prefer starting at a substituted carbon (has neighbor outside ring)
  let startIdx = ring[0]!;
  for (const idx of ring) {
    if (nodes[idx]!.edges.some((e) => !ringSet.has(e.target))) {
      startIdx = idx;
      break;
    }
  }

  const ordered: number[] = [startIdx];
  while (ordered.length < ring.length) {
    const curr = ordered[ordered.length - 1]!;
    const neighbors = nodes[curr]!.edges
      .map((e) => e.target)
      .filter((target) => ringSet.has(target) && !ordered.includes(target));
    if (neighbors.length === 0) break;
    ordered.push(neighbors[0]!);
  }
  return ordered.length === ring.length ? ordered : ring;
}

function isAromatic6Ring(ring: number[], nodes: SmilesNode[]): boolean {
  if (ring.length !== 6) return false;
  if (ring.some((idx) => nodes[idx]!.isAromatic)) return true;
  let doubleBondCount = 0;
  const ringSet = new Set(ring);
  for (const idx of ring) {
    for (const edge of nodes[idx]!.edges) {
      if (ringSet.has(edge.target) && (edge.order === 2 || edge.order === 1.5)) {
        doubleBondCount++;
      }
    }
  }
  return doubleBondCount >= 3;
}

function hasPathToPlaced(ring: number[], nodes: SmilesNode[], placed: Set<number>): boolean {
  if (placed.size === 0) return false;
  const visited = new Set<number>(ring);
  const q = [...ring];
  while (q.length > 0) {
    const curr = q.shift()!;
    for (const edge of nodes[curr]!.edges) {
      if (placed.has(edge.target)) return true;
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        q.push(edge.target);
      }
    }
  }
  return false;
}

function placeConnected6Ring(
  ring: number[],
  attachInRing: number,
  attachPlaced: number,
  graph: SmilesNode[],
  coords: Vec3[],
  placed: Set<number>,
  aromaticRingAtoms: Set<number>,
  aromaticRingOutward: Map<number, Vec3>,
  ringIndex: number = 0
): void {
  const isArom = isAromatic6Ring(ring, graph);
  const radius = 1.39;
  const pPos = coords[attachPlaced]!;
  const uNode = graph[attachPlaced]!;
  const vNode = graph[attachInRing]!;
  const edge = uNode.edges.find((e) => e.target === attachInRing);
  const bondDist = getBondDistance(uNode.elem, vNode.elem, edge?.order ?? 1);

  let outDir: Vec3;
  if (aromaticRingOutward.has(attachPlaced)) {
    outDir = aromaticRingOutward.get(attachPlaced)!;
  } else {
    const otherNeighbors = uNode.edges.filter((e) => e.target !== attachInRing && placed.has(e.target) && coords[e.target]);
    if (otherNeighbors.length === 1) {
      const nPos = coords[otherNeighbors[0]!.target]!;
      const v = { x: pPos.x - nPos.x, y: pPos.y - nPos.y, z: pPos.z - nPos.z };
      outDir = vNormalize(v);
    } else if (otherNeighbors.length >= 2) {
      let sumNgh = { x: 0, y: 0, z: 0 };
      for (const n of otherNeighbors) {
        sumNgh.x += coords[n.target]!.x;
        sumNgh.y += coords[n.target]!.y;
        sumNgh.z += coords[n.target]!.z;
      }
      sumNgh.x /= otherNeighbors.length;
      sumNgh.y /= otherNeighbors.length;
      sumNgh.z /= otherNeighbors.length;
      const v = { x: pPos.x - sumNgh.x, y: pPos.y - sumNgh.y, z: pPos.z - sumNgh.z };
      const vLen = Math.hypot(v.x, v.y, v.z);
      if (vLen > 0.3) {
        outDir = { x: v.x / vLen, y: v.y / vLen, z: v.z / vLen };
      } else {
        const n1 = coords[otherNeighbors[0]!.target]!;
        const v1 = vNormalize({ x: n1.x - pPos.x, y: n1.y - pPos.y, z: n1.z - pPos.z });
        const ref = Math.abs(v1.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
        outDir = vNormalize(vCross(v1, ref));
      }
    } else {
      outDir = { x: 1, y: 0, z: 0 };
    }
  }

  // 3D twist: alternate twist angle so attached and adjacent rings form non-clashing propeller geometry
  const twistAngle = ((ringIndex % 2 === 0 ? 35 : -35) * Math.PI) / 180;
  const uBond = vNormalize(outDir);
  let refUp = Math.abs(uBond.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  const vPerp = vNormalize(vCross(uBond, refUp));
  const wNorm = vNormalize(vCross(vPerp, uBond));
  const vPrime = {
    x: vPerp.x * Math.cos(twistAngle) + wNorm.x * Math.sin(twistAngle),
    y: vPerp.y * Math.cos(twistAngle) + wNorm.y * Math.sin(twistAngle),
    z: vPerp.z * Math.cos(twistAngle) + wNorm.z * Math.sin(twistAngle),
  };

  const center = {
    x: pPos.x + (bondDist + radius) * uBond.x,
    y: pPos.y + (bondDist + radius) * uBond.y,
    z: pPos.z + (bondDist + radius) * uBond.z,
  };

  const startK = ring.indexOf(attachInRing);
  for (let k = 0; k < 6; k++) {
    const idx = ring[(startK + k) % 6]!;
    const theta = (k * 2 * Math.PI) / 6;
    const dirX = -Math.cos(theta) * uBond.x + Math.sin(theta) * vPrime.x;
    const dirY = -Math.cos(theta) * uBond.y + Math.sin(theta) * vPrime.y;
    const dirZ = -Math.cos(theta) * uBond.z + Math.sin(theta) * vPrime.z;

    const x = center.x + radius * dirX;
    const y = center.y + radius * dirY;
    const z = center.z + radius * dirZ;

    coords[idx] = { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), z: Number(z.toFixed(3)) };
    placed.add(idx);
    if (isArom) {
      aromaticRingAtoms.add(idx);
      aromaticRingOutward.set(idx, { x: dirX, y: dirY, z: dirZ });
    }
  }
}

function placeConnected5Ring(
  ring: number[],
  attachInRing: number,
  attachPlaced: number,
  graph: SmilesNode[],
  coords: Vec3[],
  placed: Set<number>,
  aromaticRingAtoms: Set<number>,
  aromaticRingOutward: Map<number, Vec3>,
  ringIndex: number = 0
): void {
  const isArom = ring.every((idx) => graph[idx]!.isAromatic);
  const radius = 1.25;
  const pPos = coords[attachPlaced]!;
  const uNode = graph[attachPlaced]!;
  const vNode = graph[attachInRing]!;
  const edge = uNode.edges.find((e) => e.target === attachInRing);
  const bondDist = getBondDistance(uNode.elem, vNode.elem, edge?.order ?? 1);

  let outDir: Vec3;
  if (aromaticRingOutward.has(attachPlaced)) {
    outDir = aromaticRingOutward.get(attachPlaced)!;
  } else {
    const otherNeighbors = uNode.edges.filter((e) => e.target !== attachInRing && placed.has(e.target) && coords[e.target]);
    if (otherNeighbors.length === 1) {
      const nPos = coords[otherNeighbors[0]!.target]!;
      const v = { x: pPos.x - nPos.x, y: pPos.y - nPos.y, z: pPos.z - nPos.z };
      outDir = vNormalize(v);
    } else if (otherNeighbors.length >= 2) {
      let sumNgh = { x: 0, y: 0, z: 0 };
      for (const n of otherNeighbors) {
        sumNgh.x += coords[n.target]!.x;
        sumNgh.y += coords[n.target]!.y;
        sumNgh.z += coords[n.target]!.z;
      }
      sumNgh.x /= otherNeighbors.length;
      sumNgh.y /= otherNeighbors.length;
      sumNgh.z /= otherNeighbors.length;
      const v = { x: pPos.x - sumNgh.x, y: pPos.y - sumNgh.y, z: pPos.z - sumNgh.z };
      const vLen = Math.hypot(v.x, v.y, v.z);
      if (vLen > 0.3) {
        outDir = { x: v.x / vLen, y: v.y / vLen, z: v.z / vLen };
      } else {
        const n1 = coords[otherNeighbors[0]!.target]!;
        const v1 = vNormalize({ x: n1.x - pPos.x, y: n1.y - pPos.y, z: n1.z - pPos.z });
        const ref = Math.abs(v1.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
        outDir = vNormalize(vCross(v1, ref));
      }
    } else {
      outDir = { x: 1, y: 0, z: 0 };
    }
  }

  const twistAngle = ((ringIndex % 2 === 0 ? 30 : -30) * Math.PI) / 180;
  const uBond = vNormalize(outDir);
  let refUp = Math.abs(uBond.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  const vPerp = vNormalize(vCross(uBond, refUp));
  const wNorm = vNormalize(vCross(vPerp, uBond));
  const vPrime = {
    x: vPerp.x * Math.cos(twistAngle) + wNorm.x * Math.sin(twistAngle),
    y: vPerp.y * Math.cos(twistAngle) + wNorm.y * Math.sin(twistAngle),
    z: vPerp.z * Math.cos(twistAngle) + wNorm.z * Math.sin(twistAngle),
  };

  const center = {
    x: pPos.x + (bondDist + radius) * uBond.x,
    y: pPos.y + (bondDist + radius) * uBond.y,
    z: pPos.z + (bondDist + radius) * uBond.z,
  };

  const startK = ring.indexOf(attachInRing);
  for (let k = 0; k < 5; k++) {
    const idx = ring[(startK + k) % 5]!;
    const theta = (k * 2 * Math.PI) / 5;
    const dirX = -Math.cos(theta) * uBond.x + Math.sin(theta) * vPrime.x;
    const dirY = -Math.cos(theta) * uBond.y + Math.sin(theta) * vPrime.y;
    const dirZ = -Math.cos(theta) * uBond.z + Math.sin(theta) * vPrime.z;

    const x = center.x + radius * dirX;
    const y = center.y + radius * dirY;
    const z = center.z + radius * dirZ;

    coords[idx] = { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), z: Number(z.toFixed(3)) };
    placed.add(idx);
    if (isArom) {
      aromaticRingAtoms.add(idx);
      aromaticRingOutward.set(idx, { x: dirX, y: dirY, z: dirZ });
    }
  }
}

// -----------------------------------------------------------------------------
// 4. Comprehensive 3D Molecular Layout from SMILES Graph
// -----------------------------------------------------------------------------

function generateFromSmiles(smiles: string, rng: () => number): MoleculeStructure | null {
  const graph = parseSmilesToGraph(smiles);
  if (graph.length === 0) return null;

  const coords: Vec3[] = new Array(graph.length);
  const placed = new Set<number>();
  const aromaticRingAtoms = new Set<number>();
  const aromaticRingOutward = new Map<number, Vec3>();
  let placedRingCount = 0;

  // 1. Detect rings and iteratively lay out isolated and fused 6- and 5-membered rings
  const rings = findRings(graph);
  let ringProgress = true;
  let loopCount = 0;
  while (ringProgress && loopCount < 10) {
    ringProgress = false;
    loopCount++;

    for (const rawRing of rings) {
      if (rawRing.length === 6) {
        const unplaced = rawRing.filter((idx) => !placed.has(idx));
        const isArom = isAromatic6Ring(rawRing, graph);
        const ring = orderRingPerimeter(rawRing, graph);
        const radius = 1.39; // Ångströms

        if (unplaced.length === 6) {
          // Check if any atom in this ring is connected to an already-placed atom
          let attachInRing = -1;
          let attachPlaced = -1;
          for (const idx of ring) {
            const edge = graph[idx]!.edges.find((e) => placed.has(e.target) && coords[e.target]);
            if (edge) {
              attachInRing = idx;
              attachPlaced = edge.target;
              break;
            }
          }

          if (attachInRing >= 0 && attachPlaced >= 0) {
            placeConnected6Ring(ring, attachInRing, attachPlaced, graph, coords, placed, aromaticRingAtoms, aromaticRingOutward, placedRingCount++);
            ringProgress = true;
          } else if (!hasPathToPlaced(rawRing, graph, placed)) {
            // Truly unplaced isolated 6-ring: place at origin or offset
            const centerOffsetX = placed.size > 0 ? Math.max(...Array.from(placed).map((idx) => coords[idx]?.x ?? 0)) + 3.0 : 0;
            for (let k = 0; k < 6; k++) {
              const idx = ring[k]!;
              const angle = (k * 2 * Math.PI) / 6;
              const x = centerOffsetX + radius * Math.cos(angle);
              const y = radius * Math.sin(angle);
              const z = isArom ? 0 : k % 2 === 0 ? 0.25 : -0.25;
              coords[idx] = { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), z };
              placed.add(idx);
              if (isArom) {
                aromaticRingAtoms.add(idx);
                aromaticRingOutward.set(idx, { x: Math.cos(angle), y: Math.sin(angle), z: 0 });
              }
            }
            placedRingCount++;
            ringProgress = true;
          }
        } else if (unplaced.length > 0 && unplaced.length <= 4) {
          // Fused 6-ring: find two adjacent placed atoms in perimeter
          let pA = -1;
          let pB = -1;
          for (let k = 0; k < 6; k++) {
            const curr = ring[k]!;
            const nxt = ring[(k + 1) % 6]!;
            if (placed.has(curr) && placed.has(nxt)) {
              pA = curr;
              pB = nxt;
              break;
            }
          }

          if (pA >= 0 && pB >= 0) {
            const rA = coords[pA]!;
            const rB = coords[pB]!;
            const M = { x: (rA.x + rB.x) / 2, y: (rA.y + rB.y) / 2 };
            const v = { x: rB.x - rA.x, y: rB.y - rA.y };
            const d = Math.hypot(v.x, v.y) || 1.39;
            const h = (d * Math.sqrt(3)) / 2;
            const u1 = { x: -v.y / d, y: v.x / d };
            const u2 = { x: v.y / d, y: -v.x / d };

            const c1 = { x: M.x + h * u1.x, y: M.y + h * u1.y };
            const c2 = { x: M.x + h * u2.x, y: M.y + h * u2.y };

            // Find neighbors of pA and pB that are already placed (belonging to the existing fused ring)
            const existingRingNeighbors: Vec3[] = [];
            for (const edge of graph[pA]!.edges) {
              if (edge.target !== pB && placed.has(edge.target) && coords[edge.target]) {
                existingRingNeighbors.push(coords[edge.target]!);
              }
            }
            for (const edge of graph[pB]!.edges) {
              if (edge.target !== pA && placed.has(edge.target) && coords[edge.target]) {
                existingRingNeighbors.push(coords[edge.target]!);
              }
            }

            let awayVec = { x: 0, y: 0 };
            if (existingRingNeighbors.length > 0) {
              let avgNghX = 0;
              let avgNghY = 0;
              for (const n of existingRingNeighbors) {
                avgNghX += n.x;
                avgNghY += n.y;
              }
              avgNghX /= existingRingNeighbors.length;
              avgNghY /= existingRingNeighbors.length;
              awayVec = { x: M.x - avgNghX, y: M.y - avgNghY };
            }

            let center: { x: number; y: number };
            if (Math.hypot(awayVec.x, awayVec.y) > 1e-4) {
              const dot1 = (c1.x - M.x) * awayVec.x + (c1.y - M.y) * awayVec.y;
              const dot2 = (c2.x - M.x) * awayVec.x + (c2.y - M.y) * awayVec.y;
              center = dot1 >= dot2 ? c1 : c2;
            } else {
              let sumPlacedX = 0, sumPlacedY = 0, pCount = 0;
              for (const idx of placed) {
                if (idx !== pA && idx !== pB && coords[idx]) {
                  sumPlacedX += coords[idx]!.x;
                  sumPlacedY += coords[idx]!.y;
                  pCount++;
                }
              }
              const avgX = pCount > 0 ? sumPlacedX / pCount : M.x;
              const avgY = pCount > 0 ? sumPlacedY / pCount : M.y;
              const d1 = Math.hypot(c1.x - avgX, c1.y - avgY);
              const d2 = Math.hypot(c2.x - avgX, c2.y - avgY);
              center = d1 >= d2 ? c1 : c2;
            }

            const startAngle = Math.atan2(rA.y - center.y, rA.x - center.x);
            const bAngle = Math.atan2(rB.y - center.y, rB.x - center.x);
            let deltaAngle = bAngle - startAngle;
            while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
            while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
            const stepAngle = deltaAngle > 0 ? (2 * Math.PI) / 6 : -(2 * Math.PI) / 6;

            const pAIdx = ring.indexOf(pA);
            for (let k = 0; k < 6; k++) {
              const idx = ring[(pAIdx + k) % 6]!;
              if (!placed.has(idx)) {
                const ang = startAngle + k * stepAngle;
                const x = center.x + radius * Math.cos(ang);
                const y = center.y + radius * Math.sin(ang);
                coords[idx] = { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), z: 0 };
                placed.add(idx);
              }
              if (isArom) {
                aromaticRingAtoms.add(idx);
              }
            }
            ringProgress = true;
          }
        }
      } else if (rawRing.length === 5 && rawRing.every((idx) => !placed.has(idx))) {
        let attachInRing = -1;
        let attachPlaced = -1;
        for (const idx of rawRing) {
          const edge = graph[idx]!.edges.find((e) => placed.has(e.target) && coords[e.target]);
          if (edge) {
            attachInRing = idx;
            attachPlaced = edge.target;
            break;
          }
        }

        const ring = orderRingPerimeter(rawRing, graph);
        if (attachInRing >= 0 && attachPlaced >= 0) {
          placeConnected5Ring(ring, attachInRing, attachPlaced, graph, coords, placed, aromaticRingAtoms, aromaticRingOutward, placedRingCount++);
          ringProgress = true;
        } else if (!hasPathToPlaced(rawRing, graph, placed)) {
          const radius = 1.25;
          const isArom = rawRing.every((idx) => graph[idx]!.isAromatic);
          const centerOffsetX = placed.size > 0 ? Math.max(...Array.from(placed).map((idx) => coords[idx]?.x ?? 0)) + 3.0 : 0;
          for (let k = 0; k < 5; k++) {
            const idx = ring[k]!;
            const angle = (k * 2 * Math.PI) / 5 - Math.PI / 2;
            const x = centerOffsetX + radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            coords[idx] = { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), z: 0 };
            placed.add(idx);
            if (isArom) {
              aromaticRingAtoms.add(idx);
              aromaticRingOutward.set(idx, { x: Math.cos(angle), y: Math.sin(angle), z: 0 });
            }
          }
          placedRingCount++;
          ringProgress = true;
        }
      }
    }
  }

  // Lay out direct heavy substituents radially for aromatic rings
  for (const idx of aromaticRingAtoms) {
    const uOut = aromaticRingOutward.get(idx);
    if (!uOut) continue;
    const node = graph[idx]!;
    const extEdges = node.edges.filter((e) => !aromaticRingAtoms.has(e.target));
    if (extEdges.length > 0) {
      extEdges.forEach((edge, eIdx) => {
        const sub = edge.target;
        if (!placed.has(sub)) {
          const bondDist = getBondDistance(node.elem, graph[sub]!.elem, edge.order);
          const fanAngle = extEdges.length > 1 ? (eIdx === 0 ? 0.25 : -0.25) : 0;
          const cosFan = Math.cos(fanAngle);
          const sinFan = Math.sin(fanAngle);
          const dirX = uOut.x * cosFan - uOut.y * sinFan;
          const dirY = uOut.x * sinFan + uOut.y * cosFan;
          const dirZ = uOut.z || 0;

          coords[sub] = {
            x: Number((coords[idx]!.x + dirX * bondDist).toFixed(3)),
            y: Number((coords[idx]!.y + dirY * bondDist).toFixed(3)),
            z: Number((coords[idx]!.z + dirZ * bondDist).toFixed(3)),
          };
          placed.add(sub);
        }
      });
    }
  }

  // 2. Identify connected components
  const components: number[][] = [];
  const compVisited = new Set<number>();
  for (let i = 0; i < graph.length; i++) {
    if (!compVisited.has(i)) {
      const comp: number[] = [];
      const q = [i];
      compVisited.add(i);
      while (q.length > 0) {
        const u = q.shift()!;
        comp.push(u);
        for (const e of graph[u]!.edges) {
          if (!compVisited.has(e.target)) {
            compVisited.add(e.target);
            q.push(e.target);
          }
        }
      }
      components.push(comp);
    }
  }

  // If multiple components, sort so the anchor / primary component is laid out first
  if (components.length > 1) {
    components.sort((a, b) => {
      // 1. Largest component first (e.g. polyatomic ion or main organic molecule)
      if (a.length !== b.length) return b.length - a.length;
      // 2. Higher absolute charge first (e.g. Mg+2 before Cl-)
      const aCharge = Math.abs(a.reduce((s, idx) => s + graph[idx]!.charge, 0));
      const bCharge = Math.abs(b.reduce((s, idx) => s + graph[idx]!.charge, 0));
      if (aCharge !== bCharge) return bCharge - aCharge;
      // 3. Metal before non-metal (e.g. Na+ before Cl-)
      const aHasMetal = a.some((idx) => !["C", "H", "N", "O", "P", "S", "F", "Cl", "Br", "I", "B", "Si"].includes(graph[idx]!.elem));
      const bHasMetal = b.some((idx) => !["C", "H", "N", "O", "P", "S", "F", "Cl", "Br", "I", "B", "Si"].includes(graph[idx]!.elem));
      if (aHasMetal && !bHasMetal) return -1;
      if (!aHasMetal && bHasMetal) return 1;
      return 0;
    });
  }

  // 3. Lay out each component via BFS with hybridization-guided bond vectors
  const ionicCoordCount: Record<number, number> = {};
  const pendingIonicBonds: [number, number][] = [];

  components.forEach((comp, compIdx) => {
    const alreadyPlaced = comp.filter((idx) => placed.has(idx));
    if (alreadyPlaced.length === 0) {
      const root = comp[0]!;
      coords[root] = { x: 0, y: 0, z: 0 };
      placed.add(root);
      alreadyPlaced.push(root);
    }

    const queue: number[] = [...alreadyPlaced];
    const parentMap: Record<number, number> = {};

    while (queue.length > 0) {
      const u = queue.shift()!;
      const uNode = graph[u]!;
      const uPos = coords[u]!;
      const hyb = getHybridization(uNode);

      let inDir: Vec3 | null = null;
      if (parentMap[u] !== undefined) {
        const pPos = coords[parentMap[u]!]!;
        inDir = vNormalize({ x: uPos.x - pPos.x, y: uPos.y - pPos.y, z: uPos.z - pPos.z });
      } else {
        const placedNeighbors = uNode.edges
          .filter((e) => placed.has(e.target) && coords[e.target])
          .map((e) => coords[e.target]!);
        if (placedNeighbors.length === 1) {
          const p = placedNeighbors[0]!;
          inDir = vNormalize({ x: uPos.x - p.x, y: uPos.y - p.y, z: uPos.z - p.z });
        } else if (placedNeighbors.length >= 2) {
          let sumOut = { x: 0, y: 0, z: 0 };
          for (const p of placedNeighbors) {
            const v = vNormalize({ x: uPos.x - p.x, y: uPos.y - p.y, z: uPos.z - p.z });
            sumOut.x += v.x;
            sumOut.y += v.y;
            sumOut.z += v.z;
          }
          const len = Math.hypot(sumOut.x, sumOut.y, sumOut.z);
          if (len > 1e-3) {
            inDir = { x: sumOut.x / len, y: sumOut.y / len, z: sumOut.z / len };
          }
        }
      }

      const unplacedNeighbors = uNode.edges.filter((e) => !placed.has(e.target));
      if (unplacedNeighbors.length === 0) continue;

      let fwd = inDir || { x: 1, y: 0, z: 0 };
      let up = Math.abs(fwd.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
      let right = vNormalize(vCross(fwd, up));
      let perp = vNormalize(vCross(right, fwd));

      for (let nIdx = 0; nIdx < unplacedNeighbors.length; nIdx++) {
        const edge = unplacedNeighbors[nIdx]!;
        const v = edge.target;
        if (placed.has(v)) continue;

        // Check if v belongs to an unplaced 6-ring
        const unplaced6 = rings.find((r) => r.length === 6 && r.includes(v) && r.every((idx) => !placed.has(idx)));
        if (unplaced6) {
          const orderedRing = orderRingPerimeter(unplaced6, graph);
          placeConnected6Ring(orderedRing, v, u, graph, coords, placed, aromaticRingAtoms, aromaticRingOutward, placedRingCount++);
          for (const idx of orderedRing) {
            parentMap[idx] = u;
            queue.push(idx);
          }
          continue;
        }

        // Check if v belongs to an unplaced 5-ring
        const unplaced5 = rings.find((r) => r.length === 5 && r.includes(v) && r.every((idx) => !placed.has(idx)));
        if (unplaced5) {
          const orderedRing = orderRingPerimeter(unplaced5, graph);
          placeConnected5Ring(orderedRing, v, u, graph, coords, placed, aromaticRingAtoms, aromaticRingOutward, placedRingCount++);
          for (const idx of orderedRing) {
            parentMap[idx] = u;
            queue.push(idx);
          }
          continue;
        }

        const vNode = graph[v]!;
        const bondDist = getBondDistance(uNode.elem, vNode.elem, edge.order);
        let outDir: Vec3;

        if (hyb === "SP") {
          outDir = fwd;
        } else if (hyb === "SP2") {
          const sign = nIdx % 2 === 0 ? 1 : -1;
          const cosFwd = 0.5; // cos(180° - 120°) = cos(60°) = +0.5 pointing forward
          const sinFwd = 0.866 * sign;
          outDir = {
            x: fwd.x * cosFwd + right.x * sinFwd,
            y: fwd.y * cosFwd + right.y * sinFwd,
            z: fwd.z * cosFwd + right.z * sinFwd,
          };
        } else {
          const cosFwd = 0.3333; // cos(180° - 109.5°) = cos(70.5°) = +0.3333 pointing forward
          const sinFwd = 0.9428;
          const phi = (nIdx * (2 * Math.PI) / 3) + (u % 2 === 0 ? 0 : Math.PI / 3);
          const cx = Math.cos(phi);
          const cy = Math.sin(phi);

          outDir = {
            x: fwd.x * cosFwd + (right.x * cx + perp.x * cy) * sinFwd,
            y: fwd.y * cosFwd + (right.y * cx + perp.y * cy) * sinFwd,
            z: fwd.z * cosFwd + (right.z * cx + perp.z * cy) * sinFwd,
          };
        }

        const jitter = (rng() - 0.5) * 0.02;
        coords[v] = {
          x: uPos.x + outDir.x * bondDist + jitter,
          y: uPos.y + outDir.y * bondDist + jitter,
          z: uPos.z + outDir.z * bondDist + jitter,
        };

        placed.add(v);
        parentMap[v] = u;
        queue.push(v);
      }
    }

    if (compIdx > 0) {
      // Find best coordinating atom in already placed components to pair with an atom in comp
      let bestTarget = -1;
      let bestCoordInComp = -1;
      let bestScore = -Infinity;

      for (const b of comp) {
        const nodeB = graph[b]!;
        const isB_Metal = !["C", "H", "N", "O", "P", "S", "F", "Cl", "Br", "I", "B", "Si"].includes(nodeB.elem);

        for (let a = 0; a < graph.length; a++) {
          if (!placed.has(a) || comp.includes(a)) continue;
          const nodeA = graph[a]!;
          const isA_Metal = !["C", "H", "N", "O", "P", "S", "F", "Cl", "Br", "I", "B", "Si"].includes(nodeA.elem);
          const isOppositeCharge = (nodeA.charge > 0 && nodeB.charge < 0) || (nodeA.charge < 0 && nodeB.charge > 0);
          const isMetalNonmetal = (isA_Metal && !isB_Metal) || (isB_Metal && !isA_Metal);

          if (!isOppositeCharge && !isMetalNonmetal) continue;

          const aCoordsCount = ionicCoordCount[a] ?? 0;
          const maxCapacity = Math.max(1, Math.abs(nodeA.charge) || (isA_Metal ? 2 : 1));
          if (aCoordsCount >= maxCapacity) continue;

          let score = 0;
          if (isOppositeCharge) score += 10;
          if (isMetalNonmetal) score += 5;
          if (nodeA.charge < 0 || nodeB.charge < 0) score += 5;
          score -= aCoordsCount * 3;

          if (score > bestScore) {
            bestScore = score;
            bestTarget = a;
            bestCoordInComp = b;
          }
        }
      }

      if (bestTarget !== -1 && bestCoordInComp !== -1) {
        const targetPos = coords[bestTarget]!;
        let outDir: Vec3;
        const targetNeighbors = graph[bestTarget]!.edges
          .filter((e) => placed.has(e.target) && !comp.includes(e.target) && coords[e.target])
          .map((e) => coords[e.target]!);

        if (targetNeighbors.length > 0) {
          let sumAway = { x: 0, y: 0, z: 0 };
          for (const n of targetNeighbors) {
            sumAway.x += targetPos.x - n.x;
            sumAway.y += targetPos.y - n.y;
            sumAway.z += targetPos.z - n.z;
          }
          const len = Math.hypot(sumAway.x, sumAway.y, sumAway.z);
          if (len > 0.1) {
            outDir = { x: sumAway.x / len, y: sumAway.y / len, z: sumAway.z / len };
          } else {
            outDir = { x: 1, y: 0, z: 0 };
          }
        } else {
          const k = ionicCoordCount[bestTarget] ?? 0;
          if (k === 0) outDir = { x: 1, y: 0, z: 0 };
          else if (k === 1) outDir = { x: -1, y: 0, z: 0.1 };
          else if (k === 2) outDir = { x: -0.5, y: 0.866, z: -0.1 };
          else if (k === 3) outDir = { x: -0.5, y: -0.866, z: 0.1 };
          else if (k === 4) outDir = { x: 0, y: 0, z: 1 };
          else outDir = { x: 0, y: 0, z: -1 };
        }
        outDir = vNormalize(outDir);

        const dBond = Math.min(2.45, Math.max(2.05, getBondDistance(graph[bestTarget]!.elem, graph[bestCoordInComp]!.elem)));

        // Multi-direction clash avoidance
        const candDirs: Vec3[] = [
          outDir,
          { x: -outDir.x, y: -outDir.y, z: outDir.z },
          { x: outDir.y, y: -outDir.x, z: outDir.z },
          { x: -outDir.y, y: outDir.x, z: outDir.z },
          { x: outDir.x, y: outDir.y, z: -outDir.z },
        ];

        let bestDelta: Vec3 | null = null;
        for (const dir of candDirs) {
          const normDir = vNormalize(dir);
          const tPos = {
            x: targetPos.x + normDir.x * dBond,
            y: targetPos.y + normDir.y * dBond,
            z: targetPos.z + normDir.z * dBond,
          };
          const curPos = coords[bestCoordInComp]!;
          const dShift = { x: tPos.x - curPos.x, y: tPos.y - curPos.y, z: tPos.z - curPos.z };

          let clashes = false;
          for (const b of comp) {
            const bx = coords[b]!.x + dShift.x;
            const by = coords[b]!.y + dShift.y;
            const bz = coords[b]!.z + dShift.z;
            for (let a = 0; a < graph.length; a++) {
              if (!placed.has(a) || comp.includes(a)) continue;
              const pa = coords[a]!;
              const dist = Math.hypot(bx - pa.x, by - pa.y, bz - pa.z);
              if (dist < 0.80) {
                clashes = true;
                break;
              }
            }
            if (clashes) break;
          }
          if (!clashes) {
            bestDelta = dShift;
            break;
          }
        }

        if (bestDelta) {
          for (const idx of comp) {
            if (coords[idx]) {
              coords[idx]!.x += bestDelta.x;
              coords[idx]!.y += bestDelta.y;
              coords[idx]!.z += bestDelta.z;
            }
          }
          ionicCoordCount[bestTarget] = (ionicCoordCount[bestTarget] ?? 0) + 1;
          pendingIonicBonds.push([Math.min(bestTarget, bestCoordInComp), Math.max(bestTarget, bestCoordInComp)]);
        } else {
          // If all candidate coordination directions clash, shift component safely along X
          let maxX = -Infinity;
          for (let k = 0; k < graph.length; k++) {
            if (placed.has(k) && !comp.includes(k) && coords[k]) {
              maxX = Math.max(maxX, coords[k]!.x);
            }
          }
          if (!Number.isFinite(maxX)) maxX = 0;

          let currMinX = Infinity;
          for (const idx of comp) {
            if (coords[idx]) currMinX = Math.min(currMinX, coords[idx]!.x);
          }
          if (!Number.isFinite(currMinX)) currMinX = 0;

          const shift = maxX + 2.8 - currMinX;
          for (const idx of comp) {
            if (coords[idx]) {
              coords[idx]!.x += shift;
            }
          }
        }
      } else {
        let maxX = -Infinity;
        for (let k = 0; k < graph.length; k++) {
          if (placed.has(k) && !comp.includes(k) && coords[k]) {
            maxX = Math.max(maxX, coords[k]!.x);
          }
        }
        if (!Number.isFinite(maxX)) maxX = 0;

        let currMinX = Infinity;
        for (const idx of comp) {
          if (coords[idx]) currMinX = Math.min(currMinX, coords[idx]!.x);
        }
        if (!Number.isFinite(currMinX)) currMinX = 0;

        const shift = maxX + 2.8 - currMinX;
        for (const idx of comp) {
          if (coords[idx]) {
            coords[idx]!.x += shift;
          }
        }
      }
    }
  });

  // 4. Assemble heavy atoms
  const atoms: MoleculeStructure["atoms"] = [];
  const bonds: MoleculeStructure["bonds"] = [];

  for (let i = 0; i < graph.length; i++) {
    const node = graph[i]!;
    const p = coords[i] || { x: i * 1.5, y: 0, z: 0 };
    atoms.push({
      atomIndex: i,
      element: node.elem,
      x3d: Number(p.x.toFixed(3)),
      y3d: Number(p.y.toFixed(3)),
      z3d: Number(p.z.toFixed(3)),
      x2d: Math.round(p.x * 40),
      y2d: Math.round(p.y * 40),
      formalCharge: node.charge,
    });
  }

  // Assemble heavy bonds
  const bondKeySet = new Set<string>();
  for (const node of graph) {
    for (const edge of node.edges) {
      const minI = Math.min(node.idx, edge.target);
      const maxI = Math.max(node.idx, edge.target);
      const key = `${minI}-${maxI}`;
      if (!bondKeySet.has(key)) {
        bondKeySet.add(key);
        const order = edge.order === 1.5 ? 2 : (Math.round(edge.order) as 1 | 2 | 3);
        bonds.push({
          atomIndex1: minI,
          atomIndex2: maxI,
          order,
          type: "covalent",
        });
      }
    }
  }

  // Assemble coordinated ionic bonds
  for (const [a, b] of pendingIonicBonds) {
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (!bondKeySet.has(key)) {
      bondKeySet.add(key);
      bonds.push({
        atomIndex1: Math.min(a, b),
        atomIndex2: Math.max(a, b),
        order: 1,
        type: "ionic",
      });
    }
  }

  // Connect any remaining salt ions with ionic bonds if physical and charged
  if (components.length > 1) {
    for (let c = 0; c < components.length; c++) {
      const compA = components[c]!;
      for (let c2 = c + 1; c2 < components.length; c2++) {
        const compB = components[c2]!;
        let minD = Infinity;
        let pair: [number, number] | null = null;
        for (const a of compA) {
          const nodeA = graph[a]!;
          for (const b of compB) {
            const nodeB = graph[b]!;
            const isA_Metal = !["C", "H", "N", "O", "P", "S", "F", "Cl", "Br", "I", "B", "Si"].includes(nodeA.elem);
            const isB_Metal = !["C", "H", "N", "O", "P", "S", "F", "Cl", "Br", "I", "B", "Si"].includes(nodeB.elem);
            const isOppositeCharge = (nodeA.charge > 0 && nodeB.charge < 0) || (nodeA.charge < 0 && nodeB.charge > 0);
            const isMetalNonmetal = (isA_Metal && !isB_Metal) || (isB_Metal && !isA_Metal);

            if (!isOppositeCharge && !isMetalNonmetal) continue;

            const d = vDist(
              { x: atoms[a]!.x3d, y: atoms[a]!.y3d, z: atoms[a]!.z3d },
              { x: atoms[b]!.x3d, y: atoms[b]!.y3d, z: atoms[b]!.z3d }
            );
            if (d <= 2.65 && d >= 1.60 && d < minD) {
              minD = d;
              pair = [Math.min(a, b), Math.max(a, b)];
            }
          }
        }
        if (pair && !bondKeySet.has(`${pair[0]}-${pair[1]}`)) {
          bondKeySet.add(`${pair[0]}-${pair[1]}`);
          bonds.push({
            atomIndex1: pair[0],
            atomIndex2: pair[1],
            order: 1,
            type: "ionic",
          });
        }
      }
    }
  }

  // 5. Accurate Implicit Hydrogen Addition
  const heavyCount = atoms.length;
  for (let i = 0; i < heavyCount; i++) {
    const node = graph[i]!;
    const elem = node.elem;
    const parentPos = atoms[i]!;

    // Case A: Aromatic benzene ring atom
    if (aromaticRingAtoms.has(i)) {
      // In aromatic rings, carbon valence 4 is fully satisfied if heavy degree >= 3 (bridgehead or substituted)
      let needAromH = 0;
      if (node.explicitH !== null) {
        needAromH = node.explicitH;
      } else if (elem === "C" && node.edges.length === 2) {
        needAromH = 1;
      }

      if (needAromH === 1) {
        const myRing = rings.find((r) => r.length === 6 && r.includes(i)) || rings.find((r) => r.includes(i));
        let ringCenterOut: Vec3 | null = null;
        if (myRing && myRing.length >= 3) {
          let cx = 0, cy = 0, cz = 0;
          for (const rIdx of myRing) {
            const a = atoms[rIdx];
            if (a) { cx += a.x3d; cy += a.y3d; cz += a.z3d; }
          }
          cx /= myRing.length; cy /= myRing.length; cz /= myRing.length;
          const v = { x: parentPos.x3d - cx, y: parentPos.y3d - cy, z: parentPos.z3d - cz };
          const vLen = Math.hypot(v.x, v.y, v.z);
          if (vLen > 1e-3) {
            ringCenterOut = { x: v.x / vLen, y: v.y / vLen, z: v.z / vLen };
          }
        }

        let uOut: Vec3 | null = null;
        const ringOut = ringCenterOut || aromaticRingOutward.get(i);
        if (node.edges.length === 2) {
          const n1 = atoms[node.edges[0]!.target];
          const n2 = atoms[node.edges[1]!.target];
          if (n1 && n2) {
            const v1 = vNormalize({ x: n1.x3d - parentPos.x3d, y: n1.y3d - parentPos.y3d, z: n1.z3d - parentPos.z3d });
            const v2 = vNormalize({ x: n2.x3d - parentPos.x3d, y: n2.y3d - parentPos.y3d, z: n2.z3d - parentPos.z3d });
            const vSum = { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
            const vSumLen = Math.hypot(vSum.x, vSum.y, vSum.z);
            if (vSumLen > 1e-3) {
              let cand = { x: -vSum.x / vSumLen, y: -vSum.y / vSumLen, z: -vSum.z / vSumLen };
              if (ringOut && (cand.x * ringOut.x + cand.y * ringOut.y + cand.z * ringOut.z) < 0.3) {
                cand = ringOut;
              }
              uOut = cand;
            }
          }
        }
        if (!uOut) {
          uOut = ringOut || { x: 1, y: 0, z: 0 };
        }

        const hDist = 1.09;
        const hIdx = atoms.length;
        const hx = parentPos.x3d + uOut.x * hDist;
        const hy = parentPos.y3d + uOut.y * hDist;
        const hz = parentPos.z3d + (uOut.z || 0) * hDist;

        atoms.push({
          atomIndex: hIdx,
          element: "H",
          x3d: Number(hx.toFixed(3)),
          y3d: Number(hy.toFixed(3)),
          z3d: Number(hz.toFixed(3)),
          x2d: Math.round(hx * 40),
          y2d: Math.round(hy * 40),
        });

        bonds.push({
          atomIndex1: i,
          atomIndex2: hIdx,
          order: 1,
          type: "covalent",
        });
      }
      continue;
    }

    // Case B: General non-ring / sidechain atoms
    let needH = 0;
    if (node.explicitH !== null) {
      needH = node.explicitH;
    } else {
      const usedV = node.edges.reduce((sum, e) => sum + (e.order === 1.5 ? 1.5 : e.order), 0);
      const maxV = getImplicitValence(elem, usedV);
      needH = Math.max(0, Math.floor(maxV - usedV));
    }

    if (needH <= 0) continue;

    const existingNeighbors = bonds
      .filter((b) => b.atomIndex1 === i || b.atomIndex2 === i)
      .map((b) => (b.atomIndex1 === i ? atoms[b.atomIndex2]! : atoms[b.atomIndex1]!));

    const hDist = getBondDistance(elem, "H");

    if (needH === 2 && existingNeighbors.length === 2) {
      // True tetrahedral sp3 methylene: H-C-H plane is strictly perpendicular to C-C-C plane
      const n1 = existingNeighbors[0]!;
      const n2 = existingNeighbors[1]!;
      const v1 = vNormalize({ x: n1.x3d - parentPos.x3d, y: n1.y3d - parentPos.y3d, z: n1.z3d - parentPos.z3d });
      const v2 = vNormalize({ x: n2.x3d - parentPos.x3d, y: n2.y3d - parentPos.y3d, z: n2.z3d - parentPos.z3d });
      const bisector = vNormalize({ x: -(v1.x + v2.x), y: -(v1.y + v2.y), z: -(v1.z + v2.z) });
      let normal = vNormalize(vCross(v1, v2));
      if (Math.hypot(normal.x, normal.y, normal.z) < 1e-3) {
        const ref = Math.abs(bisector.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
        normal = vNormalize(vCross(bisector, ref));
      }

      const cosTet = 0.5774;
      const sinTet = 0.8165;
      const dirs = [
        vNormalize({ x: bisector.x * cosTet + normal.x * sinTet, y: bisector.y * cosTet + normal.y * sinTet, z: bisector.z * cosTet + normal.z * sinTet }),
        vNormalize({ x: bisector.x * cosTet - normal.x * sinTet, y: bisector.y * cosTet - normal.y * sinTet, z: bisector.z * cosTet - normal.z * sinTet }),
      ];

      for (const hDir of dirs) {
        const hIdx = atoms.length;
        const hx = parentPos.x3d + hDir.x * hDist;
        const hy = parentPos.y3d + hDir.y * hDist;
        const hz = parentPos.z3d + hDir.z * hDist;

        atoms.push({
          atomIndex: hIdx,
          element: "H",
          x3d: Number(hx.toFixed(3)),
          y3d: Number(hy.toFixed(3)),
          z3d: Number(hz.toFixed(3)),
          x2d: Math.round(hx * 40),
          y2d: Math.round(hy * 40),
        });

        bonds.push({
          atomIndex1: i,
          atomIndex2: hIdx,
          order: 1,
          type: "covalent",
        });
      }
      continue;
    }

    let avgNeighborDir = { x: 0, y: 0, z: 0 };
    for (const n of existingNeighbors) {
      avgNeighborDir.x += n.x3d - parentPos.x3d;
      avgNeighborDir.y += n.y3d - parentPos.y3d;
      avgNeighborDir.z += n.z3d - parentPos.z3d;
    }

    const ax = -avgNeighborDir.x;
    const ay = -avgNeighborDir.y;
    const az = -avgNeighborDir.z;

    const away = vNormalize({
      x: Math.abs(ax) > 1e-4 ? ax : (rng() - 0.5),
      y: Math.abs(ay) > 1e-4 ? ay : (rng() - 0.5),
      z: Math.abs(az) > 1e-4 ? az : 0,
    });
    const ref = Math.abs(away.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
    const side = vNormalize(vCross(away, ref));
    const up = vNormalize(vCross(side, away));

    for (let h = 0; h < needH; h++) {
      let hDir = away;
      if (needH === 2) {
        const ang = (h === 0 ? 1 : -1) * 0.55;
        hDir = vNormalize({
          x: away.x * Math.cos(ang) + side.x * Math.sin(ang),
          y: away.y * Math.cos(ang) + side.y * Math.sin(ang),
          z: away.z * Math.cos(ang) + side.z * Math.sin(ang),
        });
      } else if (needH === 3) {
        const phi = (h * 2 * Math.PI) / 3;
        const cosCone = 0.5;
        const sinCone = 0.866;
        hDir = vNormalize({
          x: away.x * cosCone + (side.x * Math.cos(phi) + up.x * Math.sin(phi)) * sinCone,
          y: away.y * cosCone + (side.y * Math.cos(phi) + up.y * Math.sin(phi)) * sinCone,
          z: away.z * cosCone + (side.z * Math.cos(phi) + up.z * Math.sin(phi)) * sinCone,
        });
      } else if (needH === 4) {
        const tet = [
          { x: 0.577, y: 0.577, z: 0.577 },
          { x: 0.577, y: -0.577, z: -0.577 },
          { x: -0.577, y: 0.577, z: -0.577 },
          { x: -0.577, y: -0.577, z: 0.577 },
        ];
        hDir = tet[h]!;
      }

      const hIdx = atoms.length;
      const hx = parentPos.x3d + hDir.x * hDist;
      const hy = parentPos.y3d + hDir.y * hDist;
      const hz = parentPos.z3d + hDir.z * hDist;

      atoms.push({
        atomIndex: hIdx,
        element: "H",
        x3d: Number(hx.toFixed(3)),
        y3d: Number(hy.toFixed(3)),
        z3d: Number(hz.toFixed(3)),
        x2d: Math.round(hx * 40),
        y2d: Math.round(hy * 40),
      });

      bonds.push({
        atomIndex1: i,
        atomIndex2: hIdx,
        order: 1,
        type: "covalent",
      });
    }

  }

  // 6. Force Field Minimization
  relaxGeometry(atoms, bonds, rng, aromaticRingAtoms);

  // 7. Physical bond integrity filter
  const validBonds = bonds.filter((b) => {
    const a1 = atoms[b.atomIndex1];
    const a2 = atoms[b.atomIndex2];
    if (!a1 || !a2) return false;
    const d = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
    return d <= 2.65 && (b.type !== "covalent" || d >= 0.70);
  });

  return { curated: true, atoms, bonds: validBonds };
}

// -----------------------------------------------------------------------------
// 5. Inorganic & Small-Molecule VSEPR Generator
// -----------------------------------------------------------------------------

function detectCentralAtom(comp: ElementComposition, formula: string): string | null {
  const elements = Object.keys(comp);
  if (elements.length <= 1) return null;

  // 1. Organic molecules with multiple carbons MUST NOT use single-center VSEPR
  if ((comp["C"] ?? 0) > 1) {
    return null;
  }
  // Organic 1-carbon with multiple heteroatoms/hydrogens (e.g. methanol CH3OH, methylamine CH3NH2)
  if (comp["C"] === 1 && (comp["H"] ?? 0) >= 3 && elements.length > 2) {
    return null;
  }

  // 2. Simple Oxoacids and Oxoanions with at most 4 oxygens per central atom (SO2, SO3, SO4^2-, NO2-, NO3-, CO3^2-, PO4^3-)
  const oCount = comp["O"] ?? 0;
  if (oCount >= 2 && oCount <= 4) {
    for (const c of ["S", "P", "N", "C", "Si", "Cl", "Br", "I", "B", "Se", "As"]) {
      if (comp[c] && comp[c]! === 1) return c;
    }
  }

  // 3. Central atom candidates (monocentric inorganic halides, oxides, hydrides)
  const centralCandidates = [
    "Be", "Mg", "Ca", "Sr", "Ba",
    "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
    "B", "Al", "Ga", "In", "Si", "Ge", "Sn", "Pb", "P", "As", "Sb", "S", "Se", "C", "N",
  ];
  for (const c of centralCandidates) {
    if (comp[c] && comp[c] === 1) {
      const others = elements.filter((e) => e !== c);
      if (others.every((e) => ["F", "Cl", "Br", "I", "H", "O"].includes(e))) {
        let ligTotal = 0;
        for (const o of others) ligTotal += comp[o] ?? 0;
        if (ligTotal <= 6) return c;
      }
    }
  }

  // Water / H2S specifically
  if (comp["O"] === 1 && comp["H"] === 2 && elements.length === 2) return "O";
  if (comp["S"] === 1 && comp["H"] === 2 && elements.length === 2) return "S";

  return null;
}

function generateInorganicVsepr(
  comp: ElementComposition,
  formula: string,
  commonName: string,
  rng: () => number
): MoleculeStructure | null {
  const central = detectCentralAtom(comp, formula);
  if (!central) return null;

  const atoms: MoleculeStructure["atoms"] = [];
  const bonds: MoleculeStructure["bonds"] = [];

  atoms.push({
    atomIndex: 0,
    element: central,
    x3d: 0,
    y3d: 0,
    z3d: 0,
    x2d: 0,
    y2d: 0,
  });

  const oCount = comp["O"] || 0;
  const hCount = comp["H"] || 0;

  if (oCount >= 2 && oCount <= 4 && central !== "O") {
    const oIndices: number[] = [];
    const trigAngle = (120 * Math.PI) / 180;

    for (let i = 0; i < oCount; i++) {
      let vx = 0;
      let vy = 0;
      let vz = 0;

      if (oCount === 2) {
        const isLinear = (central === "C" || central === "Be" || central === "Hg" || central === "Si") && hCount === 0;
        if (isLinear) {
          vx = i === 0 ? 1 : -1;
          vy = 0;
          vz = 0;
        } else {
          const ang = (i === 0 ? 1 : -1) * (104.5 * Math.PI / 360);
          vx = Math.sin(ang);
          vy = Math.cos(ang);
          vz = i === 0 ? 0.35 : -0.35;
        }
      } else if (oCount === 3) {
        const isPyramidal = ["Cl", "Br", "I", "P", "As", "Sb", "N", "Se"].includes(central);
        const ang = i * trigAngle - Math.PI / 2;
        if (isPyramidal) {
          vx = Math.cos(ang) * 0.89;
          vy = Math.sin(ang) * 0.89;
          vz = -0.45;
        } else {
          vx = Math.cos(ang);
          vy = Math.sin(ang);
        }
      } else {
        const signX = (i === 0 || i === 1) ? 1 : -1;
        const signY = (i === 0 || i === 2) ? 1 : -1;
        const signZ = (i === 0 || i === 3) ? 1 : -1;
        vx = signX * 0.577;
        vy = signY * 0.577;
        vz = signZ * 0.577;
      }

      const d = getBondDistance(central, "O");
      const oIdx = atoms.length;
      oIndices.push(oIdx);

      atoms.push({
        atomIndex: oIdx,
        element: "O",
        x3d: Number((vx * d).toFixed(3)),
        y3d: Number((vy * d).toFixed(3)),
        z3d: Number((vz * d).toFixed(3)),
        x2d: Math.round(vx * d * 40),
        y2d: Math.round(vy * d * 40),
      });

      const isDouble = i < oCount - Math.min(hCount, oCount);
      bonds.push({
        atomIndex1: 0,
        atomIndex2: oIdx,
        order: isDouble ? 2 : 1,
        type: "covalent",
      });
    }

    let placedH = 0;
    for (let i = 0; i < oCount && placedH < hCount; i++) {
      const oIdx = oIndices[i]!;
      const oAtom = atoms[oIdx]!;
      const hDist = 0.96;
      const hIdx = atoms.length;

      const oDist = Math.hypot(oAtom.x3d, oAtom.y3d, oAtom.z3d) || 1;
      const ux = oAtom.x3d / oDist;
      const uy = oAtom.y3d / oDist;
      const uz = oAtom.z3d / oDist;

      // Perpendicular vector for bent O-H bond (~107°) in 3D
      const p1 = Math.abs(uz) < 0.8 ? { x: 0, y: 0.35, z: 0.94 } : { x: 1, y: 0, z: 0 };
      const dot = p1.x * ux + p1.y * uy + p1.z * uz;
      const px = p1.x - dot * ux;
      const py = p1.y - dot * uy;
      const pz = p1.z - dot * uz;
      const pLen = Math.hypot(px, py, pz) || 1;

      const hx = oAtom.x3d + hDist * (0.35 * ux + 0.94 * (px / pLen));
      const hy = oAtom.y3d + hDist * (0.35 * uy + 0.94 * (py / pLen));
      const hz = oAtom.z3d + hDist * (0.35 * uz + 0.94 * (pz / pLen));

      atoms.push({
        atomIndex: hIdx,
        element: "H",
        x3d: Number(hx.toFixed(3)),
        y3d: Number(hy.toFixed(3)),
        z3d: Number(hz.toFixed(3)),
        x2d: Math.round(hx * 40),
        y2d: Math.round(hy * 40),
      });

      bonds.push({
        atomIndex1: oIdx,
        atomIndex2: hIdx,
        order: 1,
        type: "covalent",
      });
      placedH++;
    }

    // Any excess hydrogens attached to oxygens
    while (placedH < hCount) {
      const targetO = oIndices[placedH % oIndices.length]!;
      const oAtom = atoms[targetO]!;
      const hIdx = atoms.length;
      const ang = (placedH * 2.1) % (2 * Math.PI);
      const hx = oAtom.x3d + 0.96 * Math.cos(ang);
      const hy = oAtom.y3d + 0.96 * Math.sin(ang);
      const hz = oAtom.z3d + (placedH % 2 === 0 ? 0.6 : -0.6);
      atoms.push({
        atomIndex: hIdx,
        element: "H",
        x3d: Number(hx.toFixed(3)),
        y3d: Number(hy.toFixed(3)),
        z3d: Number(hz.toFixed(3)),
        x2d: Math.round(hx * 40),
        y2d: Math.round(hy * 40),
      });
      bonds.push({
        atomIndex1: targetO,
        atomIndex2: hIdx,
        order: 1,
        type: "covalent",
      });
      placedH++;
    }

    const metals = Object.keys(comp).filter((k) => k !== central && k !== "O" && k !== "H");
    // Prioritize deprotonated oxygens (oxygens that did not receive an H)
    const availableOIndices = oIndices.slice(placedH).concat(oIndices.slice(0, placedH));

    for (const m of metals) {
      const mCount = comp[m] || 0;
      for (let j = 0; j < mCount; j++) {
        const mIdx = atoms.length;
        const targetO = (availableOIndices.length > 0 ? availableOIndices : oIndices)[j % oIndices.length]!;
        const oAtom = atoms[targetO]!;

        const oDist = Math.hypot(oAtom.x3d, oAtom.y3d, oAtom.z3d) || 1;
        const ux = oAtom.x3d / oDist;
        const uy = oAtom.y3d / oDist;
        const uz = oAtom.z3d / oDist;

        const mDist = 2.15;
        const angle = (j * 2 * Math.PI) / Math.max(1, mCount) + Math.PI / 4;
        const perpX = -uy * Math.cos(angle);
        const perpY = ux * Math.cos(angle);
        const perpZ = Math.sin(angle);

        const mx = oAtom.x3d + mDist * (0.85 * ux + 0.52 * perpX);
        const my = oAtom.y3d + mDist * (0.85 * uy + 0.52 * perpY);
        const mz = oAtom.z3d + mDist * (0.85 * uz + 0.52 * perpZ);

        atoms.push({
          atomIndex: mIdx,
          element: m,
          x3d: Number(mx.toFixed(3)),
          y3d: Number(my.toFixed(3)),
          z3d: Number(mz.toFixed(3)),
          x2d: Math.round(mx * 40),
          y2d: Math.round(my * 40),
        });

        bonds.push({
          atomIndex1: targetO,
          atomIndex2: mIdx,
          order: 1,
          type: "ionic",
        });
      }
    }

    relaxGeometry(atoms, bonds, rng);
    return { curated: true, atoms, bonds };
  }

  const ligandKeys = Object.keys(comp).filter((k) => k !== central);
  const ligandList: string[] = [];
  for (const k of ligandKeys) {
    const cnt = comp[k] || 0;
    for (let c = 0; c < cnt; c++) ligandList.push(k);
  }

  const n = ligandList.length;
  if (n === 0 || n > 6) return null;
  for (let i = 0; i < n; i++) {
    const ligElem = ligandList[i]!;
    let vx = 0;
    let vy = 0;
    let vz = 0;

    if (n === 2) {
      const isLinear = central === "C" || central === "Be" || formula.includes("CO2");
      if (isLinear) {
        vx = i === 0 ? 1 : -1;
      } else {
        const ang = (i === 0 ? 1 : -1) * (104.5 * Math.PI / 360);
        vx = Math.sin(ang);
        vy = Math.cos(ang);
      }
    } else if (n === 3) {
      const isPlanar = central === "B" || central === "Al" || central === "SO3";
      const ang = (i * 2 * Math.PI) / 3;
      if (isPlanar) {
        vx = Math.cos(ang);
        vy = Math.sin(ang);
      } else {
        vx = 0.94 * Math.cos(ang);
        vy = 0.94 * Math.sin(ang);
        vz = -0.34;
      }
    } else if (n === 4) {
      const signX = (i === 0 || i === 1) ? 1 : -1;
      const signY = (i === 0 || i === 2) ? 1 : -1;
      const signZ = (i === 0 || i === 3) ? 1 : -1;
      vx = signX * 0.577;
      vy = signY * 0.577;
      vz = signZ * 0.577;
    } else if (n === 5) {
      if (i === 3) vz = 1;
      else if (i === 4) vz = -1;
      else {
        const ang = (i * 2 * Math.PI) / 3;
        vx = Math.cos(ang);
        vy = Math.sin(ang);
      }
    } else {
      if (i === 0) vx = 1;
      else if (i === 1) vx = -1;
      else if (i === 2) vy = 1;
      else if (i === 3) vy = -1;
      else if (i === 4) vz = 1;
      else vz = -1;
    }

    const d = getBondDistance(central, ligElem);
    const lIdx = atoms.length;

    atoms.push({
      atomIndex: lIdx,
      element: ligElem,
      x3d: Number((vx * d).toFixed(3)),
      y3d: Number((vy * d).toFixed(3)),
      z3d: Number((vz * d).toFixed(3)),
      x2d: Math.round(vx * d * 40),
      y2d: Math.round(vy * d * 40),
    });

    const isDouble = (central === "C" && ligElem === "O") || (central === "S" && ligElem === "O");
    bonds.push({
      atomIndex1: 0,
      atomIndex2: lIdx,
      order: isDouble ? 2 : 1,
      type: "covalent",
    });
  }

  relaxGeometry(atoms, bonds, rng);
  return { curated: true, atoms, bonds };
}

// -----------------------------------------------------------------------------
// 6. Organic Molecule Fallback Generator (Aliphatic Zigzag Chains & Aromatic Rings)
// -----------------------------------------------------------------------------

function generateOrganicStructure(
  chemicalId: string,
  formula: string,
  comp: ElementComposition,
  commonName: string,
  rng: () => number,
  fastMode = false
): MoleculeStructure {
  const halogens = ["F", "Cl", "Br", "I"];
  const nonMetals = new Set(["C", "Si", "B", "N", "P", "S", "As", "Se", "Te", "O", ...halogens, "H"]);
  const metalKeys = Object.keys(comp).filter((k) => !nonMetals.has(k) && (comp[k] ?? 0) > 0);

  const heavyKeys = [
    ...["C", "Si", "B"].filter((k) => (comp[k] ?? 0) > 0),
    ...["N", "P", "S", "As", "Se", "Te"].filter((k) => (comp[k] ?? 0) > 0),
    ...((comp["O"] ?? 0) > 0 ? ["O"] : []),
    ...halogens.filter((k) => (comp[k] ?? 0) > 0),
  ];

  const atoms: MoleculeStructure["atoms"] = [];
  const bonds: MoleculeStructure["bonds"] = [];
  const valenceUsed: number[] = [];
  const aromaticRingAtoms = new Set<number>();

  const name = commonName.toLowerCase();
  const cCount = comp["C"] || 0;
  const hCount = comp["H"] || 0;

  const has6Ring =
    cCount >= 6 &&
    metalKeys.length === 0 &&
    (name.includes("phenyl") ||
      name.includes("benzen") ||
      name.includes("tolu") ||
      name.includes("pyridin") ||
      name.includes("pyrimid") ||
      name.includes("benzo") ||
      (hCount > 0 && hCount <= cCount * 1.4 && !name.includes("citrat")));

  const has5Ring =
    cCount >= 4 &&
    !has6Ring &&
    (name.includes("pyrrol") ||
      name.includes("furan") ||
      name.includes("thiophen") ||
      name.includes("succinimide") ||
      name.includes("cyclopent"));

  let atomCount = 0;
  function addAtom(element: string, x3d: number, y3d: number, z3d: number): number {
    const idx = atomCount++;
    atoms.push({
      atomIndex: idx,
      element,
      x3d: Number(x3d.toFixed(3)),
      y3d: Number(y3d.toFixed(3)),
      z3d: Number(z3d.toFixed(3)),
      x2d: Math.round(x3d * 40),
      y2d: Math.round(y3d * 40),
    });
    valenceUsed[idx] = 0;
    return idx;
  }

  function addBond(i1: number, i2: number, order: 1 | 2 | 3 = 1, type: "covalent" | "ionic" = "covalent") {
    bonds.push({ atomIndex1: i1, atomIndex2: i2, order, type });
    valenceUsed[i1] = (valenceUsed[i1] ?? 0) + order;
    valenceUsed[i2] = (valenceUsed[i2] ?? 0) + order;
  }

  // 1. Regular Planar Hexagon for Benzene / Phenyl Groups
  if (has6Ring && cCount >= 6) {
    const ringRadius = 1.39;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = ringRadius * Math.cos(angle);
      const y = ringRadius * Math.sin(angle);
      let elem = "C";
      if (name.includes("pyridin") && i === 1) elem = "N";
      if (name.includes("pyrimid") && (i === 1 || i === 3)) elem = "N";
      const idx = addAtom(elem, x, y, 0);
      aromaticRingAtoms.add(idx);
    }
    for (let i = 0; i < 6; i++) {
      addBond(i, (i + 1) % 6, (i % 2 === 0 ? 2 : 1) as 1 | 2);
    }
  } else if (has5Ring && cCount >= 4) {
    const ringRadius = 1.25;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = ringRadius * Math.cos(angle);
      const y = ringRadius * Math.sin(angle);
      let elem = "C";
      if ((comp["N"] ?? 0) > 0 && i === 0) elem = "N";
      else if ((comp["O"] ?? 0) > 0 && name.includes("furan") && i === 0) elem = "O";
      else if ((comp["S"] ?? 0) > 0 && name.includes("thiophen") && i === 0) elem = "S";
      addAtom(elem, x, y, 0);
    }
    for (let i = 0; i < 5; i++) {
      addBond(i, (i + 1) % 5, (i === 0 ? 2 : 1) as 1 | 2);
    }
  }

  // 2. Continuous zigzag carbon backbone if no ring
  if (atoms.length === 0 && cCount > 0) {
    const backboneLen = Math.min(cCount, 16);
    for (let i = 0; i < backboneLen; i++) {
      const x = (i - (backboneLen - 1) / 2) * 1.4;
      const y = i % 2 === 0 ? 0.45 : -0.45;
      const z = i % 4 === 0 || i % 4 === 1 ? 0.25 : -0.25;
      addAtom("C", x, y, z);
      if (i > 0) {
        addBond(i - 1, i, 1);
      }
    }
  }

  // Pure hydrogen fallback
  if (atoms.length === 0 && heavyKeys.length === 0 && (comp["H"] ?? 0) > 0) {
    const totalH = comp["H"] ?? 1;
    for (let i = 0; i < totalH; i++) {
      const x = (i - (totalH - 1) / 2) * 0.74;
      addAtom("H", x, 0, 0);
      if (i > 0) addBond(i - 1, i, 1);
    }
  }

  // 3. Attach remaining heteroatoms
  const placedCounts: Record<string, number> = {};
  for (const a of atoms) placedCounts[a.element] = (placedCounts[a.element] || 0) + 1;

  for (const sym of heavyKeys) {
    const totalRequired = comp[sym] || 0;
    const needed = totalRequired - (placedCounts[sym] || 0);

    for (let k = 0; k < needed; k++) {
      let parentIdx = -1;
      let minValence = Infinity;

      for (let p = 0; p < atoms.length; p++) {
        const pElem = atoms[p]!.element;
        if (pElem === "H") continue;
        if (["F", "Cl", "Br", "I"].includes(pElem)) continue;

        const maxV = ELEMENT_MAX_VALENCE[pElem] ?? 4;
        const used = valenceUsed[p] ?? 0;
        if (used < maxV && used < minValence) {
          minValence = used;
          parentIdx = p;
        }
      }

      if (parentIdx === -1 && atoms.length > 0) {
        parentIdx = 0;
      }

      let x = 0;
      let y = 0;
      let z = 0;

      if (parentIdx >= 0) {
        const parent = atoms[parentIdx]!;
        const bondDist = getBondDistance(parent.element, sym);
        if (aromaticRingAtoms.has(parentIdx)) {
          // Outward radial in ring plane
          const ang = (parentIdx * Math.PI) / 3;
          x = parent.x3d + bondDist * Math.cos(ang);
          y = parent.y3d + bondDist * Math.sin(ang);
          z = 0;
        } else {
          const ang = (k * 1.5) % (2 * Math.PI);
          x = parent.x3d + bondDist * Math.cos(ang);
          y = parent.y3d + bondDist * Math.sin(ang);
          z = parent.z3d + 0.4;
        }
      }

      const newIdx = addAtom(sym, x, y, z);
      if (parentIdx >= 0) {
        const isDouble =
          (sym === "O" && (name.includes("one") || name.includes("oic") || name.includes("aldehyde"))) ||
          (sym === "N" && name.includes("imine"));
        addBond(parentIdx, newIdx, (isDouble ? 2 : 1) as 1 | 2);
      }
    }
  }

  // 4. Fill remaining valences with Hydrogens
  const hTotal = comp["H"] || 0;
  let placedH = 0;

  // First place hydrogens on aromatic ring carbons radially in plane
  if (aromaticRingAtoms.size > 0) {
    for (const rIdx of aromaticRingAtoms) {
      if (placedH >= hTotal) break;
      const parent = atoms[rIdx]!;
      if (parent.element === "C" && (valenceUsed[rIdx] ?? 0) <= 3) {
        const ang = (rIdx * Math.PI) / 3;
        const hDist = 1.09;
        const hx = parent.x3d + hDist * Math.cos(ang);
        const hy = parent.y3d + hDist * Math.sin(ang);
        const hIdx = addAtom("H", hx, hy, 0);
        addBond(rIdx, hIdx, 1);
        placedH++;
      }
    }
  }

  // Remaining hydrogens on other atoms
  for (let p = 0; p < atoms.length && placedH < hTotal; p++) {
    if (aromaticRingAtoms.has(p)) continue;
    const parent = atoms[p]!;
    if (parent.element === "H") continue;
    const maxV = ELEMENT_MAX_VALENCE[parent.element] ?? 4;
    const remaining = maxV - (valenceUsed[p] ?? 0);

    for (let r = 0; r < remaining && placedH < hTotal; r++) {
      const hDist = getBondDistance(parent.element, "H");
      const ang = (r * 2 * Math.PI) / (remaining + 1);
      const x = parent.x3d + hDist * Math.cos(ang);
      const y = parent.y3d + hDist * Math.sin(ang);
      const z = parent.z3d + (r % 2 === 0 ? 0.4 : -0.4);

      const hIdx = addAtom("H", x, y, z);
      addBond(p, hIdx, 1);
      placedH++;
    }
  }

  // Leftover hydrogens: attach only to non-hydrogen heavy atoms
  const eligibleParents = atoms
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => a.element !== "H" && !["F", "Cl", "Br", "I"].includes(a.element));

  while (placedH < hTotal && eligibleParents.length > 0) {
    const { a: parent, idx: parentIdx } = eligibleParents[placedH % eligibleParents.length]!;
    const rDist = getBondDistance(parent.element, "H", 1);
    const phi = ((placedH * 137.5) * Math.PI) / 180;
    const zOffset = (1 - ((placedH % 6) / 3)) * (rDist * 0.7);
    const rInPlane = Math.sqrt(Math.max(0, rDist * rDist - zOffset * zOffset));
    const x = parent.x3d + rInPlane * Math.cos(phi);
    const y = parent.y3d + rInPlane * Math.sin(phi);
    const z = parent.z3d + zOffset;

    const hIdx = addAtom("H", x, y, z);
    addBond(parentIdx, hIdx, 1, "covalent");
    placedH++;
  }

  // Coordinate metal cations in organic salts (e.g. Na+ in sodium citrate C6H5O7Na3 or sodium acetate)
  if (metalKeys.length > 0 && atoms.length > 0) {
    const oxygens = atoms.filter((a) => a.element === "O");
    const targets = oxygens.length > 0 ? oxygens : atoms.filter((a) => a.element !== "H");
    if (targets.length > 0) {
      for (const mKey of metalKeys) {
        const mCount = comp[mKey] ?? 0;
        for (let m = 0; m < mCount; m++) {
          const target = targets[(m * 2) % targets.length]!;
          const phi = (m * 2 * Math.PI) / mCount + Math.PI / 4;
          const dMO = 2.15;
          const mx = target.x3d + Math.cos(phi) * dMO;
          const my = target.y3d + Math.sin(phi) * dMO;
          const mz = target.z3d + 0.6 * (m % 2 === 0 ? 1 : -1);
          const mIdx = addAtom(mKey, mx, my, mz);
          addBond(target.atomIndex, mIdx, 1, "ionic");
        }
      }
    }
  }

  relaxGeometry(atoms, bonds, rng, aromaticRingAtoms, fastMode);
  return { curated: true, atoms, bonds };
}

// -----------------------------------------------------------------------------
// 7. Physical Molecular Mechanics Force Field Relaxation
// -----------------------------------------------------------------------------

function relaxGeometry(
  atoms: MoleculeStructure["atoms"],
  bonds: MoleculeStructure["bonds"],
  rng: () => number,
  aromaticRingAtoms: Set<number> = new Set(),
  fastMode = false
) {
  if (atoms.length <= 1) return;

  const adj: Map<number, { neighbor: number; order: 1 | 2 | 3; type: "covalent" | "ionic" }[]> = new Map();
  for (let i = 0; i < atoms.length; i++) adj.set(i, []);
  for (const b of bonds) {
    adj.get(b.atomIndex1)?.push({ neighbor: b.atomIndex2, order: b.order, type: b.type });
    adj.get(b.atomIndex2)?.push({ neighbor: b.atomIndex1, order: b.order, type: b.type });
  }

  const iterations = fastMode ? 5 : 100;

  for (let iter = 0; iter < iterations; iter++) {
    // 1. Harmonic Bond Distance Springs
    for (const b of bonds) {
      const a1 = atoms[b.atomIndex1]!;
      const a2 = atoms[b.atomIndex2]!;
      const targetDist = b.type === "ionic" ? 2.35 : getBondDistance(a1.element, a2.element, b.order);

      let dx = a2.x3d - a1.x3d;
      let dy = a2.y3d - a1.y3d;
      let dz = a2.z3d - a1.z3d;
      let dist = Math.hypot(dx, dy, dz);
      if (dist < 0.001) {
        dx = (rng() - 0.5) * 0.1;
        dy = (rng() - 0.5) * 0.1;
        dz = 0;
        dist = Math.hypot(dx, dy, dz) || 0.1;
      }

      const diff = (dist - targetDist) * 0.5;
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      // If either atom is in an aromatic ring, ring carbon position is protected from z shifts
      const a1IsArom = aromaticRingAtoms.has(b.atomIndex1);
      const a2IsArom = aromaticRingAtoms.has(b.atomIndex2);

      a1.x3d += nx * diff * 0.5;
      a1.y3d += ny * diff * 0.5;
      a1.z3d += nz * diff * 0.5;

      a2.x3d -= nx * diff * 0.5;
      a2.y3d -= ny * diff * 0.5;
      a2.z3d -= nz * diff * 0.5;
    }

    // 2. Harmonic Bond Angle Restorations
    for (let b = 0; b < atoms.length; b++) {
      const nList = adj.get(b);
      if (!nList || nList.length < 2) continue;

      const center = atoms[b]!;
      const isLinear = nList.length === 2 && nList.some((e) => e.order === 3);
      const isPlanar = nList.some((e) => e.order === 2);
      const isArom = aromaticRingAtoms.has(b);
      const targetAngleRad = isLinear
        ? Math.PI
        : isPlanar || isArom || nList.length === 3
        ? (120 * Math.PI) / 180
        : (109.5 * Math.PI) / 180;

      for (let i = 0; i < nList.length; i++) {
        for (let j = i + 1; j < nList.length; j++) {
          const a1 = atoms[nList[i]!.neighbor]!;
          const a2 = atoms[nList[j]!.neighbor]!;

          const v1 = { x: a1.x3d - center.x3d, y: a1.y3d - center.y3d, z: a1.z3d - center.z3d };
          const v2 = { x: a2.x3d - center.x3d, y: a2.y3d - center.y3d, z: a2.z3d - center.z3d };
          const d1 = Math.hypot(v1.x, v1.y, v1.z) || 1e-6;
          const d2 = Math.hypot(v2.x, v2.y, v2.z) || 1e-6;

          const dot = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (d1 * d2);
          const clampedDot = Math.max(-1, Math.min(1, dot));
          const currentAngle = Math.acos(clampedDot);

          const angleDiff = targetAngleRad - currentAngle;
          if (Math.abs(angleDiff) > 0.05) {
            const push = angleDiff * 0.04;
            const u1 = { x: v1.x / d1, y: v1.y / d1, z: v1.z / d1 };
            const u2 = { x: v2.x / d2, y: v2.y / d2, z: v2.z / d2 };

            // Strictly perpendicular to bond u1 in the (u1, u2) plane
            const p1x = u2.x - clampedDot * u1.x;
            const p1y = u2.y - clampedDot * u1.y;
            const p1z = u2.z - clampedDot * u1.z;
            const p1Len = Math.hypot(p1x, p1y, p1z) || 1e-4;

            // Strictly perpendicular to bond u2 in the (u1, u2) plane
            const p2x = u1.x - clampedDot * u2.x;
            const p2y = u1.y - clampedDot * u2.y;
            const p2z = u1.z - clampedDot * u2.z;
            const p2Len = Math.hypot(p2x, p2y, p2z) || 1e-4;

            a1.x3d -= (p1x / p1Len) * push;
            a1.y3d -= (p1y / p1Len) * push;
            a1.z3d -= (p1z / p1Len) * push;

            a2.x3d -= (p2x / p2Len) * push;
            a2.y3d -= (p2y / p2Len) * push;
            a2.z3d -= (p2z / p2Len) * push;
          }
        }
      }
    }

    // 3. Van der Waals Steric Clash Repulsion
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const isBonded = adj.get(i)?.some((e) => e.neighbor === j);
        if (isBonded) continue;

        const a1 = atoms[i]!;
        const a2 = atoms[j]!;

        let dx = a2.x3d - a1.x3d;
        let dy = a2.y3d - a1.y3d;
        let dz = a2.z3d - a1.z3d;
        let dist = Math.hypot(dx, dy, dz);

        const is13 = adj.get(i)?.some((e) => adj.get(e.neighbor)?.some((n2) => n2.neighbor === j));
        const minDist13 = a1.element === "H" && a2.element === "H" ? 1.40 : 1.90;
        if (is13 && dist >= minDist13) continue;

        const r1 = getVdwRadius(a1.element);
        const r2 = getVdwRadius(a2.element);
        const contactDist = is13 ? Math.min((r1 + r2) * 0.65, minDist13) : (r1 + r2) * 0.65;

        if (dist < contactDist) {
          if (dist < 0.001) {
            dx = (rng() - 0.5) * 0.1;
            dy = (rng() - 0.5) * 0.1;
            dz = (rng() - 0.5) * 0.1;
            dist = Math.hypot(dx, dy, dz) || 0.1;
          }

          // If severe clash, relieve saddle points:
          // 1) co-axial alignment (near-zero xy distance): kick laterally
          // 2) coplanar alignment (near-zero z distance): kick out-of-plane
          if (dist < 0.90) {
            const dxy = Math.hypot(dx, dy);
            if (dxy < 0.40) {
              if (dxy > 0.001) {
                const uxy = 0.50 / dxy;
                dx += dx * uxy;
                dy += dy * uxy;
              } else {
                const angle = ((i * 31 + j * 17) % 360) * (Math.PI / 180);
                dx += Math.cos(angle) * 0.50;
                dy += Math.sin(angle) * 0.50;
              }
              dist = Math.hypot(dx, dy, dz) || 0.1;
            } else if (Math.abs(dz) < 0.25) {
              const zKick = (a1.z3d >= a2.z3d ? 1 : -1) * 0.35;
              dz += zKick;
              dist = Math.hypot(dx, dy, dz) || 0.1;
            }
          }

          const push = dist < 0.85
            ? Math.max((contactDist - dist) * 0.65, 0.45)
            : (contactDist - dist) * 0.35;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          const isAromNode = (idx: number) => {
            if (aromaticRingAtoms.has(idx)) return true;
            if (atoms[idx]?.element === "H") {
              const nbrs = adj.get(idx) || [];
              if (nbrs.some((n) => aromaticRingAtoms.has(n.neighbor))) return true;
            }
            return false;
          };
          const a1IsArom = isAromNode(i);
          const a2IsArom = isAromNode(j);

          const w1 = dist < 0.70
            ? 0.5
            : a1IsArom && !a2IsArom ? 0.25 : !a1IsArom && a2IsArom ? 0.75 : 0.5;
          const w2 = 1.0 - w1;

          if (w1 > 0) {
            a1.x3d -= nx * push * w1;
            a1.y3d -= ny * push * w1;
            a1.z3d -= nz * push * w1;
          }
          if (w2 > 0) {
            a2.x3d += nx * push * w2;
            a2.y3d += ny * push * w2;
            a2.z3d += nz * push * w2;
          }
        }
      }
    }

    // 4. Strict Covalent Bond Length Preservation (SHAKE-like enforcement)
    for (const b of bonds) {
      if (b.type === "ionic") continue;
      const a1 = atoms[b.atomIndex1]!;
      const a2 = atoms[b.atomIndex2]!;
      const targetDist = getBondDistance(a1.element, a2.element, b.order);
      const dx = a2.x3d - a1.x3d;
      const dy = a2.y3d - a1.y3d;
      const dz = a2.z3d - a1.z3d;
      const dist = Math.hypot(dx, dy, dz) || 1e-4;
      const diff = dist - targetDist;
      if (Math.abs(diff) > 0.03) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const corr = diff * 0.6;

        a1.x3d += nx * corr * 0.5;
        a1.y3d += ny * corr * 0.5;
        a1.z3d += nz * corr * 0.5;

        a2.x3d -= nx * corr * 0.5;
        a2.y3d -= ny * corr * 0.5;
        a2.z3d -= nz * corr * 0.5;
      }
    }

    // 5. Strict Planar Enforce: keep single isolated aromatic systems flat at z = 0
    if (aromaticRingAtoms.size <= 10) {
      for (const rIdx of aromaticRingAtoms) {
        const a = atoms[rIdx]!;
        a.z3d = 0;
        for (const n of adj.get(rIdx) || []) {
          const neighborAtom = atoms[n.neighbor]!;
          if (neighborAtom.element === "H") {
            neighborAtom.z3d = 0;
          }
        }
      }
    }
  }

  // Final convergence pass: snap all covalent bonds strictly towards target length
  for (let snap = 0; snap < 8; snap++) {
    for (const b of bonds) {
      if (b.type === "ionic") continue;
      const a1 = atoms[b.atomIndex1]!;
      const a2 = atoms[b.atomIndex2]!;
      const targetDist = getBondDistance(a1.element, a2.element, b.order);
      const dx = a2.x3d - a1.x3d;
      const dy = a2.y3d - a1.y3d;
      const dz = a2.z3d - a1.z3d;
      const dist = Math.hypot(dx, dy, dz) || 1e-4;
      const diff = dist - targetDist;
      if (Math.abs(diff) > 0.02) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const corr = diff * 0.5;
        a1.x3d += nx * corr * 0.5;
        a1.y3d += ny * corr * 0.5;
        a1.z3d += nz * corr * 0.5;

        a2.x3d -= nx * corr * 0.5;
        a2.y3d -= ny * corr * 0.5;
        a2.z3d -= nz * corr * 0.5;
      }
    }
  }

  // Recenter molecule at (0, 0, 0)
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  for (const a of atoms) {
    sumX += a.x3d;
    sumY += a.y3d;
    sumZ += a.z3d;
  }
  const avgX = sumX / atoms.length;
  const avgY = sumY / atoms.length;
  const avgZ = sumZ / atoms.length;

  for (const a of atoms) {
    a.x3d = Number((a.x3d - avgX).toFixed(3));
    a.y3d = Number((a.y3d - avgY).toFixed(3));
    a.z3d = Number((a.z3d - avgZ).toFixed(3));
    a.x2d = Math.round(a.x3d * 42);
    a.y2d = Math.round(a.y3d * 42);
  }
}

function parseHydrateFormula(formula: string, commonName = ""): { baseFormula: string; waterCount: number } | null {
  const normName = commonName.trim();
  const normForm = formula.trim();

  // 1. Check common name for dot / hyphen notation: e.g. "MgCl2.6H2O", "CuSO4·5H2O", "NiCl2-6H2O", "Fe(NO3)3.9H2O"
  const nameMatch = normName.match(/^(.+?)[.·\-]\s*(\d*(?:\.\d+)?)\s*H2O$/i);
  if (nameMatch) {
    const base = nameMatch[1]!.trim();
    const wStr = nameMatch[2]!.trim();
    const wCount = wStr ? Math.round(parseFloat(wStr)) : 1;
    return { baseFormula: base, waterCount: wCount };
  }

  // 2. Check formula for parenthesis: e.g. "CuSO4(H2O)5", "Fe(NO3)3(H2O)9"
  const parenMatch = normForm.match(/^(.+?)\(H2O\)(\d*)$/i);
  if (parenMatch) {
    const base = parenMatch[1]!.trim();
    const wCount = parenMatch[2] ? parseInt(parenMatch[2], 10) : 1;
    return { baseFormula: base, waterCount: wCount };
  }

  // 3. Check formula ending with nH2O: e.g. "MgCl26H2O", "ZnSO47H2O", "CuSO45H2O", "FeCl36H2O", "Na2SO410H2O"
  if (!/^C\d*H\d*O\d*$/.test(normForm)) {
    const endMatch = normForm.match(/^([A-Z][A-Za-z0-9\(\)]*?)(\d+)H2O$/i);
    if (endMatch) {
      const base = endMatch[1]!.trim();
      const wCount = parseInt(endMatch[2]!, 10);
      return { baseFormula: base, waterCount: wCount };
    }
    const singleH2OMatch = normForm.match(/^([A-Z][A-Za-z0-9\(\)]*?)H2O$/i);
    if (singleH2OMatch && singleH2OMatch[1] !== "H2") {
      return { baseFormula: singleH2OMatch[1]!.trim(), waterCount: 1 };
    }
  }

  return null;
}

function attachHydrateWaters(
  struct: MoleculeStructure,
  waterCount: number
): MoleculeStructure {
  if (waterCount <= 0 || struct.atoms.length === 0) return struct;

  // Find central cation or atom with highest valence
  let centerIdx = 0;
  for (let i = 0; i < struct.atoms.length; i++) {
    const el = struct.atoms[i]!.element;
    const curEl = struct.atoms[centerIdx]!.element;
    if ((ELEMENT_MAX_VALENCE[el] ?? 0) > (ELEMENT_MAX_VALENCE[curEl] ?? 0)) {
      centerIdx = i;
    }
  }
  const centerAtom = struct.atoms[centerIdx]!;

  const numWatersToAttach = Math.min(Math.max(1, waterCount), 2);
  const atoms = [...struct.atoms];
  const bonds = [...struct.bonds];

  for (let w = 0; w < numWatersToAttach; w++) {
    const sign = w === 0 ? 1 : -1;
    let bestDir = { x: 0, y: sign * 0.8, z: sign * 0.6 };
    let maxMinDist = 0;
    for (let t = 0; t < 12; t++) {
      const theta = (t * 2 * Math.PI) / 12;
      const testDir = {
        x: Math.cos(theta) * 0.8,
        y: Math.sin(theta) * 0.8,
        z: sign * 0.6,
      };
      const len = Math.hypot(testDir.x, testDir.y, testDir.z) || 1;
      const ux = testDir.x / len;
      const uy = testDir.y / len;
      const uz = testDir.z / len;
      const testOx = centerAtom.x3d + ux * 2.15;
      const testOy = centerAtom.y3d + uy * 2.15;
      const testOz = centerAtom.z3d + uz * 2.15;
      let minDist = 999;
      for (const a of atoms) {
        const dist = Math.hypot(testOx - a.x3d, testOy - a.y3d, testOz - a.z3d);
        if (dist < minDist) minDist = dist;
      }
      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestDir = { x: ux, y: uy, z: uz };
      }
    }

    const ox = centerAtom.x3d + bestDir.x * 2.15;
    const oy = centerAtom.y3d + bestDir.y * 2.15;
    const oz = centerAtom.z3d + bestDir.z * 2.15;
    const oIdx = atoms.length;
    atoms.push({
      atomIndex: oIdx,
      element: "O",
      x3d: Number(ox.toFixed(3)),
      y3d: Number(oy.toFixed(3)),
      z3d: Number(oz.toFixed(3)),
      x2d: Math.round(ox * 35),
      y2d: Math.round(oy * 35),
    });
    bonds.push({ atomIndex1: centerIdx, atomIndex2: oIdx, order: 1, type: "ionic" });

    // Hydrogens point radially outward away from centerAtom
    const ref = Math.abs(bestDir.z) < 0.8 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
    const px = bestDir.y * ref.z - bestDir.z * ref.y;
    const py = bestDir.z * ref.x - bestDir.x * ref.z;
    const pz = bestDir.x * ref.y - bestDir.y * ref.x;
    const pLen = Math.hypot(px, py, pz) || 1;
    const pNorm = { x: px / pLen, y: py / pLen, z: pz / pLen };

    const cosH = Math.cos((52.25 * Math.PI) / 180);
    const sinH = Math.sin((52.25 * Math.PI) / 180);
    const dOH = 0.96;

    const h1x = ox + dOH * (cosH * bestDir.x + sinH * pNorm.x);
    const h1y = oy + dOH * (cosH * bestDir.y + sinH * pNorm.y);
    const h1z = oz + dOH * (cosH * bestDir.z + sinH * pNorm.z);
    const h1Idx = atoms.length;
    atoms.push({
      atomIndex: h1Idx,
      element: "H",
      x3d: Number(h1x.toFixed(3)),
      y3d: Number(h1y.toFixed(3)),
      z3d: Number(h1z.toFixed(3)),
      x2d: Math.round(h1x * 35),
      y2d: Math.round(h1y * 35),
    });
    bonds.push({ atomIndex1: oIdx, atomIndex2: h1Idx, order: 1, type: "covalent" });

    const h2x = ox + dOH * (cosH * bestDir.x - sinH * pNorm.x);
    const h2y = oy + dOH * (cosH * bestDir.y - sinH * pNorm.y);
    const h2z = oz + dOH * (cosH * bestDir.z - sinH * pNorm.z);
    const h2Idx = atoms.length;
    atoms.push({
      atomIndex: h2Idx,
      element: "H",
      x3d: Number(h2x.toFixed(3)),
      y3d: Number(h2y.toFixed(3)),
      z3d: Number(h2z.toFixed(3)),
      x2d: Math.round(h2x * 35),
      y2d: Math.round(h2y * 35),
    });
    bonds.push({ atomIndex1: oIdx, atomIndex2: h2Idx, order: 1, type: "covalent" });
  }

  return { curated: struct.curated, atoms, bonds };
}

const SOLVENT_ABBREVIATIONS: Record<string, string> = {
  EtOH: "CCO",
  MeOH: "CO",
  EtOAc: "CCOC(=O)C",
  AcOH: "CC(=O)O",
  THF: "C1CCOC1",
  DMF: "CN(C)C=O",
  MeCN: "CC#N",
  CH3CN: "CC#N",
  CH3OH: "CO",
  CH2Cl2: "ClCCl",
  HCl: "Cl",
  N2H4: "NN",
};

// -----------------------------------------------------------------------------
// 2D Molecular Coordinate Enhancer & Planar Relaxation
// -----------------------------------------------------------------------------

/**
 * Enhances 2D molecular layout to produce clear, non-overlapping, textbook-quality coordinates.
 * Resolves atom collisions (especially overlapping hydrogens and compact ions) using constrained
 * planar force-directed relaxation, spring bond targets (~44px), angular repulsion, and component centering.
 */
export function enhance2DCoordinates(struct: MoleculeStructure): MoleculeStructure {
  if (!struct || !struct.atoms || struct.atoms.length <= 1) return struct;
  const atoms = struct.atoms.map((a) => ({ ...a }));
  const bonds = struct.bonds || [];
  const n = atoms.length;

  if (n === 2) {
    const d = 48;
    atoms[0]!.x2d = -d / 2;
    atoms[0]!.y2d = 0;
    atoms[1]!.x2d = d / 2;
    atoms[1]!.y2d = 0;
    return { ...struct, atoms };
  }

  // Build adjacency list
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const b of bonds) {
    if (b.atomIndex1 < n && b.atomIndex2 < n && b.atomIndex1 !== b.atomIndex2) {
      adj[b.atomIndex1]!.push(b.atomIndex2);
      adj[b.atomIndex2]!.push(b.atomIndex1);
    }
  }

  // Pre-process: break any exact or near-exact coordinate collisions (d < 10px)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = atoms[i]!.x2d - atoms[j]!.x2d;
      const dy = atoms[i]!.y2d - atoms[j]!.y2d;
      const d = Math.hypot(dx, dy);
      if (d < 10) {
        const angle = (((i * 47 + j * 89) % 360) * Math.PI) / 180;
        atoms[j]!.x2d += Math.round(Math.cos(angle) * 22);
        atoms[j]!.y2d += Math.round(Math.sin(angle) * 22);
      }
    }
  }

  // Force-directed planar relaxation
  const TARGET_BOND = 44;
  const ITERATIONS = 55;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);
    const temp = 1.0 - (iter / ITERATIONS) * 0.72;

    // 1. Coulomb repulsion between all atom pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = atoms[i]!.x2d - atoms[j]!.x2d;
        let dy = atoms[i]!.y2d - atoms[j]!.y2d;
        let d = Math.hypot(dx, dy);
        if (d < 0.1) {
          dx = Math.cos(i + j) || 1;
          dy = Math.sin(i + j) || 1;
          d = Math.hypot(dx, dy);
        }
        const minDist = 34;
        let rep: number;
        if (d < minDist) {
          rep = (450 * (minDist - d)) / d;
        } else {
          rep = 1400 / (d * d);
        }
        const forceX = (dx / d) * rep;
        const forceY = (dy / d) * rep;
        fx[i]! += forceX;
        fy[i]! += forceY;
        fx[j]! -= forceX;
        fy[j]! -= forceY;
      }
    }

    // 2. Spring attraction along bonds
    for (const b of bonds) {
      const i = b.atomIndex1;
      const j = b.atomIndex2;
      if (i >= n || j >= n) continue;
      let dx = atoms[j]!.x2d - atoms[i]!.x2d;
      let dy = atoms[j]!.y2d - atoms[i]!.y2d;
      let d = Math.hypot(dx, dy);
      if (d < 0.1) d = 0.1;
      const spring = 0.28 * (d - TARGET_BOND);
      const forceX = (dx / d) * spring;
      const forceY = (dy / d) * spring;
      fx[i]! += forceX;
      fy[i]! += forceY;
      fx[j]! -= forceX;
      fy[j]! -= forceY;
    }

    // 3. Angular repulsion for neighbors sharing a common atom (prevents acute collapsed angles)
    for (let i = 0; i < n; i++) {
      const neighbors = adj[i]!;
      if (neighbors.length >= 2) {
        for (let a = 0; a < neighbors.length; a++) {
          for (let b = a + 1; b < neighbors.length; b++) {
            const na = neighbors[a]!;
            const nb = neighbors[b]!;
            const dax = atoms[na]!.x2d - atoms[i]!.x2d;
            const day = atoms[na]!.y2d - atoms[i]!.y2d;
            const dbx = atoms[nb]!.x2d - atoms[i]!.x2d;
            const dby = atoms[nb]!.y2d - atoms[i]!.y2d;
            const da = Math.hypot(dax, day) || 1;
            const db = Math.hypot(dbx, dby) || 1;
            const cosAngle = (dax * dbx + day * dby) / (da * db);
            if (cosAngle > 0.34) {
              const push = 20 * (cosAngle - 0.34);
              const sepX = atoms[na]!.x2d - atoms[nb]!.x2d;
              const sepY = atoms[na]!.y2d - atoms[nb]!.y2d;
              const sepD = Math.hypot(sepX, sepY) || 1;
              fx[na]! += (sepX / sepD) * push;
              fy[na]! += (sepY / sepD) * push;
              fx[nb]! -= (sepX / sepD) * push;
              fy[nb]! -= (sepY / sepD) * push;
            }
          }
        }
      }
    }

    // Apply forces with velocity clamping
    const maxStep = 12 * temp;
    for (let i = 0; i < n; i++) {
      const step = Math.hypot(fx[i]!, fy[i]!);
      if (step > maxStep) {
        atoms[i]!.x2d += (fx[i]! / step) * maxStep;
        atoms[i]!.y2d += (fy[i]! / step) * maxStep;
      } else {
        atoms[i]!.x2d += fx[i]!;
        atoms[i]!.y2d += fy[i]!;
      }
    }
  }

  // 4. Center coordinates and round to integers
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const a of atoms) {
    if (a.x2d < minX) minX = a.x2d;
    if (a.x2d > maxX) maxX = a.x2d;
    if (a.y2d < minY) minY = a.y2d;
    if (a.y2d > maxY) maxY = a.y2d;
  }
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  for (const a of atoms) {
    a.x2d = Math.round(a.x2d - midX) || 0;
    a.y2d = Math.round(a.y2d - midY) || 0;
  }

  return { ...struct, atoms };
}

/**
 * Annotates each bond in the structure with chemically accurate bond length (in Å)
 * and primary bond valence angle (in degrees).
 */
export function annotateBondLengthsAndAngles(struct: MoleculeStructure): MoleculeStructure {
  if (!struct || !struct.bonds || struct.bonds.length === 0) return struct;
  const atoms = struct.atoms || [];
  const bonds = struct.bonds;

  const enrichedBonds = bonds.map((b) => {
    const a1 = atoms[b.atomIndex1];
    const a2 = atoms[b.atomIndex2];
    if (!a1 || !a2) return b;

    // 1. Calculate bond length
    let lengthA = b.length;
    if (!lengthA || isNaN(lengthA) || lengthA <= 0) {
      const dx = a2.x3d - a1.x3d;
      const dy = a2.y3d - a1.y3d;
      const dz = a2.z3d - a1.z3d;
      const d3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d3d > 0.35 && d3d < 5.0 && !isNaN(d3d)) {
        lengthA = Number(d3d.toFixed(2));
      } else {
        const orderSymbol = b.order === 3 ? "#" : b.order === 2 ? "=" : "-";
        const key1 = `${a1.element}${orderSymbol}${a2.element}`;
        const key2 = `${a2.element}${orderSymbol}${a1.element}`;
        const keySingle1 = `${a1.element}-${a2.element}`;
        const keySingle2 = `${a2.element}-${a1.element}`;

        if (BOND_LENGTHS[key1]) {
          lengthA = BOND_LENGTHS[key1];
        } else if (BOND_LENGTHS[key2]) {
          lengthA = BOND_LENGTHS[key2];
        } else if (BOND_LENGTHS[keySingle1]) {
          const factor = b.order === 3 ? 0.78 : b.order === 2 ? 0.88 : 1.0;
          lengthA = Number((BOND_LENGTHS[keySingle1] * factor).toFixed(2));
        } else if (BOND_LENGTHS[keySingle2]) {
          const factor = b.order === 3 ? 0.78 : b.order === 2 ? 0.88 : 1.0;
          lengthA = Number((BOND_LENGTHS[keySingle2] * factor).toFixed(2));
        } else {
          lengthA = 1.45;
        }
      }
    }

    if (!lengthA || isNaN(lengthA) || lengthA <= 0) {
      lengthA = 1.45;
    }

    // 2. Calculate primary valence angle
    let angleDeg = b.angle;
    let angleLabel = b.angleLabel;
    if (angleDeg === undefined || isNaN(angleDeg)) {
      const neighbors1: number[] = [];
      const neighbors2: number[] = [];
      for (const other of bonds) {
        if (other === b) continue;
        if (other.atomIndex1 === b.atomIndex1 && other.atomIndex2 !== b.atomIndex2) {
          neighbors1.push(other.atomIndex2);
        } else if (other.atomIndex2 === b.atomIndex1 && other.atomIndex1 !== b.atomIndex2) {
          neighbors1.push(other.atomIndex1);
        }
        if (other.atomIndex1 === b.atomIndex2 && other.atomIndex2 !== b.atomIndex1) {
          neighbors2.push(other.atomIndex2);
        } else if (other.atomIndex2 === b.atomIndex2 && other.atomIndex1 !== b.atomIndex1) {
          neighbors2.push(other.atomIndex1);
        }
      }

      const calc3DAngle = (origin: AtomRecord, p1: AtomRecord, p2: AtomRecord): number => {
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
        if (l1 < 0.001 || l2 < 0.001) return 180;
        const denom = l1 * l2;
        if (denom < 1e-6 || isNaN(denom)) return 180;
        const dot = v1x * v2x + v1y * v2y + v1z * v2z;
        const cosTheta = Math.max(-1, Math.min(1, dot / denom));
        const deg = (Math.acos(cosTheta) * 180) / Math.PI;
        return isNaN(deg) ? 180 : deg;
      };

      if (neighbors1.length > 0 && atoms[neighbors1[0]!]) {
        const nAtom = atoms[neighbors1[0]!]!;
        const ang = calc3DAngle(a1, nAtom, a2);
        const safeAng = isNaN(ang) ? 109.5 : ang;
        angleDeg = Number(safeAng.toFixed(1));
        angleLabel = `${nAtom.element}–${a1.element}–${a2.element}`;
      } else if (neighbors2.length > 0 && atoms[neighbors2[0]!]) {
        const nAtom = atoms[neighbors2[0]!]!;
        const ang = calc3DAngle(a2, a1, nAtom);
        const safeAng = isNaN(ang) ? 109.5 : ang;
        angleDeg = Number(safeAng.toFixed(1));
        angleLabel = `${a1.element}–${a2.element}–${nAtom.element}`;
      } else {
        angleDeg = 180.0;
        angleLabel = "linear";
      }
    }

    if (angleDeg === undefined || isNaN(angleDeg)) {
      angleDeg = 180.0;
      angleLabel = angleLabel || "linear";
    }

    return {
      ...b,
      length: lengthA,
      angle: angleDeg,
      angleLabel,
    };
  });

  return {
    ...struct,
    bonds: enrichedBonds,
  };
}

// -----------------------------------------------------------------------------
// Main Generator Entrypoint
// -----------------------------------------------------------------------------

export function generateMoleculeStructure(
  chemicalId: string,
  formula: string,
  composition?: ElementComposition,
  commonName = "",
  smiles?: string,
  skip2DRelaxation = false
): MoleculeStructure {
  const rng = createSeededRandom(chemicalId || formula || commonName || smiles || "chemlab_seed");

  const finalize = (res: MoleculeStructure): MoleculeStructure => {
    let result = res;
    if (hydrateInfo && hydrateInfo.waterCount > 0) {
      result = attachHydrateWaters(result, hydrateInfo.waterCount);
    }
    const with2D = skip2DRelaxation ? result : enhance2DCoordinates(result);
    return annotateBondLengthsAndAngles(with2D);
  };

  // 1. Prioritize SMILES whenever available
  if (smiles && smiles.trim().length > 0) {
    try {
      const struct = generateFromSmiles(smiles.trim(), rng);
      if (struct && struct.atoms.length > 0) {
        return finalize(struct);
      }
    } catch {
      // Fallback if SMILES parsing fails on rare edge case
    }
  }

  const normFormula = (formula || "").trim();
  const normName = (commonName || "").trim();

  // If formula or common name matches a solvent abbreviation or solvent mixture (e.g. EtOHH2O, EtOH-H2O)
  if (!smiles) {
    if (SOLVENT_ABBREVIATIONS[normFormula]) {
      return generateMoleculeStructure(chemicalId, "", undefined, commonName, SOLVENT_ABBREVIATIONS[normFormula]);
    }
    const solvPrefix = normFormula.replace(/H2O$/i, "").replace(/[-—_]/g, "");
    if (SOLVENT_ABBREVIATIONS[solvPrefix]) {
      return generateMoleculeStructure(chemicalId, "", undefined, commonName, SOLVENT_ABBREVIATIONS[solvPrefix]);
    }
  }

  // Hydrate parsing (e.g. MgCl26H2O, CuSO45H2O, Fe(NO3)3.9H2O, Ba(OH)2.8H2O)
  const hydrateInfo = !smiles ? parseHydrateFormula(normFormula, normName) : null;
  let activeFormula = hydrateInfo ? hydrateInfo.baseFormula : normFormula;

  // Clean formulas where parentheses were stripped in DB (e.g. PbNO32 -> Pb(NO3)2, NH42SO4 -> (NH4)2SO4, CaCO3 for caco3-2)
  if (!smiles && normName && /^[A-Z][A-Za-z0-9\(\)]+$/.test(normName) && !normName.includes(" ")) {
    try {
      const parsedCommon = parseFormula(normName);
      if (Object.keys(parsedCommon.composition).length > 1) {
        activeFormula = normName;
      }
    } catch {}
  }

  // Determine composition
  let comp: ElementComposition = {};
  if (composition && Object.keys(composition).length > 0) {
    comp = { ...composition };
  } else if (activeFormula && activeFormula.length > 0) {
    try {
      comp = parseFormula(activeFormula).composition;
    } catch {
      comp = {};
    }
  }

  // 2. Homonuclear elements and small elemental clusters (O2, N2, H2, Cl2, Br2, I2, F2, O3, single atoms)
  const elementKeys = Object.keys(comp).filter((k) => (comp[k] ?? 0) > 0);
  if (elementKeys.length === 1) {
    const elem = elementKeys[0]!;
    const count = comp[elem]!;
    if (count === 1) {
      return {
        curated: true,
        atoms: [{ atomIndex: 0, element: elem, x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0 }],
        bonds: [],
      };
    }
    if (count === 2) {
      const d = getBondDistance(elem, elem) || (elem === "H" ? 0.74 : 1.4);
      const order = elem === "N" ? 3 : elem === "O" ? 2 : 1;
      return {
        curated: true,
        atoms: [
          { atomIndex: 0, element: elem, x3d: Number((-d / 2).toFixed(3)), y3d: 0, z3d: 0, x2d: -30, y2d: 0 },
          { atomIndex: 1, element: elem, x3d: Number((d / 2).toFixed(3)), y3d: 0, z3d: 0, x2d: 30, y2d: 0 },
        ],
        bonds: [{ atomIndex1: 0, atomIndex2: 1, order: order as 1 | 2 | 3, type: "covalent" }],
      };
    }
    if (count === 3 && elem === "O") {
      const d = 1.28;
      const angle = (116.8 * Math.PI) / 180;
      return {
        curated: true,
        atoms: [
          { atomIndex: 0, element: "O", x3d: 0, y3d: 0.35, z3d: 0, x2d: 0, y2d: 20 },
          { atomIndex: 1, element: "O", x3d: Number((-d * Math.sin(angle / 2)).toFixed(3)), y3d: -0.35, z3d: 0, x2d: -35, y2d: -20 },
          { atomIndex: 2, element: "O", x3d: Number((d * Math.sin(angle / 2)).toFixed(3)), y3d: -0.35, z3d: 0, x2d: 35, y2d: -20 },
        ],
        bonds: [
          { atomIndex1: 0, atomIndex2: 1, order: 2, type: "covalent" },
          { atomIndex1: 0, atomIndex2: 2, order: 1, type: "covalent" },
        ],
      };
    }
    if (count > 2) {
      const d = Math.max(1.4, getBondDistance(elem, elem) || 2.0);
      const atoms: MoleculeStructure["atoms"] = [];
      const bonds: MoleculeStructure["bonds"] = [];
      const gridSize = Math.ceil(Math.cbrt(count));
      let placedCount = 0;
      const gridCoords: [number, number, number][] = [];

      for (let x = 0; x < gridSize && placedCount < count; x++) {
        for (let y = 0; y < gridSize && placedCount < count; y++) {
          for (let z = 0; z < gridSize && placedCount < count; z++) {
            const xPos = Number(((x - (gridSize - 1) / 2) * d).toFixed(3));
            const yPos = Number(((y - (gridSize - 1) / 2) * d).toFixed(3));
            const zPos = Number(((z - (gridSize - 1) / 2) * d).toFixed(3));
            atoms.push({
              atomIndex: placedCount,
              element: elem,
              x3d: xPos,
              y3d: yPos,
              z3d: zPos,
              x2d: Math.round(xPos * 30),
              y2d: Math.round(yPos * 30),
            });
            gridCoords.push([x, y, z]);
            placedCount++;
          }
        }
      }

      for (let i = 0; i < atoms.length; i++) {
        const [x1, y1, z1] = gridCoords[i]!;
        for (let j = i + 1; j < atoms.length; j++) {
          const [x2, y2, z2] = gridCoords[j]!;
          const manhattan = Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2);
          if (manhattan === 1) {
            bonds.push({ atomIndex1: i, atomIndex2: j, order: 1, type: "covalent" });
          }
        }
      }

      return finalize({ curated: true, atoms, bonds });
    }
  }

// -----------------------------------------------------------------------------
// Curated Transition Metal Oxoanions, Complexes & Inorganic Salt Templates
// -----------------------------------------------------------------------------

function generateCuratedComplexOrSalt(
  comp: ElementComposition,
  formula: string,
  commonName: string
): MoleculeStructure | null {
  const isDivalentMetal = (m: string) => ["Ba", "Pb", "Sr", "Ca", "Mg"].includes(m);

  // Helper to add a counter-cation, expanding NH4+ into N+ with 4 tetrahedral H atoms if applicable
  const addCation = (
    atoms: MoleculeStructure["atoms"],
    bonds: MoleculeStructure["bonds"],
    m: string,
    targetO: number,
    pos3d: { x: number; y: number; z: number },
    pos2d: { x: number; y: number },
    charge = 1
  ) => {
    const idx = atoms.length;
    atoms.push({
      atomIndex: idx,
      element: m,
      x3d: Number(pos3d.x.toFixed(3)),
      y3d: Number(pos3d.y.toFixed(3)),
      z3d: Number(pos3d.z.toFixed(3)),
      x2d: Math.round(pos2d.x) || 0,
      y2d: Math.round(pos2d.y) || 0,
      formalCharge: charge,
    });
    bonds.push({ atomIndex1: targetO, atomIndex2: idx, order: 1, type: "ionic" });

    if (m === "N" && (comp["H"] ?? 0) >= 4) {
      const hOffsets = [
        { x: 0.8, y: 0.6, z: 0.3, x2d: 14, y2d: -14 },
        { x: -0.8, y: -0.6, z: 0.3, x2d: -14, y2d: 14 },
        { x: -0.6, y: 0.8, z: -0.3, x2d: -14, y2d: -14 },
        { x: 0.6, y: -0.8, z: -0.3, x2d: 14, y2d: 14 },
      ];
      for (const ho of hOffsets) {
        const hIdx = atoms.length;
        atoms.push({
          atomIndex: hIdx,
          element: "H",
          x3d: Number((pos3d.x + ho.x).toFixed(3)),
          y3d: Number((pos3d.y + ho.y).toFixed(3)),
          z3d: Number((pos3d.z + ho.z).toFixed(3)),
          x2d: Math.round(pos2d.x + ho.x2d) || 0,
          y2d: Math.round(pos2d.y + ho.y2d) || 0,
        });
        bonds.push({ atomIndex1: idx, atomIndex2: hIdx, order: 1, type: "covalent" });
      }
    }
  };

  // 1. Dichromates: Cr2O7^2- (e.g. K2Cr2O7, Na2Cr2O7, (NH4)2Cr2O7)
  if ((comp["Cr"] ?? 0) === 2 && (comp["O"] ?? 0) === 7) {
    const metals = Object.keys(comp).filter((k) => k !== "Cr" && k !== "O" && k !== "H");
    const atoms: MoleculeStructure["atoms"] = [];
    const bonds: MoleculeStructure["bonds"] = [];

    atoms.push({ atomIndex: 0, element: "O", x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0 });
    const crDist = 1.78;
    atoms.push({ atomIndex: 1, element: "Cr", x3d: -crDist, y3d: 0, z3d: 0, x2d: -44, y2d: 0, formalCharge: 0 });
    atoms.push({ atomIndex: 2, element: "Cr", x3d: crDist, y3d: 0, z3d: 0, x2d: 44, y2d: 0, formalCharge: 0 });
    bonds.push({ atomIndex1: 1, atomIndex2: 0, order: 1, type: "covalent" });
    bonds.push({ atomIndex1: 2, atomIndex2: 0, order: 1, type: "covalent" });

    const t1 = [
      { ox: -crDist - 1.2, oy: 1.1, oz: 0, x2d: -75, y2d: -30, order: 2 as const, charge: 0 },
      { ox: -crDist - 1.2, oy: -1.1, oz: 0, x2d: -75, y2d: 30, order: 2 as const, charge: 0 },
      { ox: -crDist, oy: 0, oz: 1.6, x2d: -44, y2d: -40, order: 1 as const, charge: -1 },
    ];
    const oAnionIdxs: number[] = [];
    for (const t of t1) {
      const idx = atoms.length;
      atoms.push({
        atomIndex: idx,
        element: "O",
        x3d: Number(t.ox.toFixed(3)),
        y3d: Number(t.oy.toFixed(3)),
        z3d: Number(t.oz.toFixed(3)),
        x2d: t.x2d,
        y2d: t.y2d,
        formalCharge: t.charge,
      });
      bonds.push({ atomIndex1: 1, atomIndex2: idx, order: t.order, type: "covalent" });
      if (t.charge === -1) oAnionIdxs.push(idx);
    }

    const t2 = [
      { ox: crDist + 1.2, oy: 1.1, oz: 0, x2d: 75, y2d: -30, order: 2 as const, charge: 0 },
      { ox: crDist + 1.2, oy: -1.1, oz: 0, x2d: 75, y2d: 30, order: 2 as const, charge: 0 },
      { ox: crDist, oy: 0, oz: -1.6, x2d: 44, y2d: 40, order: 1 as const, charge: -1 },
    ];
    for (const t of t2) {
      const idx = atoms.length;
      atoms.push({
        atomIndex: idx,
        element: "O",
        x3d: Number(t.ox.toFixed(3)),
        y3d: Number(t.oy.toFixed(3)),
        z3d: Number(t.oz.toFixed(3)),
        x2d: t.x2d,
        y2d: t.y2d,
        formalCharge: t.charge,
      });
      bonds.push({ atomIndex1: 2, atomIndex2: idx, order: t.order, type: "covalent" });
      if (t.charge === -1) oAnionIdxs.push(idx);
    }

    let cIdx = 0;
    for (const m of metals) {
      const mCount = comp[m] || 0;
      for (let i = 0; i < mCount; i++) {
        const targetO = oAnionIdxs[cIdx % oAnionIdxs.length]!;
        cIdx++;
        const oAtom = atoms[targetO]!;
        const sign = oAtom.x2d < 0 ? -1 : 1;
        addCation(
          atoms,
          bonds,
          m,
          targetO,
          { x: oAtom.x3d + sign * 2.1, y: oAtom.y3d, z: oAtom.z3d },
          { x: oAtom.x2d + sign * 40, y: oAtom.y2d },
          isDivalentMetal(m) ? 2 : 1
        );
      }
    }
    return { curated: true, atoms, bonds };
  }

  // 2. Permanganates (MnO4^-), Manganates (MnO4^2-), Chromates (CrO4^2-)
  const isMnOxo = (comp["Mn"] ?? 0) === 1 && (comp["O"] ?? 0) === 4;
  const isCrOxo = (comp["Cr"] ?? 0) === 1 && (comp["O"] ?? 0) === 4;
  if (isMnOxo || isCrOxo) {
    const centerElem = isMnOxo ? "Mn" : "Cr";
    const metals = Object.keys(comp).filter((k) => k !== centerElem && k !== "O" && k !== "H");
    const atoms: MoleculeStructure["atoms"] = [];
    const bonds: MoleculeStructure["bonds"] = [];

    atoms.push({ atomIndex: 0, element: centerElem, x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0, formalCharge: 0 });
    const tetDirs = [
      { x: 0.577, y: 0.577, z: 0.577, x2d: 0, y2d: -44 },
      { x: 0.577, y: -0.577, z: -0.577, x2d: 42, y2d: 14 },
      { x: -0.577, y: 0.577, z: -0.577, x2d: -42, y2d: 14 },
      { x: -0.577, y: -0.577, z: 0.577, x2d: 0, y2d: 44 },
    ];
    const m_o_dist = 1.62;
    const numAnionic = isMnOxo && (comp["K"] === 1 || comp["Na"] === 1 || comp["H"] === 1) ? 1 : 2;

    const anionicOIndices: number[] = [];
    for (let o = 0; o < 4; o++) {
      const dir = tetDirs[o]!;
      const isAnion = o >= 4 - numAnionic;
      const oIdx = atoms.length;
      atoms.push({
        atomIndex: oIdx,
        element: "O",
        x3d: Number((dir.x * m_o_dist).toFixed(3)),
        y3d: Number((dir.y * m_o_dist).toFixed(3)),
        z3d: Number((dir.z * m_o_dist).toFixed(3)),
        x2d: dir.x2d,
        y2d: dir.y2d,
        formalCharge: isAnion ? -1 : 0,
      });
      bonds.push({ atomIndex1: 0, atomIndex2: oIdx, order: (isAnion ? 1 : 2) as 1 | 2, type: "covalent" });
      if (isAnion) anionicOIndices.push(oIdx);
    }

    let cIdx = 0;
    for (const m of metals) {
      const mCount = comp[m] || 0;
      if (mCount === 1 && numAnionic === 2 && isDivalentMetal(m)) {
        // Divalent cation bridging both anionic oxygens (e.g. BaCrO4, PbCrO4)
        const mIdx = atoms.length;
        atoms.push({
          atomIndex: mIdx,
          element: m,
          x3d: 0,
          y3d: 0,
          z3d: -2.1,
          x2d: 0,
          y2d: 46,
          formalCharge: 2,
        });
        bonds.push({ atomIndex1: anionicOIndices[0]!, atomIndex2: mIdx, order: 1, type: "ionic" });
        bonds.push({ atomIndex1: anionicOIndices[1]!, atomIndex2: mIdx, order: 1, type: "ionic" });
      } else {
        for (let j = 0; j < mCount; j++) {
          const targetO = anionicOIndices[cIdx % anionicOIndices.length]!;
          cIdx++;
          const oAtom = atoms[targetO]!;
          const dir = tetDirs[targetO - 1]!;
          addCation(
            atoms,
            bonds,
            m,
            targetO,
            { x: oAtom.x3d + dir.x * 2.1, y: oAtom.y3d + dir.y * 2.1, z: oAtom.z3d + dir.z * 2.1 },
            { x: oAtom.x2d + Math.round(dir.x2d * 0.9 || 38), y: oAtom.y2d + Math.round(dir.y2d * 0.9 || 38) },
            isDivalentMetal(m) ? 2 : 1
          );
        }
      }
    }
    return { curated: true, atoms, bonds };
  }

  // 3. Thiosulfates: S2O3^2- (e.g. Na2S2O3)
  if ((comp["S"] ?? 0) === 2 && (comp["O"] ?? 0) === 3) {
    const metals = Object.keys(comp).filter((k) => k !== "S" && k !== "O" && k !== "H");
    const atoms: MoleculeStructure["atoms"] = [];
    const bonds: MoleculeStructure["bonds"] = [];
    atoms.push({ atomIndex: 0, element: "S", x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0, formalCharge: 0 });
    atoms.push({ atomIndex: 1, element: "S", x3d: 0, y3d: -1.95, z3d: 0, x2d: 0, y2d: -44, formalCharge: 0 });
    bonds.push({ atomIndex1: 0, atomIndex2: 1, order: 2, type: "covalent" });

    const oData = [
      { x3d: 1.45, y3d: 0.65, z3d: 0, x2d: 42, y2d: 22, order: 2 as const, charge: 0 },
      { x3d: -1.45, y3d: 0.65, z3d: 0, x2d: -42, y2d: 22, order: 1 as const, charge: -1 },
      { x3d: 0, y3d: 1.55, z3d: 0, x2d: 0, y2d: 44, order: 1 as const, charge: -1 },
    ];
    const anionicO: number[] = [];
    for (const od of oData) {
      const idx = atoms.length;
      atoms.push({
        atomIndex: idx,
        element: "O",
        x3d: od.x3d,
        y3d: od.y3d,
        z3d: od.z3d,
        x2d: od.x2d,
        y2d: od.y2d,
        formalCharge: od.charge,
      });
      bonds.push({ atomIndex1: 0, atomIndex2: idx, order: od.order, type: "covalent" });
      if (od.charge === -1) anionicO.push(idx);
    }

    let cIdx = 0;
    for (const m of metals) {
      const mCount = comp[m] || 0;
      for (let j = 0; j < mCount; j++) {
        const targetO = anionicO[cIdx % anionicO.length]!;
        cIdx++;
        const oAtom = atoms[targetO]!;
        addCation(
          atoms,
          bonds,
          m,
          targetO,
          { x: oAtom.x3d + (oAtom.x3d < 0 ? -2.0 : 2.0), y: oAtom.y3d, z: oAtom.z3d },
          { x: oAtom.x2d + (oAtom.x2d < 0 ? -38 : 38), y: oAtom.y2d },
          isDivalentMetal(m) ? 2 : 1
        );
      }
    }
    return { curated: true, atoms, bonds };
  }

  // 4. Hexacyanoferrate complexes: [Fe(CN)6]^4- / [Fe(CN)6]^3- / Prussian Blue
  const isCyano = (comp["C"] ?? 0) === 6 && (comp["N"] ?? 0) === 6 && (comp["Fe"] ?? 0) >= 1 && (comp["S"] ?? 0) === 0;
  if (isCyano) {
    const metals = Object.keys(comp).filter((k) => k !== "Fe" && k !== "C" && k !== "N");
    const mTotal = metals.reduce((sum, m) => {
      const count = comp[m] || 0;
      const isDivalent = ["Ba", "Pb", "Ca", "Mg", "Sr", "Fe", "Cu", "Zn"].includes(m);
      return sum + count * (isDivalent ? 2 : 1);
    }, 0);
    const feCharge = Math.max(2, 6 - mTotal);

    const atoms: MoleculeStructure["atoms"] = [];
    const bonds: MoleculeStructure["bonds"] = [];
    atoms.push({ atomIndex: 0, element: "Fe", x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0, formalCharge: feCharge });

    const dirs = [
      { x: 1, y: 0, z: 0, x2d: 42, y2d: 0 },
      { x: -1, y: 0, z: 0, x2d: -42, y2d: 0 },
      { x: 0, y: 1, z: 0, x2d: 0, y2d: 42 },
      { x: 0, y: -1, z: 0, x2d: 0, y2d: -42 },
      { x: 0.707, y: 0.707, z: 0, x2d: 30, y2d: 30 },
      { x: -0.707, y: -0.707, z: 0, x2d: -30, y2d: -30 },
    ];
    for (const d of dirs) {
      const cIdx = atoms.length;
      atoms.push({
        atomIndex: cIdx,
        element: "C",
        x3d: Number((d.x * 1.9).toFixed(3)),
        y3d: Number((d.y * 1.9).toFixed(3)),
        z3d: Number((d.z * 1.9).toFixed(3)),
        x2d: d.x2d,
        y2d: d.y2d,
      });
      bonds.push({ atomIndex1: 0, atomIndex2: cIdx, order: 1, type: "covalent" });

      const nIdx = atoms.length;
      atoms.push({
        atomIndex: nIdx,
        element: "N",
        x3d: Number((d.x * 3.05).toFixed(3)),
        y3d: Number((d.y * 3.05).toFixed(3)),
        z3d: Number((d.z * 3.05).toFixed(3)),
        x2d: Math.round(d.x2d * 1.7),
        y2d: Math.round(d.y2d * 1.7),
        formalCharge: -1,
      });
      bonds.push({ atomIndex1: cIdx, atomIndex2: nIdx, order: 3, type: "covalent" });
    }

    let mOrder = 0;
    for (const m of metals) {
      const mCount = comp[m] || 0;
      for (let j = 0; j < mCount; j++) {
        const mIdx = atoms.length;
        const angle = (mOrder * 2 * Math.PI) / mCount + Math.PI / 4;
        const targetN = 2 + (mOrder % 6) * 2;
        mOrder++;
        atoms.push({
          atomIndex: mIdx,
          element: m,
          x3d: Number((Math.cos(angle) * 3.8).toFixed(3)),
          y3d: Number((Math.sin(angle) * 3.8).toFixed(3)),
          z3d: 0,
          x2d: Math.round(Math.cos(angle) * 95) || 0,
          y2d: Math.round(Math.sin(angle) * 95) || 0,
          formalCharge: isDivalentMetal(m) ? 2 : 1,
        });
        bonds.push({ atomIndex1: targetN, atomIndex2: mIdx, order: 1, type: "ionic" });
      }
    }
    return { curated: true, atoms, bonds };
  }

  return null;
}

function generateCoordinationComplex(
  comp: ElementComposition,
  formula: string,
  commonName: string
): MoleculeStructure | null {
  const metals = ["Co", "Cr", "Ni", "Cu", "Fe", "Pt", "Pd", "Ru", "Rh", "Mn", "Zn", "Ag"];
  const metal = metals.find((m) => (comp[m] ?? 0) === 1);
  if (!metal) return null;

  const nCount = comp["N"] ?? 0;
  const hCount = comp["H"] ?? 0;
  // Ammonia complex [M(NH3)n]
  if (nCount >= 2 && nCount <= 6 && hCount >= nCount * 3) {
    const atoms: MoleculeStructure["atoms"] = [];
    const bonds: MoleculeStructure["bonds"] = [];

    // Metal at origin
    atoms.push({ atomIndex: 0, element: metal, x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0 });

    const octDirections = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
    ];
    const sqDirections = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
    ];
    const dirs = nCount === 4 ? sqDirections : octDirections.slice(0, nCount);
    const m_n_dist = 1.96;

    dirs.forEach((dir) => {
      const nx = dir.x * m_n_dist;
      const ny = dir.y * m_n_dist;
      const nz = dir.z * m_n_dist;
      const nIdx = atoms.length;
      atoms.push({
        atomIndex: nIdx,
        element: "N",
        x3d: Number(nx.toFixed(3)),
        y3d: Number(ny.toFixed(3)),
        z3d: Number(nz.toFixed(3)),
        x2d: Math.round(nx * 35),
        y2d: Math.round(ny * 35),
      });
      bonds.push({ atomIndex1: 0, atomIndex2: nIdx, order: 1, type: "covalent" });

      // Perpendicular vectors e1, e2 to dir
      const p1 = Math.abs(dir.x) < 0.8 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
      const dot = p1.x * dir.x + p1.y * dir.y + p1.z * dir.z;
      const e1x = p1.x - dot * dir.x;
      const e1y = p1.y - dot * dir.y;
      const e1z = p1.z - dot * dir.z;
      const e1Len = Math.hypot(e1x, e1y, e1z) || 1;
      const e1 = { x: e1x / e1Len, y: e1y / e1Len, z: e1z / e1Len };
      const e2 = {
        x: dir.y * e1.z - dir.z * e1.y,
        y: dir.z * e1.x - dir.x * e1.z,
        z: dir.x * e1.y - dir.y * e1.x,
      };

      // 3 Hydrogens forming NH3 umbrella
      for (let m = 0; m < 3; m++) {
        const theta = (m * 2 * Math.PI) / 3;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const radOut = 0.94;
        const axial = 0.35;
        const hDist = 1.01;
        const hx = nx + hDist * (axial * dir.x + radOut * (cosT * e1.x + sinT * e2.x));
        const hy = ny + hDist * (axial * dir.y + radOut * (cosT * e1.y + sinT * e2.y));
        const hz = nz + hDist * (axial * dir.z + radOut * (cosT * e1.z + sinT * e2.z));
        const hIdx = atoms.length;
        atoms.push({
          atomIndex: hIdx,
          element: "H",
          x3d: Number(hx.toFixed(3)),
          y3d: Number(hy.toFixed(3)),
          z3d: Number(hz.toFixed(3)),
          x2d: Math.round(hx * 35),
          y2d: Math.round(hy * 35),
        });
        bonds.push({ atomIndex1: nIdx, atomIndex2: hIdx, order: 1, type: "covalent" });
      }
    });

    // Halogen ligands / counterions (e.g. Pt(NH3)2Cl2 or [Co(NH3)6]Cl3)
    const halogens = ["Cl", "Br", "I", "F"];
    const remainingDirs = octDirections.slice(nCount);
    let remDirIdx = 0;
    for (const hal of halogens) {
      const cnt = comp[hal] ?? 0;
      const isInnerSphere = nCount + cnt <= 6;
      const dBond = getBondDistance(metal, hal) || 2.30;
      for (let c = 0; c < cnt; c++) {
        let cx = 0, cy = 0, cz = 0;
        let isBonded = false;
        if (isInnerSphere && remDirIdx < remainingDirs.length) {
          const dir = remainingDirs[remDirIdx++]!;
          cx = dir.x * dBond;
          cy = dir.y * dBond;
          cz = dir.z * dBond;
          isBonded = true;
        } else {
          // Outer sphere counterions coordinate along octahedral face diagonal pockets (±1, ±1, ±1)/√3
          const faceDirs = [
            { x: 0.577, y: 0.577, z: 0.577 },
            { x: -0.577, y: -0.577, z: 0.577 },
            { x: -0.577, y: 0.577, z: -0.577 },
            { x: 0.577, y: -0.577, z: -0.577 },
            { x: 0.577, y: 0.577, z: -0.577 },
            { x: -0.577, y: -0.577, z: -0.577 },
            { x: 0.577, y: -0.577, z: 0.577 },
            { x: -0.577, y: 0.577, z: 0.577 },
          ];
          const dir = faceDirs[c % faceDirs.length]!;
          const dIonic = 2.45;
          cx = dir.x * dIonic;
          cy = dir.y * dIonic;
          cz = dir.z * dIonic;
          isBonded = true;
        }
        const cIdx = atoms.length;
        atoms.push({
          atomIndex: cIdx,
          element: hal,
          x3d: Number(cx.toFixed(3)),
          y3d: Number(cy.toFixed(3)),
          z3d: Number(cz.toFixed(3)),
          x2d: Math.round(cx * 35),
          y2d: Math.round(cy * 35),
          formalCharge: isInnerSphere ? 0 : -1,
        });
        if (isBonded) {
          bonds.push({ atomIndex1: 0, atomIndex2: cIdx, order: 1, type: isInnerSphere ? "covalent" : "ionic" });
        }
      }
    }

    return { curated: true, atoms, bonds };
  }

  return null;
}

function generatePolyOxoanionSalt(
  comp: ElementComposition,
  formula: string,
  commonName: string
): MoleculeStructure | null {
  const centerElem = (comp["S"] ?? 0) > 1 ? "S" : (comp["P"] ?? 0) > 1 ? "P" : null;
  if (!centerElem) return null;
  const sCount = comp[centerElem] ?? 0;
  const oCount = comp["O"] ?? 0;
  if (sCount < 2 || oCount < sCount * 4) return null;

  const metals = Object.keys(comp).filter((k) => k !== centerElem && k !== "O" && k !== "H");
  if (metals.length === 0) return null;

  const atoms: MoleculeStructure["atoms"] = [];
  const bonds: MoleculeStructure["bonds"] = [];

  const tetDirs = [
    { x: 0.577, y: 0.577, z: 0.577 },
    { x: 0.577, y: -0.577, z: -0.577 },
    { x: -0.577, y: 0.577, z: -0.577 },
    { x: -0.577, y: -0.577, z: 0.577 },
  ];
  const s_o_dist = 1.49;

  // Build sCount tetrahedral SO4 / PO4 units
  const oxoIndices: number[][] = [];
  for (let s = 0; s < sCount; s++) {
    const sx = (s - (sCount - 1) / 2) * 3.4;
    const sy = 0;
    const sz = 0;
    const sIdx = atoms.length;
    atoms.push({
      atomIndex: sIdx,
      element: centerElem,
      x3d: Number(sx.toFixed(3)),
      y3d: Number(sy.toFixed(3)),
      z3d: Number(sz.toFixed(3)),
      x2d: Math.round(sx * 35),
      y2d: Math.round(sy * 35),
    });

    const oGroup: number[] = [];
    for (let o = 0; o < 4; o++) {
      const dir = tetDirs[o]!;
      const ox = sx + dir.x * s_o_dist;
      const oy = sy + dir.y * s_o_dist;
      const oz = sz + dir.z * s_o_dist;
      const oIdx = atoms.length;
      atoms.push({
        atomIndex: oIdx,
        element: "O",
        x3d: Number(ox.toFixed(3)),
        y3d: Number(oy.toFixed(3)),
        z3d: Number(oz.toFixed(3)),
        x2d: Math.round(ox * 35),
        y2d: Math.round(oy * 35),
      });
      bonds.push({ atomIndex1: sIdx, atomIndex2: oIdx, order: (o < 2 ? 2 : 1) as 1 | 2, type: "covalent" });
      oGroup.push(oIdx);
    }
    oxoIndices.push(oGroup);
  }

  // Collect all coordinating single-bonded oxygens from the oxoanion groups
  const coordinatingOxygens: { oIdx: number; sx: number; sy: number; sz: number }[] = [];
  for (let s = 0; s < sCount; s++) {
    const sx = (s - (sCount - 1) / 2) * 3.4;
    const group = oxoIndices[s]!;
    coordinatingOxygens.push({ oIdx: group[2]!, sx, sy: 0, sz: 0 });
    coordinatingOxygens.push({ oIdx: group[3]!, sx, sy: 0, sz: 0 });
  }

  // Place metal cations coordinated to oxygens at physical distance ~2.10 Å
  let cationIndex = 0;
  for (const m of metals) {
    const mCount = comp[m] ?? 0;
    for (let j = 0; j < mCount; j++) {
      const coordTarget = coordinatingOxygens[(cationIndex++) % coordinatingOxygens.length]!;
      const oAtom = atoms[coordTarget.oIdx]!;
      const vx = oAtom.x3d - coordTarget.sx;
      const vy = oAtom.y3d - coordTarget.sy;
      const vz = oAtom.z3d - coordTarget.sz;
      const vLen = Math.hypot(vx, vy, vz) || 1;
      const ux = vx / vLen;
      const uy = vy / vLen;
      const uz = vz / vLen;

      const dMO = 2.10;
      const mx = oAtom.x3d + ux * dMO;
      const my = oAtom.y3d + uy * dMO;
      const mz = oAtom.z3d + uz * dMO;
      const mIdx = atoms.length;
      atoms.push({
        atomIndex: mIdx,
        element: m,
        x3d: Number(mx.toFixed(3)),
        y3d: Number(my.toFixed(3)),
        z3d: Number(mz.toFixed(3)),
        x2d: Math.round(mx * 35),
        y2d: Math.round(my * 35),
      });

      // Connect ionic bond to primary coordinating oxygen
      bonds.push({ atomIndex1: coordTarget.oIdx, atomIndex2: mIdx, order: 1, type: "ionic" });

      // And to any other nearby coordinating oxygen within physical ionic range [1.70, 2.35] Å
      for (const other of coordinatingOxygens) {
        if (other.oIdx === coordTarget.oIdx) continue;
        const otherAtom = atoms[other.oIdx]!;
        const d = Math.hypot(mx - otherAtom.x3d, my - otherAtom.y3d, mz - otherAtom.z3d);
        if (d >= 1.70 && d <= 2.35) {
          bonds.push({ atomIndex1: other.oIdx, atomIndex2: mIdx, order: 1, type: "ionic" });
        }
      }
    }
  }

  return { curated: true, atoms, bonds };
}

function generateMultiNitrate(
  comp: ElementComposition,
  formula: string,
  commonName: string
): MoleculeStructure | null {
  const cCount = comp["C"] ?? 0;
  if (cCount > 0) return null; // strictly inorganic
  const nCount = comp["N"] ?? 0;
  const oCount = comp["O"] ?? 0;
  if (nCount < 1 || oCount < nCount * 3) return null;

  // Identify metal cation
  const metalKeys = Object.keys(comp).filter((k) => k !== "N" && k !== "O" && k !== "H");
  if (metalKeys.length !== 1) return null;
  const metal = metalKeys[0]!;
  if ((comp[metal] ?? 0) !== 1) return null;

  const n = nCount; // Number of nitrate groups
  const atoms: MoleculeStructure["atoms"] = [];
  const bonds: MoleculeStructure["bonds"] = [];

  // Metal cation at origin
  atoms.push({ atomIndex: 0, element: metal, x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0, formalCharge: n });

  const rNitrate = 3.35; // N distance from origin
  const dNO = 1.24;      // N-O bond distance

  for (let k = 0; k < n; k++) {
    const phi = (k * 2 * Math.PI) / n;
    const zTilt = n > 1 ? 0.6 * (k % 2 === 0 ? 1 : -1) : 0.45;
    const nx = rNitrate * Math.cos(phi);
    const ny = rNitrate * Math.sin(phi);
    const nz = zTilt;

    const nIdx = atoms.length;
    atoms.push({
      atomIndex: nIdx,
      element: "N",
      x3d: Number(nx.toFixed(3)),
      y3d: Number(ny.toFixed(3)),
      z3d: Number(nz.toFixed(3)),
      x2d: Math.round(nx * 35),
      y2d: Math.round(ny * 35),
      formalCharge: 1,
    });

    // Inward unit vector from N towards metal
    const uToM = vNormalize({ x: -nx, y: -ny, z: -nz });
    const pRef = Math.abs(uToM.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
    const side = vNormalize(vCross(uToM, pRef));

    // O1: Coordinating oxygen pointing inward towards metal (~2.11 A from metal)
    const o1x = nx + uToM.x * dNO;
    const o1y = ny + uToM.y * dNO;
    const o1z = nz + uToM.z * dNO;
    const o1Idx = atoms.length;
    atoms.push({
      atomIndex: o1Idx,
      element: "O",
      x3d: Number(o1x.toFixed(3)),
      y3d: Number(o1y.toFixed(3)),
      z3d: Number(o1z.toFixed(3)),
      x2d: Math.round(o1x * 35),
      y2d: Math.round(o1y * 35),
      formalCharge: -1,
    });
    bonds.push({ atomIndex1: nIdx, atomIndex2: o1Idx, order: 1, type: "covalent" });
    bonds.push({ atomIndex1: 0, atomIndex2: o1Idx, order: 1, type: "ionic" });

    // O2 and O3: outward pointing oxygens at 120 deg
    const cos120 = 0.5;
    const sin120 = 0.866;
    for (const s of [-1, 1]) {
      const ox = nx - uToM.x * (dNO * cos120) + side.x * (dNO * sin120 * s);
      const oy = ny - uToM.y * (dNO * cos120) + side.y * (dNO * sin120 * s);
      const oz = nz - uToM.z * (dNO * cos120) + side.z * (dNO * sin120 * s);
      const oIdx = atoms.length;
      atoms.push({
        atomIndex: oIdx,
        element: "O",
        x3d: Number(ox.toFixed(3)),
        y3d: Number(oy.toFixed(3)),
        z3d: Number(oz.toFixed(3)),
        x2d: Math.round(ox * 35),
        y2d: Math.round(oy * 35),
        formalCharge: s === 1 ? -1 : 0,
      });
      bonds.push({ atomIndex1: nIdx, atomIndex2: oIdx, order: s === 1 ? 1 : 2, type: "covalent" });
    }
  }

  return { curated: true, atoms, bonds };
}

function generateMetalHydroxide(
  comp: ElementComposition,
  formula: string,
  commonName: string
): MoleculeStructure | null {
  const cCount = comp["C"] ?? 0;
  if (cCount > 0) return null;
  const oCount = comp["O"] ?? 0;
  const hCount = comp["H"] ?? 0;
  if (oCount === 0 || oCount !== hCount) return null;

  const metalKeys = Object.keys(comp).filter((k) => k !== "O" && k !== "H");
  if (metalKeys.length !== 1) return null;
  const metal = metalKeys[0]!;
  if ((comp[metal] ?? 0) !== 1) return null;

  const n = oCount;
  const atoms: MoleculeStructure["atoms"] = [];
  const bonds: MoleculeStructure["bonds"] = [];

  atoms.push({ atomIndex: 0, element: metal, x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0, formalCharge: n });
  const m_o_dist = Math.max(1.85, getBondDistance(metal, "O"));
  const h_dist = 0.96;

  const dirs: Vec3[] = [];
  if (n === 1) {
    dirs.push({ x: 1, y: 0, z: 0 });
  } else if (n === 2) {
    const ang = (110 * Math.PI) / 360;
    dirs.push({ x: Math.sin(ang), y: Math.cos(ang), z: 0.25 });
    dirs.push({ x: -Math.sin(ang), y: Math.cos(ang), z: -0.25 });
  } else if (n === 3) {
    for (let k = 0; k < 3; k++) {
      const phi = (k * 2 * Math.PI) / 3;
      dirs.push({ x: 0.94 * Math.cos(phi), y: 0.94 * Math.sin(phi), z: -0.34 });
    }
  } else if (n === 4) {
    dirs.push({ x: 0.577, y: 0.577, z: 0.577 });
    dirs.push({ x: 0.577, y: -0.577, z: -0.577 });
    dirs.push({ x: -0.577, y: 0.577, z: -0.577 });
    dirs.push({ x: -0.577, y: -0.577, z: 0.577 });
  } else {
    dirs.push(
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
    );
  }

  for (let i = 0; i < n; i++) {
    const dir = vNormalize(dirs[i % dirs.length]!);
    const ox = dir.x * m_o_dist;
    const oy = dir.y * m_o_dist;
    const oz = dir.z * m_o_dist;
    const oIdx = atoms.length;
    atoms.push({
      atomIndex: oIdx,
      element: "O",
      x3d: Number(ox.toFixed(3)),
      y3d: Number(oy.toFixed(3)),
      z3d: Number(oz.toFixed(3)),
      x2d: Math.round(ox * 40),
      y2d: Math.round(oy * 40),
      formalCharge: -1,
    });
    bonds.push({ atomIndex1: 0, atomIndex2: oIdx, order: 1, type: "ionic" });

    // Bent O-H bond at ~105 deg
    const p1 = Math.abs(dir.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
    const perp = vNormalize(vCross(dir, p1));
    const hDir = vNormalize({
      x: dir.x * 0.35 + perp.x * 0.94,
      y: dir.y * 0.35 + perp.y * 0.94,
      z: dir.z * 0.35 + perp.z * 0.94,
    });
    const hx = ox + hDir.x * h_dist;
    const hy = oy + hDir.y * h_dist;
    const hz = oz + hDir.z * h_dist;
    const hIdx = atoms.length;
    atoms.push({
      atomIndex: hIdx,
      element: "H",
      x3d: Number(hx.toFixed(3)),
      y3d: Number(hy.toFixed(3)),
      z3d: Number(hz.toFixed(3)),
      x2d: Math.round(hx * 40),
      y2d: Math.round(hy * 40),
    });
    bonds.push({ atomIndex1: oIdx, atomIndex2: hIdx, order: 1, type: "covalent" });
  }

  return { curated: true, atoms, bonds };
}

function generateBinaryInorganicOxideOrSulfide(
  comp: ElementComposition,
  formula: string,
  commonName: string
): MoleculeStructure | null {
  const cCount = comp["C"] ?? 0;
  const hCount = comp["H"] ?? 0;
  if (cCount > 0 || hCount > 0) return null;

  const chalkogen = (comp["O"] ?? 0) > 0 ? "O" : (comp["S"] ?? 0) > 0 ? "S" : null;
  if (!chalkogen) return null;

  const otherKeys = Object.keys(comp).filter((k) => k !== chalkogen);
  if (otherKeys.length !== 1) return null;
  const metal = otherKeys[0]!;

  const mCount = comp[metal] ?? 0;
  const cCountTotal = comp[chalkogen] ?? 0;
  const dBond = getBondDistance(metal, chalkogen);

  const atoms: MoleculeStructure["atoms"] = [];
  const bonds: MoleculeStructure["bonds"] = [];

  // M2O3 / M2S3 (Fe2O3, Al2O3, Cr2O3, Bi2O3, etc.)
  if (mCount === 2 && cCountTotal === 3) {
    const mDist = 1.6;
    atoms.push({ atomIndex: 0, element: metal, x3d: -mDist, y3d: 0, z3d: 0, x2d: -60, y2d: 0 });
    atoms.push({ atomIndex: 1, element: metal, x3d: mDist, y3d: 0, z3d: 0, x2d: 60, y2d: 0 });

    const rRing = Math.sqrt(Math.max(0.5, dBond * dBond - mDist * mDist * 0.4)) || 1.35;
    for (let k = 0; k < 3; k++) {
      const phi = (k * 2 * Math.PI) / 3;
      const ox = 0;
      const oy = rRing * Math.cos(phi);
      const oz = rRing * Math.sin(phi);
      const oIdx = atoms.length;
      atoms.push({
        atomIndex: oIdx,
        element: chalkogen,
        x3d: Number(ox.toFixed(3)),
        y3d: Number(oy.toFixed(3)),
        z3d: Number(oz.toFixed(3)),
        x2d: Math.round(oy * 30),
        y2d: Math.round(oz * 30),
      });
      bonds.push({ atomIndex1: 0, atomIndex2: oIdx, order: 1, type: "covalent" });
      bonds.push({ atomIndex1: 1, atomIndex2: oIdx, order: 1, type: "covalent" });
    }
    return { curated: true, atoms, bonds };
  }

  // MO2 / MS2 (MnO2, TiO2, SnO2, PbO2, FeS2)
  if (mCount === 1 && cCountTotal === 2) {
    atoms.push({ atomIndex: 0, element: metal, x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0 });
    const ang = (120 * Math.PI) / 360;
    const ox1 = dBond * Math.cos(ang);
    const oy1 = dBond * Math.sin(ang);
    const ox2 = dBond * Math.cos(-ang);
    const oy2 = dBond * Math.sin(-ang);
    atoms.push({ atomIndex: 1, element: chalkogen, x3d: Number(ox1.toFixed(3)), y3d: Number(oy1.toFixed(3)), z3d: 0.15, x2d: Math.round(ox1 * 35), y2d: Math.round(oy1 * 35) });
    atoms.push({ atomIndex: 2, element: chalkogen, x3d: Number(ox2.toFixed(3)), y3d: Number(oy2.toFixed(3)), z3d: -0.15, x2d: Math.round(ox2 * 35), y2d: Math.round(oy2 * 35) });
    bonds.push({ atomIndex1: 0, atomIndex2: 1, order: 2, type: "covalent" });
    bonds.push({ atomIndex1: 0, atomIndex2: 2, order: 2, type: "covalent" });
    return { curated: true, atoms, bonds };
  }

  // M2O / M2S (Ag2O, Cu2O, Na2O, K2O, Ag2S)
  if (mCount === 2 && cCountTotal === 1) {
    atoms.push({ atomIndex: 0, element: chalkogen, x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0 });
    const ang = (110 * Math.PI) / 360;
    const mx1 = dBond * Math.sin(ang);
    const my1 = dBond * Math.cos(ang);
    const mx2 = -dBond * Math.sin(ang);
    const my2 = dBond * Math.cos(ang);
    atoms.push({ atomIndex: 1, element: metal, x3d: Number(mx1.toFixed(3)), y3d: Number(my1.toFixed(3)), z3d: 0, x2d: Math.round(mx1 * 35), y2d: Math.round(my1 * 35) });
    atoms.push({ atomIndex: 2, element: metal, x3d: Number(mx2.toFixed(3)), y3d: Number(my2.toFixed(3)), z3d: 0, x2d: Math.round(mx2 * 35), y2d: Math.round(my2 * 35) });
    bonds.push({ atomIndex1: 0, atomIndex2: 1, order: 1, type: "covalent" });
    bonds.push({ atomIndex1: 0, atomIndex2: 2, order: 1, type: "covalent" });
    return { curated: true, atoms, bonds };
  }

  // MO / MS (ZnO, CuO, PbO, FeO, CuS, FeS, ZnS, PbS)
  if (mCount === 1 && cCountTotal === 1) {
    atoms.push({ atomIndex: 0, element: metal, x3d: Number((-dBond / 2).toFixed(3)), y3d: 0, z3d: 0, x2d: -30, y2d: 0 });
    atoms.push({ atomIndex: 1, element: chalkogen, x3d: Number((dBond / 2).toFixed(3)), y3d: 0, z3d: 0, x2d: 30, y2d: 0 });
    bonds.push({ atomIndex1: 0, atomIndex2: 1, order: 2, type: "covalent" });
    return { curated: true, atoms, bonds };
  }

  return null;
}

function generateMetalHalide(
  comp: ElementComposition,
  formula: string,
  commonName: string
): MoleculeStructure | null {
  const cCount = comp["C"] ?? 0;
  const hCount = comp["H"] ?? 0;
  const oCount = comp["O"] ?? 0;
  if (cCount > 0 || hCount > 0 || oCount > 0) return null;

  const halogens = ["F", "Cl", "Br", "I"];
  const halKey = halogens.find((h) => (comp[h] ?? 0) > 0);
  if (!halKey) return null;

  const otherKeys = Object.keys(comp).filter((k) => !halogens.includes(k));
  if (otherKeys.length !== 1) return null;
  const metal = otherKeys[0]!;
  if ((comp[metal] ?? 0) !== 1) return null;

  const n = comp[halKey] ?? 0;
  if (n < 1 || n > 6) return null;

  const dBond = getBondDistance(metal, halKey);
  const atoms: MoleculeStructure["atoms"] = [];
  const bonds: MoleculeStructure["bonds"] = [];

  atoms.push({ atomIndex: 0, element: metal, x3d: 0, y3d: 0, z3d: 0, x2d: 0, y2d: 0, formalCharge: n });

  const dirs: Vec3[] = [];
  if (n === 1) {
    dirs.push({ x: 1, y: 0, z: 0 });
  } else if (n === 2) {
    dirs.push({ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 });
  } else if (n === 3) {
    for (let k = 0; k < 3; k++) {
      const phi = (k * 2 * Math.PI) / 3;
      dirs.push({ x: 0.94 * Math.cos(phi), y: 0.94 * Math.sin(phi), z: 0.34 * (k % 2 === 0 ? 1 : -1) });
    }
  } else if (n === 4) {
    dirs.push(
      { x: 0.577, y: 0.577, z: 0.577 },
      { x: 0.577, y: -0.577, z: -0.577 },
      { x: -0.577, y: 0.577, z: -0.577 },
      { x: -0.577, y: -0.577, z: 0.577 }
    );
  } else {
    dirs.push(
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
    );
  }

  for (let i = 0; i < n; i++) {
    const dir = vNormalize(dirs[i]!);
    const x = dir.x * dBond;
    const y = dir.y * dBond;
    const z = dir.z * dBond;
    const idx = atoms.length;
    atoms.push({
      atomIndex: idx,
      element: halKey,
      x3d: Number(x.toFixed(3)),
      y3d: Number(y.toFixed(3)),
      z3d: Number(z.toFixed(3)),
      x2d: Math.round(x * 35),
      y2d: Math.round(y * 35),
      formalCharge: -1,
    });
    bonds.push({ atomIndex1: 0, atomIndex2: idx, order: 1, type: "ionic" });
  }

  return { curated: true, atoms, bonds };
}

  // 3. Inorganic & Oxoacid / Small Molecule VSEPR Generator
  const curatedSalt = generateCuratedComplexOrSalt(comp, formula, commonName);
  if (curatedSalt && curatedSalt.atoms.length > 0) {
    return finalize(curatedSalt);
  }

  const complex = generateCoordinationComplex(comp, formula, commonName);
  if (complex && complex.atoms.length > 0) {
    return finalize(complex);
  }

  const polySalt = generatePolyOxoanionSalt(comp, formula, commonName);
  if (polySalt && polySalt.atoms.length > 0) {
    return finalize(polySalt);
  }

  const multiNitrate = generateMultiNitrate(comp, formula, commonName);
  if (multiNitrate && multiNitrate.atoms.length > 0) {
    return finalize(multiNitrate);
  }

  const hydroxide = generateMetalHydroxide(comp, formula, commonName);
  if (hydroxide && hydroxide.atoms.length > 0) {
    return finalize(hydroxide);
  }

  const binaryOxideOrSulfide = generateBinaryInorganicOxideOrSulfide(comp, formula, commonName);
  if (binaryOxideOrSulfide && binaryOxideOrSulfide.atoms.length > 0) {
    return finalize(binaryOxideOrSulfide);
  }

  const metalHalide = generateMetalHalide(comp, formula, commonName);
  if (metalHalide && metalHalide.atoms.length > 0) {
    return finalize(metalHalide);
  }

  const vsepr = generateInorganicVsepr(comp, formula, commonName, rng);
  if (vsepr && vsepr.atoms.length > 0) {
    return finalize(vsepr);
  }

  // 4. Organic Structure Generator with proper continuous zigzag chains & rings
  return finalize(generateOrganicStructure(chemicalId, activeFormula, comp, commonName, rng, skip2DRelaxation));
}
