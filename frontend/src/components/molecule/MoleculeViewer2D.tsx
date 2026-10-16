import { useState, useMemo, useRef, useCallback } from "react";
import type { MoleculeStructure, AtomRecord, BondRecord } from "../../types/chemistry";
import { getElementVisual, getElementName } from "./elementColors";
import "./MoleculeViewer2D.css";

const VIEWPORT_PADDING = 48;

function getAtomRadius2D(element: string): number {
  switch (element) {
    case "H":
      return 10.5;
    case "He":
    case "F":
      return 11.5;
    case "C":
    case "N":
    case "O":
    case "B":
      return 13.0;
    case "Na":
    case "Mg":
    case "Al":
    case "Si":
    case "P":
    case "S":
    case "Cl":
      return 14.5;
    default:
      // Transition metals, halogens, heavy ions (Fe, Cu, Zn, Ag, Br, I, Pb, etc.)
      return 16.0;
  }
}

function isLightColor(hex: string): boolean {
  if (!hex || hex[0] !== "#" || hex.length < 7) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

/** Standard experimental covalent bond lengths (in Ångströms) based on crystallographic data */
const STANDARD_BOND_LENGTHS: Record<string, number> = {
  "H-H": 0.74,
  "C-H": 1.09,
  "N-H": 1.01,
  "O-H": 0.96,
  "F-H": 0.92,
  "Cl-H": 1.27,
  "Br-H": 1.41,
  "I-H": 1.61,
  "C-C": 1.54,
  "C=C": 1.34,
  "C#C": 1.20,
  "C-N": 1.47,
  "C=N": 1.28,
  "C#N": 1.16,
  "C-O": 1.43,
  "C=O": 1.22,
  "C#O": 1.13,
  "C-F": 1.35,
  "C-Cl": 1.77,
  "C-Br": 1.94,
  "C-I": 2.14,
  "C-S": 1.82,
  "C=S": 1.61,
  "N-O": 1.40,
  "N=O": 1.22,
  "N-N": 1.45,
  "N=N": 1.25,
  "N#N": 1.10,
  "O-O": 1.48,
  "O=O": 1.21,
  "S-O": 1.49,
  "S=O": 1.43,
  "S-S": 2.05,
  "P-O": 1.54,
  "P=O": 1.48,
  "P-Cl": 2.04,
  "Si-O": 1.63,
  "Si-C": 1.87,
  "Fe-O": 1.98,
  "Fe-Cl": 2.16,
  "Cu-O": 1.95,
  "Cu-Cl": 2.15,
  "Zn-O": 1.95,
  "Zn-Cl": 2.05,
  "Al-O": 1.85,
  "Al-Cl": 2.06,
  "Ag-Cl": 2.35,
  "Ag-O": 2.05,
};

/** Approximate covalent radii in Ångströms */
const COVALENT_RADII_A: Record<string, number> = {
  H: 0.31, He: 0.28,
  Li: 1.28, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Ne: 0.58,
  Na: 1.66, Mg: 1.41, Al: 1.21, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02, Ar: 1.06,
  K: 2.03, Ca: 1.76, Sc: 1.70, Ti: 1.60, V: 1.53, Cr: 1.39, Mn: 1.39, Fe: 1.32,
  Co: 1.26, Ni: 1.24, Cu: 1.32, Zn: 1.22, Ga: 1.22, Ge: 1.20, As: 1.19, Se: 1.20,
  Br: 1.20, Kr: 1.16, Rb: 2.20, Sr: 1.95, Ag: 1.45, Cd: 1.44, In: 1.42, Sn: 1.39,
  Sb: 1.39, I: 1.39, Ba: 2.15, Pt: 1.36, Au: 1.36, Hg: 1.32, Pb: 1.46, Bi: 1.48,
};

function computeBondMetrics(
  bond: BondRecord,
  atoms: AtomRecord[],
  bonds: BondRecord[]
): { lengthStr: string; angleStr: string } {
  const a1 = atoms[bond.atomIndex1];
  const a2 = atoms[bond.atomIndex2];
  if (!a1 || !a2) {
    return { lengthStr: "—", angleStr: "—" };
  }

  // 1. Bond Length Calculation
  let lengthA = bond.length;
  if (!lengthA || isNaN(lengthA) || lengthA <= 0) {
    const dx = a2.x3d - a1.x3d;
    const dy = a2.y3d - a1.y3d;
    const dz = a2.z3d - a1.z3d;
    const d3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d3d > 0.35 && d3d < 5.0 && !isNaN(d3d)) {
      lengthA = Number(d3d.toFixed(2));
    } else {
      const orderSymbol = bond.order === 3 ? "#" : bond.order === 2 ? "=" : "-";
      const key1 = `${a1.element}${orderSymbol}${a2.element}`;
      const key2 = `${a2.element}${orderSymbol}${a1.element}`;
      const keySingle1 = `${a1.element}-${a2.element}`;
      const keySingle2 = `${a2.element}-${a1.element}`;

      if (STANDARD_BOND_LENGTHS[key1]) {
        lengthA = STANDARD_BOND_LENGTHS[key1];
      } else if (STANDARD_BOND_LENGTHS[key2]) {
        lengthA = STANDARD_BOND_LENGTHS[key2];
      } else if (STANDARD_BOND_LENGTHS[keySingle1]) {
        const factor = bond.order === 3 ? 0.78 : bond.order === 2 ? 0.88 : 1.0;
        lengthA = Number((STANDARD_BOND_LENGTHS[keySingle1] * factor).toFixed(2));
      } else if (STANDARD_BOND_LENGTHS[keySingle2]) {
        const factor = bond.order === 3 ? 0.78 : bond.order === 2 ? 0.88 : 1.0;
        lengthA = Number((STANDARD_BOND_LENGTHS[keySingle2] * factor).toFixed(2));
      } else {
        const r1 = COVALENT_RADII_A[a1.element] ?? 1.1;
        const r2 = COVALENT_RADII_A[a2.element] ?? 1.1;
        const orderFactor = bond.order === 3 ? 0.78 : bond.order === 2 ? 0.88 : 1.0;
        lengthA = Number(((r1 + r2) * orderFactor).toFixed(2));
      }
    }
  }

  if (!lengthA || isNaN(lengthA) || lengthA <= 0) {
    lengthA = 1.48;
  }

  const lengthPm = Math.round(lengthA * 100);
  const lengthStr = `${lengthA.toFixed(2)} Å (${lengthPm} pm)`;

  // 2. Bond Angle Calculation
  let angleStr = "";
  if (bond.angle !== undefined && !isNaN(bond.angle)) {
    angleStr = `${bond.angle.toFixed(1)}°${bond.angleLabel ? ` (${bond.angleLabel})` : ""}`;
  } else {
    const neighbors1: number[] = [];
    const neighbors2: number[] = [];
    for (const b of bonds) {
      if (b === bond) continue;
      if (b.atomIndex1 === bond.atomIndex1 && b.atomIndex2 !== bond.atomIndex2) {
        neighbors1.push(b.atomIndex2);
      } else if (b.atomIndex2 === bond.atomIndex1 && b.atomIndex1 !== bond.atomIndex2) {
        neighbors1.push(b.atomIndex1);
      }
      if (b.atomIndex1 === bond.atomIndex2 && b.atomIndex2 !== bond.atomIndex1) {
        neighbors2.push(b.atomIndex2);
      } else if (b.atomIndex2 === bond.atomIndex2 && b.atomIndex1 !== bond.atomIndex1) {
        neighbors2.push(b.atomIndex1);
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
      const dot = v1x * v2x + v1y * v2y + v1z * v2z;
      const cosTheta = Math.max(-1, Math.min(1, dot / (l1 * l2)));
      const deg = (Math.acos(cosTheta) * 180) / Math.PI;
      return isNaN(deg) ? 180 : deg;
    };

    if (neighbors1.length > 0 && atoms[neighbors1[0]!]) {
      const nIdx = neighbors1[0]!;
      const nAtom = atoms[nIdx]!;
      const ang = calc3DAngle(a1, nAtom, a2);
      const safeAng = isNaN(ang) ? 109.5 : ang;
      angleStr = `${safeAng.toFixed(1)}° (${nAtom.element}–${a1.element}–${a2.element})`;
    } else if (neighbors2.length > 0 && atoms[neighbors2[0]!]) {
      const nIdx = neighbors2[0]!;
      const nAtom = atoms[nIdx]!;
      const ang = calc3DAngle(a2, a1, nAtom);
      const safeAng = isNaN(ang) ? 109.5 : ang;
      angleStr = `${safeAng.toFixed(1)}° (${a1.element}–${a2.element}–${nAtom.element})`;
    } else {
      angleStr = "180.0° (linear)";
    }
  }

  return { lengthStr, angleStr };
}

export function MoleculeViewer2D({
  structure,
  label,
}: {
  structure: MoleculeStructure;
  label?: string;
}) {
  const { atoms, bonds } = structure;

  // Zoom and pan state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Hover inspection state
  const [hoveredAtomIdx, setHoveredAtomIdx] = useState<number | null>(null);
  const [hoveredBondIdx, setHoveredBondIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Bounds computation with minimum sizing
  const bounds = useMemo(() => {
    if (!atoms || atoms.length === 0) {
      return { minX: -60, minY: -60, width: 120, height: 120 };
    }
    const xs = atoms.map((a) => a.x2d);
    const ys = atoms.map((a) => a.y2d);
    const minX = Math.min(...xs) - VIEWPORT_PADDING;
    const maxX = Math.max(...xs) + VIEWPORT_PADDING;
    const minY = Math.min(...ys) - VIEWPORT_PADDING;
    const maxY = Math.max(...ys) + VIEWPORT_PADDING;
    const rawWidth = Math.max(maxX - minX, 140);
    const rawHeight = Math.max(maxY - minY, 140);
    return { minX, minY, width: rawWidth, height: rawHeight };
  }, [atoms]);

  // Unique elements for SVG gradient definitions
  const uniqueElements = useMemo(() => {
    const set = new Set<string>();
    for (const a of atoms) set.add(a.element);
    return Array.from(set);
  }, [atoms]);

  // Atom degree mapping (number of attached bonds)
  const atomDegree = useMemo(() => {
    const deg: Record<number, number> = {};
    for (const b of bonds) {
      deg[b.atomIndex1] = (deg[b.atomIndex1] || 0) + 1;
      deg[b.atomIndex2] = (deg[b.atomIndex2] || 0) + 1;
    }
    return deg;
  }, [bonds]);

  // Mouse pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.cancelable) e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setZoom((z) => Math.min(Math.max(0.5, Number((z + delta).toFixed(2))), 3.0));
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const activeAtom = hoveredAtomIdx !== null ? atoms[hoveredAtomIdx] : null;
  const activeBond = hoveredBondIdx !== null ? bonds[hoveredBondIdx] : null;

  return (
    <div
      ref={containerRef}
      className={`molecule-2d ${isDragging ? "molecule-2d--dragging" : ""}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        setHoveredAtomIdx(null);
        setHoveredBondIdx(null);
        setTooltipPos(null);
      }}
      onWheel={handleWheel}
      role="region"
      aria-label={label ? `2D structure of ${label}` : "2D molecular structure"}
    >
      {/* Floating View Controls */}
      <div className="molecule-2d__toolbar">
        <button
          type="button"
          className="molecule-2d__tool-btn"
          onClick={handleZoomIn}
          title="Zoom in (+)"
          aria-label="Zoom in"
        >
          +
        </button>
        <span className="molecule-2d__zoom-indicator">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="molecule-2d__tool-btn"
          onClick={handleZoomOut}
          title="Zoom out (−)"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="molecule-2d__tool-btn molecule-2d__tool-btn--reset"
          onClick={handleResetView}
          title="Reset View"
          aria-label="Reset View"
        >
          ⛶
        </button>
      </div>

      <svg
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        className="molecule-2d__svg"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <defs>
          {/* Subtle drop shadows */}
          <filter id="atom-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" floodColor="rgba(0,0,0,0.22)" />
          </filter>
          <filter id="badge-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(0,0,0,0.3)" />
          </filter>
          <filter id="hover-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#2563eb" floodOpacity="0.6" />
          </filter>

          {/* Radial gradients for 2.5D atom spherical look */}
          {uniqueElements.map((elem) => {
            const visual = getElementVisual(elem);
            return (
              <radialGradient
                key={elem}
                id={`grad-${elem}`}
                cx="35%"
                cy="32%"
                r="65%"
                fx="30%"
                fy="28%"
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.42} />
                <stop offset="38%" stopColor={visual.color} stopOpacity={0.96} />
                <stop offset="100%" stopColor={visual.color} stopOpacity={1.0} />
              </radialGradient>
            );
          })}
        </defs>

        {/* 1. Bonds Layer */}
        <g className="molecule-2d__bonds-layer">
          {bonds.map((bond, i) => {
            const a1 = atoms[bond.atomIndex1];
            const a2 = atoms[bond.atomIndex2];
            if (!a1 || !a2) return null;

            const r1 = getAtomRadius2D(a1.element);
            const r2 = getAtomRadius2D(a2.element);
            const dx = a2.x2d - a1.x2d;
            const dy = a2.y2d - a1.y2d;
            const len = Math.hypot(dx, dy) || 1;

            const ux = dx / len;
            const uy = dy / len;
            const perpX = (-dy / len) * 3.4;
            const perpY = (dx / len) * 3.4;

            // Trim bond lines so they stop cleanly at atom perimeters
            const trimStart = Math.min(len * 0.45, r1 + 1.2);
            const trimEnd = Math.min(len * 0.45, r2 + 1.2);
            const x1 = a1.x2d + ux * trimStart;
            const y1 = a1.y2d + uy * trimStart;
            const x2 = a2.x2d - ux * trimEnd;
            const y2 = a2.y2d - uy * trimEnd;

            // Multiple bond offsets
            const offsets =
              bond.order === 1
                ? [0]
                : bond.order === 2
                  ? [-0.95, 0.95]
                  : [-1.4, 0, 1.4];

            const isHovered = hoveredBondIdx === i;

            return (
              <g
                key={`b-${i}`}
                className={`molecule-2d__bond-group ${isHovered ? "molecule-2d__bond-group--hovered" : ""}`}
                onMouseEnter={(e) => {
                  setHoveredBondIdx(i);
                  if (!tooltipPos && containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  } else if (!tooltipPos) {
                    setTooltipPos({ x: 50, y: 50 });
                  }
                }}
                onMouseLeave={() => setHoveredBondIdx(null)}
              >
                {/* Invisible wide hit-area for easy hover */}
                <line
                  x1={a1.x2d}
                  y1={a1.y2d}
                  x2={a2.x2d}
                  y2={a2.y2d}
                  className="molecule-2d__bond-hitbox"
                />

                {/* Rendered bond lines */}
                {offsets.map((offset, j) => (
                  <line
                    key={j}
                    x1={x1 + perpX * offset}
                    y1={y1 + perpY * offset}
                    x2={x2 + perpX * offset}
                    y2={y2 + perpY * offset}
                    className={`molecule-2d__bond ${
                      bond.type === "ionic" ? "molecule-2d__bond--ionic" : ""
                    } ${isHovered ? "molecule-2d__bond--active" : ""}`}
                  />
                ))}
              </g>
            );
          })}
        </g>

        {/* 2. Atoms Layer */}
        <g className="molecule-2d__atoms-layer">
          {atoms.map((atom, i) => {
            const visual = getElementVisual(atom.element);
            const radius = getAtomRadius2D(atom.element);
            const isHovered = hoveredAtomIdx === i;
            const light = isLightColor(visual.color);

            // Charge badge positioning at top-right
            const badgeRadius = 6.8;
            const badgeOffset = radius * 0.76;
            const badgeX = atom.x2d + badgeOffset;
            const badgeY = atom.y2d - badgeOffset;
            const charge = atom.formalCharge;

            return (
              <g
                key={`a-${i}`}
                className={`molecule-2d__atom-group ${isHovered ? "molecule-2d__atom-group--hovered" : ""}`}
                onMouseEnter={(e) => {
                  setHoveredAtomIdx(i);
                  if (!tooltipPos && containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  } else if (!tooltipPos) {
                    setTooltipPos({ x: 50, y: 50 });
                  }
                }}
                onMouseLeave={() => setHoveredAtomIdx(null)}
              >
                {/* Hover glow pulse ring */}
                {isHovered && (
                  <circle
                    cx={atom.x2d}
                    cy={atom.y2d}
                    r={radius + 4}
                    className="molecule-2d__atom-highlight"
                  />
                )}

                {/* Atom core sphere */}
                <circle
                  cx={atom.x2d}
                  cy={atom.y2d}
                  r={radius}
                  fill={`url(#grad-${atom.element})`}
                  className="molecule-2d__atom"
                  filter="url(#atom-shadow)"
                />

                {/* Element symbol label */}
                <text
                  x={atom.x2d}
                  y={atom.y2d}
                  className="molecule-2d__label"
                  fill={light ? "#000000" : "#ffffff"}
                  style={{ fontSize: radius <= 11 ? "9.5px" : radius >= 15 ? "12px" : "11px" }}
                >
                  {atom.element}
                </text>

                {/* Dedicated formal charge badge */}
                {charge !== undefined && charge !== 0 && (
                  <g className="molecule-2d__charge-badge" filter="url(#badge-shadow)">
                    <circle
                      cx={badgeX}
                      cy={badgeY}
                      r={badgeRadius}
                      className={charge > 0 ? "molecule-2d__charge-bg--pos" : "molecule-2d__charge-bg--neg"}
                    />
                    <text
                      x={badgeX}
                      y={badgeY}
                      className="molecule-2d__charge-text"
                    >
                      {charge > 0
                        ? charge > 1
                          ? `${charge}+`
                          : "+"
                        : Math.abs(charge) > 1
                          ? `${Math.abs(charge)}−`
                          : "−"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Inspection Tooltip */}
      {tooltipPos && !isDragging && (activeAtom || activeBond) && (() => {
        const containerW = containerRef.current?.clientWidth ?? 400;
        const containerH = containerRef.current?.clientHeight ?? 300;
        const isNearRight = tooltipPos.x + 230 > containerW;
        const isNearBottom = tooltipPos.y + 170 > containerH;
        const left = isNearRight ? Math.max(8, tooltipPos.x - 225) : tooltipPos.x + 14;
        const top = isNearBottom ? Math.max(8, tooltipPos.y - 150) : tooltipPos.y + 14;

        return (
          <div
            className="molecule-2d__tooltip"
            style={{
              left: `${left}px`,
              top: `${top}px`,
            }}
          >
          {activeAtom && (
            <>
              <div className="molecule-2d__tooltip-header">
                <span
                  className="molecule-2d__tooltip-dot"
                  style={{ backgroundColor: getElementVisual(activeAtom.element).color }}
                />
                <span className="molecule-2d__tooltip-name">
                  {getElementName(activeAtom.element)} ({activeAtom.element})
                </span>
                <span className="molecule-2d__tooltip-idx">#{activeAtom.atomIndex + 1}</span>
              </div>
              <div className="molecule-2d__tooltip-body">
                <div className="molecule-2d__tooltip-row">
                  <span>Charge:</span>
                  <strong>
                    {activeAtom.formalCharge && activeAtom.formalCharge !== 0
                      ? `${activeAtom.formalCharge > 0 ? "+" : ""}${activeAtom.formalCharge}`
                      : "Neutral (0)"}
                  </strong>
                </div>
                <div className="molecule-2d__tooltip-row">
                  <span>Bonds:</span>
                  <strong>
                    {hoveredAtomIdx !== null
                      ? atomDegree[hoveredAtomIdx] ?? atomDegree[activeAtom.atomIndex] ?? 0
                      : 0}{" "}
                    attached
                  </strong>
                </div>
              </div>
            </>
          )}

          {activeBond && !activeAtom && (() => {
            const metrics = computeBondMetrics(activeBond, atoms, bonds);
            return (
              <>
                <div className="molecule-2d__tooltip-header">
                  <span className="molecule-2d__tooltip-bond-icon">━</span>
                  <span className="molecule-2d__tooltip-name">
                    {activeBond.order === 3
                      ? "Triple"
                      : activeBond.order === 2
                        ? "Double"
                        : "Single"}{" "}
                    {activeBond.type === "ionic" ? "Ionic Bond" : "Covalent Bond"}
                  </span>
                </div>
                <div className="molecule-2d__tooltip-body">
                  <div className="molecule-2d__tooltip-row">
                    <span>Connects:</span>
                    <strong>
                      {atoms[activeBond.atomIndex1]?.element} ↔ {atoms[activeBond.atomIndex2]?.element}
                    </strong>
                  </div>
                  <div className="molecule-2d__tooltip-row">
                    <span>Bond Order:</span>
                    <strong>{activeBond.order}</strong>
                  </div>
                  <div className="molecule-2d__tooltip-row">
                    <span>Bond Length:</span>
                    <strong>{metrics.lengthStr}</strong>
                  </div>
                  <div className="molecule-2d__tooltip-row">
                    <span>Bond Angle:</span>
                    <strong>{metrics.angleStr}</strong>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      );
    })()}
    </div>
  );
}
