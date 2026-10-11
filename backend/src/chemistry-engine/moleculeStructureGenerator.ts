import type { ElementComposition, MoleculeStructure } from "./types.js";
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
  Mg: 2,
  Ca: 2,
  Al: 3,
  Fe: 3,
  Cu: 2,
  Zn: 2,
  Mn: 7,
  Cr: 6,
  Ti: 4,
  Ba: 2,
};

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

    // Bracketed atom: [Na+], [OH-], [N+](=O)[O-], [nH]
    if (ch === "[") {
      const end = smiles.indexOf("]", i);
      if (end !== -1) {
        const inner = smiles.slice(i + 1, end);
        const match = inner.match(/^([A-Za-z]+)(?:@+)?(?:H([0-9]*))?([+-][0-9]*|[0-9]*[+-])?/);
        const raw = match ? match[1]! : "C";
        const isAromatic = raw === raw.toLowerCase() && raw.length === 1;
        const elem = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        let charge = 0;
        if (match && match[3]) {
          if (match[3] === "+") charge = 1;
          else if (match[3] === "-") charge = -1;
          else if (match[3].endsWith("+")) charge = parseInt(match[3], 10) || 1;
          else if (match[3].endsWith("-")) charge = -(parseInt(match[3], 10) || 1);
          else charge = parseInt(match[3], 10) || 0;
        }
        let explicitH: number | null = null;
        if (match && match[2] !== undefined) {
          explicitH = match[2] === "" ? 1 : parseInt(match[2], 10) || 0;
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
    if (["Cl", "Br", "Si", "Na", "Ca", "Fe", "Cu", "Al", "Zn", "Ba", "Mg"].includes(two)) {
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

  // 1. Detect rings and lay out prominent 6-membered benzene and 5-membered rings
  const rings = findRings(graph);
  for (const rawRing of rings) {
    if (rawRing.length === 6 && rawRing.every((idx) => !placed.has(idx))) {
      const isArom = isAromatic6Ring(rawRing, graph);
      const ring = orderRingPerimeter(rawRing, graph);
      const radius = 1.39; // Ångströms

      for (let k = 0; k < 6; k++) {
        const idx = ring[k]!;
        const angle = (k * 2 * Math.PI) / 6;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        // Saturated cyclohexane gets classic chair conformation; benzene is STRICTLY planar z = 0
        const z = isArom ? 0 : k % 2 === 0 ? 0.25 : -0.25;
        coords[idx] = { x, y, z };
        placed.add(idx);

        if (isArom) {
          aromaticRingAtoms.add(idx);
          // Outward radial unit vector strictly in the ring plane
          aromaticRingOutward.set(idx, { x: Math.cos(angle), y: Math.sin(angle), z: 0 });
        }
      }

      // If aromatic benzene ring, immediately lay out direct heavy substituents radially in-plane
      if (isArom) {
        for (let k = 0; k < 6; k++) {
          const idx = ring[k]!;
          const uOut = aromaticRingOutward.get(idx)!;
          const node = graph[idx]!;
          const extEdges = node.edges.filter((e) => !rawRing.includes(e.target));

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

                coords[sub] = {
                  x: Number((coords[idx]!.x + dirX * bondDist).toFixed(3)),
                  y: Number((coords[idx]!.y + dirY * bondDist).toFixed(3)),
                  z: 0,
                };
                placed.add(sub);
              }
            });
          }
        }
      }
    } else if (rawRing.length === 5 && rawRing.every((idx) => !placed.has(idx))) {
      const ring = orderRingPerimeter(rawRing, graph);
      const radius = 1.25;
      for (let k = 0; k < 5; k++) {
        const idx = ring[k]!;
        const angle = (k * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        coords[idx] = { x, y, z: 0 };
        placed.add(idx);
      }
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

  // 3. Lay out each component via BFS with hybridization-guided bond vectors
  components.forEach((comp, compIdx) => {
    let root = comp[0]!;
    for (const idx of comp) {
      if (placed.has(idx)) {
        root = idx;
        break;
      }
    }

    if (!placed.has(root)) {
      coords[root] = { x: 0, y: 0, z: 0 };
      placed.add(root);
    }

    const queue: number[] = [root];
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
      }

      const unplacedNeighbors = uNode.edges.filter((e) => !placed.has(e.target));
      if (unplacedNeighbors.length === 0) continue;

      let fwd = inDir || { x: 1, y: 0, z: 0 };
      let up = Math.abs(fwd.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
      let right = vNormalize(vCross(fwd, up));
      let perp = vNormalize(vCross(right, fwd));

      unplacedNeighbors.forEach((edge, nIdx) => {
        const v = edge.target;
        const vNode = graph[v]!;
        const bondDist = getBondDistance(uNode.elem, vNode.elem, edge.order);
        let outDir: Vec3;

        if (hyb === "SP") {
          outDir = fwd;
        } else if (hyb === "SP2") {
          const sign = nIdx % 2 === 0 ? 1 : -1;
          const cos120 = -0.5;
          const sin120 = 0.866 * sign;
          outDir = {
            x: fwd.x * cos120 + right.x * sin120,
            y: fwd.y * cos120 + right.y * sin120,
            z: fwd.z * cos120 + right.z * sin120,
          };
        } else {
          const cosTet = -0.3333; // 109.5 deg
          const sinTet = 0.9428;
          const phi = (nIdx * (2 * Math.PI) / 3) + (u % 2 === 0 ? 0 : Math.PI / 3);
          const cx = Math.cos(phi);
          const cy = Math.sin(phi);

          outDir = {
            x: fwd.x * cosTet + (right.x * cx + perp.x * cy) * sinTet,
            y: fwd.y * cosTet + (right.y * cx + perp.y * cy) * sinTet,
            z: fwd.z * cosTet + (right.z * cx + perp.z * cy) * sinTet,
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
      });
    }

    if (compIdx > 0) {
      const offsetX = compIdx * 3.4;
      for (const idx of comp) {
        if (coords[idx]) {
          coords[idx]!.x += offsetX;
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

  // Connect disconnected salt ions (e.g. Na+ and Cl-) with ionic bonds
  if (components.length > 1) {
    for (let c = 0; c < components.length - 1; c++) {
      const compA = components[c]!;
      const compB = components[c + 1]!;
      let minD = Infinity;
      let pair: [number, number] = [compA[0]!, compB[0]!];
      for (const a of compA) {
        for (const b of compB) {
          const d = vDist(
            { x: atoms[a]!.x3d, y: atoms[a]!.y3d, z: atoms[a]!.z3d },
            { x: atoms[b]!.x3d, y: atoms[b]!.y3d, z: atoms[b]!.z3d }
          );
          if (d < minD) {
            minD = d;
            pair = [a, b];
          }
        }
      }
      bonds.push({
        atomIndex1: pair[0],
        atomIndex2: pair[1],
        order: 1,
        type: "ionic",
      });
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
      const uOut = aromaticRingOutward.get(i);
      const extHeavyNeighbors = node.edges.filter((e) => !aromaticRingAtoms.has(e.target));
      // In benzene ring, each carbon has 2 ring neighbors. If no external heavy group, it gets 1 planar H
      if (extHeavyNeighbors.length === 0 && elem === "C" && uOut) {
        const hDist = 1.09;
        const hIdx = atoms.length;
        const hx = parentPos.x3d + uOut.x * hDist;
        const hy = parentPos.y3d + uOut.y * hDist;
        const hz = 0; // 100% strictly in-plane!

        atoms.push({
          atomIndex: hIdx,
          element: "H",
          x3d: Number(hx.toFixed(3)),
          y3d: Number(hy.toFixed(3)),
          z3d: 0,
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
      const maxV = ELEMENT_MAX_VALENCE[elem] ?? 4;
      const usedV = node.edges.reduce((sum, e) => sum + (e.order === 1.5 ? 1.5 : e.order), 0);
      needH = Math.max(0, Math.floor(maxV - usedV));
    }

    if (needH <= 0) continue;

    const existingNeighbors = bonds
      .filter((b) => b.atomIndex1 === i || b.atomIndex2 === i)
      .map((b) => (b.atomIndex1 === i ? atoms[b.atomIndex2]! : atoms[b.atomIndex1]!));

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
    const side = vNormalize(vCross(away, { x: 0, y: 0, z: 1 }));
    const up = vNormalize(vCross(side, away));
    const hDist = getBondDistance(elem, "H");

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

  return { curated: true, atoms, bonds };
}

// -----------------------------------------------------------------------------
// 5. Inorganic & Small-Molecule VSEPR Generator
// -----------------------------------------------------------------------------

function detectCentralAtom(comp: ElementComposition, formula: string): string | null {
  const elements = Object.keys(comp);
  if (elements.length <= 1) return null;

  if ((comp["O"] ?? 0) >= 2) {
    for (const c of [
      "S", "Se", "Te", "P", "As", "Sb", "Cr", "Mo", "W", "Mn", "Re", "N", "C", "Si", "Ge", "Cl", "Br", "I", "B", "V",
    ]) {
      if (comp[c] && comp[c]! <= 2) return c;
    }
  }

  const centralCandidates = [
    "Be", "Mg", "Ca", "Sr", "Ba", "Li", "Na", "K", "Cs",
    "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
    "B", "Al", "Ga", "In", "Si", "Ge", "Sn", "Pb", "P", "As", "Sb", "S", "Se", "C", "N",
  ];
  for (const c of centralCandidates) {
    if (comp[c] && comp[c] === 1) {
      const others = elements.filter((e) => e !== c);
      if (others.every((e) => ["F", "Cl", "Br", "I", "H", "O"].includes(e))) {
        return c;
      }
    }
  }

  if (comp["O"] === 1 && (comp["H"] ?? 0) >= 2) return "O";
  if (comp["S"] === 1 && (comp["H"] ?? 0) >= 2) return "S";

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

  if (oCount >= 2 && central !== "O") {
    const oIndices: number[] = [];
    const trigAngle = (120 * Math.PI) / 180;

    for (let i = 0; i < oCount; i++) {
      let vx = 0;
      let vy = 0;
      let vz = 0;

      if (oCount === 2) {
        const ang = (i === 0 ? 1 : -1) * (104.5 * Math.PI / 360);
        vx = Math.sin(ang);
        vy = Math.cos(ang);
      } else if (oCount === 3) {
        const ang = i * trigAngle - Math.PI / 2;
        vx = Math.cos(ang);
        vy = Math.sin(ang);
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

      const hx = oAtom.x3d * 1.45 + 0.2;
      const hy = oAtom.y3d * 1.45 - 0.2;
      const hz = oAtom.z3d * 1.45;

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

    const metals = Object.keys(comp).filter((k) => k !== central && k !== "O" && k !== "H");
    for (const m of metals) {
      const mCount = comp[m] || 0;
      for (let j = 0; j < mCount; j++) {
        const mIdx = atoms.length;
        const targetO = oIndices[j % oIndices.length]!;
        const oAtom = atoms[targetO]!;

        const mx = oAtom.x3d * 1.8 + (j === 0 ? 0.3 : -0.3);
        const my = oAtom.y3d * 1.8 + (j === 0 ? -0.3 : 0.3);
        const mz = oAtom.z3d * 1.8;

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
  rng: () => number
): MoleculeStructure {
  const halogens = ["F", "Cl", "Br", "I"];
  const nonMetals = new Set(["C", "Si", "B", "N", "P", "S", "As", "Se", "Te", "O", ...halogens, "H"]);
  const metalKeys = Object.keys(comp).filter((k) => !nonMetals.has(k) && (comp[k] ?? 0) > 0);

  const heavyKeys = [
    ...["C", "Si", "B"].filter((k) => (comp[k] ?? 0) > 0),
    ...metalKeys,
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
    (name.includes("phenyl") ||
      name.includes("benzen") ||
      name.includes("tolu") ||
      name.includes("pyridin") ||
      name.includes("pyrimid") ||
      name.includes("benzo") ||
      (hCount > 0 && hCount <= cCount * 1.4));

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

  // Leftover hydrogens
  while (placedH < hTotal && atoms.length > 0) {
    const parentIdx = placedH % atoms.length;
    const parent = atoms[parentIdx]!;
    const ang = (placedH * 2.4) % (2 * Math.PI);
    const x = parent.x3d + 1.09 * Math.cos(ang);
    const y = parent.y3d + 1.09 * Math.sin(ang);
    const z = parent.z3d + (placedH % 2 === 0 ? 0.6 : -0.6);

    const hIdx = addAtom("H", x, y, z);
    addBond(parentIdx, hIdx, 1);
    placedH++;
  }

  relaxGeometry(atoms, bonds, rng, aromaticRingAtoms);
  return { curated: true, atoms, bonds };
}

// -----------------------------------------------------------------------------
// 7. Physical Molecular Mechanics Force Field Relaxation
// -----------------------------------------------------------------------------

function relaxGeometry(
  atoms: MoleculeStructure["atoms"],
  bonds: MoleculeStructure["bonds"],
  rng: () => number,
  aromaticRingAtoms: Set<number> = new Set()
) {
  if (atoms.length <= 1) return;

  const adj: Map<number, { neighbor: number; order: 1 | 2 | 3; type: "covalent" | "ionic" }[]> = new Map();
  for (let i = 0; i < atoms.length; i++) adj.set(i, []);
  for (const b of bonds) {
    adj.get(b.atomIndex1)?.push({ neighbor: b.atomIndex2, order: b.order, type: b.type });
    adj.get(b.atomIndex2)?.push({ neighbor: b.atomIndex1, order: b.order, type: b.type });
  }

  const iterations = 64;

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

      const diff = (dist - targetDist) * 0.35;
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      // If either atom is in an aromatic ring, ring carbon position is protected from z shifts
      const a1IsArom = aromaticRingAtoms.has(b.atomIndex1);
      const a2IsArom = aromaticRingAtoms.has(b.atomIndex2);

      a1.x3d += nx * diff * 0.5;
      a1.y3d += ny * diff * 0.5;
      if (!a1IsArom) a1.z3d += nz * diff * 0.5;

      a2.x3d -= nx * diff * 0.5;
      a2.y3d -= ny * diff * 0.5;
      if (!a2IsArom) a2.z3d -= nz * diff * 0.5;
    }

    // 2. Harmonic Bond Angle Restorations (for non-aromatic centers)
    for (let b = 0; b < atoms.length; b++) {
      if (aromaticRingAtoms.has(b)) continue; // Aromatic ring angles are rigidly 120 deg
      const nList = adj.get(b);
      if (!nList || nList.length < 2) continue;

      const center = atoms[b]!;
      const isLinear = nList.length === 2 && nList.some((e) => e.order === 3);
      const isPlanar = nList.some((e) => e.order === 2);
      const targetAngleRad = isLinear
        ? Math.PI
        : isPlanar || nList.length === 3
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
            const push = angleDiff * 0.06;
            const u1 = { x: v1.x / d1, y: v1.y / d1, z: v1.z / d1 };
            const u2 = { x: v2.x / d2, y: v2.y / d2, z: v2.z / d2 };

            if (!aromaticRingAtoms.has(nList[i]!.neighbor)) {
              a1.x3d -= u2.x * push;
              a1.y3d -= u2.y * push;
              a1.z3d -= u2.z * push;
            }
            if (!aromaticRingAtoms.has(nList[j]!.neighbor)) {
              a2.x3d -= u1.x * push;
              a2.y3d -= u1.y * push;
              a2.z3d -= u1.z * push;
            }
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

        const r1 = getVdwRadius(a1.element);
        const r2 = getVdwRadius(a2.element);
        const contactDist = (r1 + r2) * 0.65;

        if (dist < contactDist) {
          if (dist < 0.001) {
            dx = (rng() - 0.5) * 0.1;
            dy = (rng() - 0.5) * 0.1;
            dz = 0;
            dist = Math.hypot(dx, dy, dz) || 0.1;
          }

          const push = (contactDist - dist) * 0.3;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          if (!aromaticRingAtoms.has(i)) {
            a1.x3d -= nx * push;
            a1.y3d -= ny * push;
            a1.z3d -= nz * push;
          }
          if (!aromaticRingAtoms.has(j)) {
            a2.x3d += nx * push;
            a2.y3d += ny * push;
            a2.z3d += nz * push;
          }
        }
      }
    }

    // 4. Strict Planar Enforce on all Aromatic Ring Carbons & In-Plane Ring Hydrogens
    for (const rIdx of aromaticRingAtoms) {
      const a = atoms[rIdx]!;
      a.z3d = 0; // Strictly planar z = 0!
      // Also keep direct ring hydrogens strictly in-plane
      for (const n of adj.get(rIdx) || []) {
        const neighborAtom = atoms[n.neighbor]!;
        if (neighborAtom.element === "H") {
          neighborAtom.z3d = 0;
        }
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

// -----------------------------------------------------------------------------
// Main Generator Entrypoint
// -----------------------------------------------------------------------------

export function generateMoleculeStructure(
  chemicalId: string,
  formula: string,
  composition?: ElementComposition,
  commonName = "",
  smiles?: string
): MoleculeStructure {
  const rng = createSeededRandom(chemicalId || formula || commonName || smiles || "chemlab_seed");

  // 1. Prioritize SMILES whenever available
  if (smiles && smiles.trim().length > 0) {
    try {
      const struct = generateFromSmiles(smiles.trim(), rng);
      if (struct && struct.atoms.length > 0) {
        return struct;
      }
    } catch {
      // Fallback if SMILES parsing fails on rare edge case
    }
  }

  // Determine composition
  let comp: ElementComposition = {};
  if (composition && Object.keys(composition).length > 0) {
    comp = { ...composition };
  } else if (formula && formula.trim().length > 0) {
    try {
      comp = parseFormula(formula.trim()).composition;
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
  }

  // 3. Inorganic & Oxoacid / Small Molecule VSEPR Generator
  const vsepr = generateInorganicVsepr(comp, formula, commonName, rng);
  if (vsepr && vsepr.atoms.length > 0) {
    return vsepr;
  }

  // 4. Organic Structure Generator with proper continuous zigzag chains & rings
  return generateOrganicStructure(chemicalId, formula, comp, commonName, rng);
}
