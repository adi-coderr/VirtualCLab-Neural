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
                onMouseEnter={() => setHoveredBondIdx(i)}
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
                onMouseEnter={() => setHoveredAtomIdx(i)}
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
                  fill={light ? "#0f172a" : "#ffffff"}
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
      {tooltipPos && !isDragging && (activeAtom || activeBond) && (
        <div
          className="molecule-2d__tooltip"
          style={{
            left: `${tooltipPos.x + 14}px`,
            top: `${tooltipPos.y + 14}px`,
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

          {activeBond && !activeAtom && (
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
