import React from "react";
import type { VesselSolid } from "../../utils/phaseUtils";
import "./GlasswarePhases.css";

interface GlasswarePhasesProps {
  solids: VesselSolid[];
  cx: number;
  floorY: number;
  baseWidth: number;
  isSubmerged: boolean;
  containerId?: string;
}

export function GlasswarePhases({
  solids,
  cx,
  floorY,
  baseWidth,
  isSubmerged,
  containerId = "default",
}: GlasswarePhasesProps) {
  if (!solids || solids.length === 0) return null;

  return (
    <g className={`glassware-phases ${isSubmerged ? "glassware-phases--submerged" : ""}`}>
      {solids.map((solid, idx) => {
        const solidId = `solid-${containerId}-${idx}`;
        if (solid.form === "crystal") {
          return (
            <CrystalCluster
              key={solid.chemicalId || idx}
              solid={solid}
              cx={cx}
              floorY={floorY}
              baseWidth={baseWidth}
              isSubmerged={isSubmerged}
              id={solidId}
            />
          );
        }
        if (solid.form === "solid") {
          return (
            <MetalSolid
              key={solid.chemicalId || idx}
              solid={solid}
              cx={cx}
              floorY={floorY}
              baseWidth={baseWidth}
              isSubmerged={isSubmerged}
              id={solidId}
            />
          );
        }
        // Default to powder
        return (
          <PowderMound
            key={solid.chemicalId || idx}
            solid={solid}
            cx={cx}
            floorY={floorY}
            baseWidth={baseWidth}
            isSubmerged={isSubmerged}
            id={solidId}
          />
        );
      })}
    </g>
  );
}

/* =========================================================================
 * 1. POWDER MOUND COMPONENT - REALISTIC GRANULAR PARTICLE HEAP
 * ========================================================================= */
function PowderMound({
  solid,
  cx,
  floorY,
  baseWidth,
  isSubmerged,
  id,
}: {
  solid: VesselSolid;
  cx: number;
  floorY: number;
  baseWidth: number;
  isSubmerged: boolean;
  id: string;
}) {
  const height = Math.min(baseWidth * 0.45, solid.heightPx);
  const halfWidth = Math.min(baseWidth * 0.48, Math.max(16, baseWidth * 0.42));
  const leftX = cx - halfWidth;
  const rightX = cx + halfWidth;
  const peakY = floorY - height;

  const gradId = `pwd-grad-${id}`;
  const crestGradId = `pwd-crest-${id}`;

  return (
    <g className="powder-mound" aria-label={`Powder: ${solid.name}`}>
      <defs>
        {/* Powder mound 3D volume gradient */}
        <linearGradient id={gradId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="25%" stopColor={solid.color} stopOpacity="0.95" />
          <stop offset="70%" stopColor={solid.color} stopOpacity="0.98" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.35" />
        </linearGradient>

        {/* Powder crest diffuse highlight */}
        <linearGradient id={crestGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="60%" stopColor={solid.color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={solid.color} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Base floor contact shadow */}
      <ellipse
        cx={cx}
        cy={floorY}
        rx={halfWidth * 0.95}
        ry="3.5"
        fill="rgba(15, 23, 42, 0.25)"
      />

      {/* Main Powder Mound Curve (Natural Gaussian Angle of Repose) */}
      <path
        d={`M ${leftX} ${floorY}
            C ${leftX + halfWidth * 0.4} ${floorY - height * 0.1},
              ${cx - halfWidth * 0.3} ${peakY},
              ${cx} ${peakY}
            C ${cx + halfWidth * 0.3} ${peakY},
              ${rightX - halfWidth * 0.4} ${floorY - height * 0.1},
              ${rightX} ${floorY}
            Z`}
        fill={`url(#${gradId})`}
        stroke="rgba(0, 0, 0, 0.15)"
        strokeWidth="0.8"
      />

      {/* Primary Powder Body Overlay for deep particulate opacity */}
      <path
        d={`M ${leftX + 2} ${floorY}
            C ${leftX + halfWidth * 0.4} ${floorY - height * 0.12},
              ${cx - halfWidth * 0.28} ${peakY + 1},
              ${cx} ${peakY + 1}
            C ${cx + halfWidth * 0.28} ${peakY + 1},
              ${rightX - halfWidth * 0.4} ${floorY - height * 0.12},
              ${rightX - 2} ${floorY}
            Z`}
        fill={solid.color}
        opacity="0.85"
      />

      {/* Powder Crest Rim Specular Highlight */}
      <path
        d={`M ${cx - halfWidth * 0.55} ${floorY - height * 0.45}
            Q ${cx} ${peakY - 0.5} ${cx + halfWidth * 0.55} ${floorY - height * 0.45}`}
        stroke={`url(#${crestGradId})`}
        strokeWidth="2.0"
        fill="none"
        strokeLinecap="round"
      />

      {/* Realistic Granular Texture Stippling (Micro-grains along the powder slope) */}
      <g className="powder-grains" opacity="0.45" fill="#ffffff">
        <circle cx={cx - halfWidth * 0.3} cy={floorY - height * 0.55} r="0.9" />
        <circle cx={cx - halfWidth * 0.15} cy={floorY - height * 0.75} r="0.8" />
        <circle cx={cx + halfWidth * 0.2} cy={floorY - height * 0.6} r="1.0" />
        <circle cx={cx + halfWidth * 0.35} cy={floorY - height * 0.35} r="0.8" />
        <circle cx={cx - 4} cy={peakY + 2.5} r="1.1" />
        <circle cx={cx + 6} cy={peakY + 3.5} r="0.9" />
        <circle cx={cx - halfWidth * 0.45} cy={floorY - height * 0.25} r="0.9" />
        <circle cx={cx + halfWidth * 0.1} cy={floorY - height * 0.4} r="0.7" />
        <circle cx={cx - halfWidth * 0.2} cy={floorY - height * 0.3} r="0.8" />
      </g>
      <g className="powder-shadow-grains" opacity="0.30" fill="#0f172a">
        <circle cx={cx + halfWidth * 0.25} cy={floorY - height * 0.45} r="1.0" />
        <circle cx={cx + halfWidth * 0.4} cy={floorY - height * 0.2} r="0.9" />
        <circle cx={cx - halfWidth * 0.1} cy={floorY - height * 0.45} r="0.8" />
        <circle cx={cx + 2} cy={peakY + 5} r="1.0" />
      </g>
    </g>
  );
}

/* =========================================================================
 * 2. CRYSTAL CLUSTER COMPONENT - FACETED TRANSLUCENT PRISMS & DIAMOND GLINTS
 * ========================================================================= */
function CrystalCluster({
  solid,
  cx,
  floorY,
  baseWidth,
  isSubmerged,
  id,
}: {
  solid: VesselSolid;
  cx: number;
  floorY: number;
  baseWidth: number;
  isSubmerged: boolean;
  id: string;
}) {
  const height = Math.min(baseWidth * 0.42, Math.max(14, solid.heightPx * 0.95));
  const span = Math.min(baseWidth * 0.45, Math.max(18, baseWidth * 0.38));

  const cGradCenter = `cryst-c-${id}`;
  const cGradLeft = `cryst-l-${id}`;
  const cGradRight = `cryst-r-${id}`;

  return (
    <g className="crystal-cluster" aria-label={`Crystals: ${solid.name}`}>
      <defs>
        {/* Central Crystal Prism Face Gradient */}
        <linearGradient id={cGradCenter} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.80" />
          <stop offset="25%" stopColor={solid.color} stopOpacity="0.90" />
          <stop offset="75%" stopColor={solid.color} stopOpacity="0.98" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.45" />
        </linearGradient>

        {/* Left Crystal Facet Gradient */}
        <linearGradient id={cGradLeft} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="40%" stopColor={solid.color} stopOpacity="0.92" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.50" />
        </linearGradient>

        {/* Right Crystal Facet Gradient */}
        <linearGradient id={cGradRight} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.70" />
          <stop offset="45%" stopColor={solid.color} stopOpacity="0.90" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.60" />
        </linearGradient>
      </defs>

      {/* Cluster Contact Shadow */}
      <ellipse cx={cx} cy={floorY} rx={span} ry="4" fill="rgba(15, 23, 42, 0.30)" />

      {/* Crystal 1: Left Oblique Prismatic Rhomb */}
      <polygon
        points={`
          ${cx - span * 0.85},${floorY}
          ${cx - span * 0.6},${floorY - height * 0.55}
          ${cx - span * 0.25},${floorY - height * 0.8}
          ${cx - span * 0.15},${floorY - height * 0.3}
          ${cx - span * 0.5},${floorY}
        `}
        fill={`url(#${cGradLeft})`}
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
        opacity="0.92"
      />
      {/* Crystal 1 Front Sub-facet */}
      <polygon
        points={`
          ${cx - span * 0.85},${floorY}
          ${cx - span * 0.6},${floorY - height * 0.55}
          ${cx - span * 0.35},${floorY - height * 0.25}
          ${cx - span * 0.5},${floorY}
        `}
        fill={solid.color}
        opacity="0.75"
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="0.6"
      />

      {/* Crystal 2: Right Sharp Crystalline Needle */}
      <polygon
        points={`
          ${cx + span * 0.2},${floorY}
          ${cx + span * 0.45},${floorY - height * 0.75}
          ${cx + span * 0.8},${floorY - height * 0.45}
          ${cx + span * 0.9},${floorY}
        `}
        fill={`url(#${cGradRight})`}
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeLinejoin="round"
        opacity="0.92"
      />
      {/* Crystal 2 Diagonal Bevel */}
      <polygon
        points={`
          ${cx + span * 0.2},${floorY}
          ${cx + span * 0.45},${floorY - height * 0.75}
          ${cx + span * 0.5},${floorY - height * 0.25}
          ${cx + span * 0.35},${floorY}
        `}
        fill="#ffffff"
        opacity="0.35"
      />

      {/* Crystal 3: Central Dominant Hexagonal Prismatic Crystal */}
      <polygon
        points={`
          ${cx - span * 0.35},${floorY}
          ${cx - span * 0.25},${floorY - height * 0.65}
          ${cx},${floorY - height}
          ${cx + span * 0.3},${floorY - height * 0.7}
          ${cx + span * 0.4},${floorY}
        `}
        fill={`url(#${cGradCenter})`}
        stroke="#ffffff"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* Central Prism Apex Facet */}
      <polygon
        points={`
          ${cx - span * 0.25},${floorY - height * 0.65}
          ${cx},${floorY - height}
          ${cx + span * 0.08},${floorY - height * 0.55}
          ${cx - span * 0.12},${floorY - height * 0.5}
        `}
        fill="#ffffff"
        opacity="0.55"
        stroke="#ffffff"
        strokeWidth="0.7"
      />
      {/* Central Prism Right Shaded Face */}
      <polygon
        points={`
          ${cx},${floorY - height}
          ${cx + span * 0.3},${floorY - height * 0.7}
          ${cx + span * 0.25},${floorY}
          ${cx + span * 0.08},${floorY - height * 0.55}
        `}
        fill="rgba(15, 23, 42, 0.25)"
      />

      {/* Crystal 4: Foreground Small Cubic Shards at the base */}
      <polygon
        points={`
          ${cx - span * 0.15},${floorY}
          ${cx - span * 0.08},${floorY - height * 0.35}
          ${cx + span * 0.15},${floorY - height * 0.32}
          ${cx + span * 0.12},${floorY}
        `}
        fill="#ffffff"
        opacity="0.75"
        stroke="#ffffff"
        strokeWidth="0.8"
      />

      {/* Sparkling Crystal Diamond Glints (✦) */}
      <g className="crystal-glints" aria-hidden="true">
        {/* Main Apex Glint */}
        <path
          d={`M ${cx} ${floorY - height - 3} L ${cx + 0.9} ${floorY - height} L ${cx + 3} ${floorY - height} L ${cx + 1.2} ${floorY - height + 0.9} L ${cx + 2} ${floorY - height + 3} L ${cx} ${floorY - height + 1.5} L ${cx - 2} ${floorY - height + 3} L ${cx - 1.2} ${floorY - height + 0.9} L ${cx - 3} ${floorY - height} L ${cx - 0.9} ${floorY - height} Z`}
          fill="#ffffff"
          opacity="0.95"
          className="crystal-glint g1"
        />
        {/* Right Needle Glint */}
        <circle cx={cx + span * 0.45} cy={floorY - height * 0.75} r="1.5" fill="#ffffff" className="crystal-glint g2" />
        {/* Left Rhomb Glint */}
        <circle cx={cx - span * 0.25} cy={floorY - height * 0.8} r="1.3" fill="#ffffff" className="crystal-glint g3" />
      </g>
    </g>
  );
}

/* =========================================================================
 * 3. SOLID METAL STRIP / CHUNKS COMPONENT - BRUSHED METALLIC SPECULAR REFLECTION
 * ========================================================================= */
function MetalSolid({
  solid,
  cx,
  floorY,
  baseWidth,
  isSubmerged,
  id,
}: {
  solid: VesselSolid;
  cx: number;
  floorY: number;
  baseWidth: number;
  isSubmerged: boolean;
  id: string;
}) {
  const stripWidth = Math.min(13, baseWidth * 0.13);
  const stripHeight = Math.min(26, baseWidth * 0.26);
  const gradId = `metal-grad-${id}`;

  return (
    <g className="metal-solid" aria-label={`Metal solid: ${solid.name}`}>
      <defs>
        {/* Anisotropic Brushed Metal Reflection Gradient */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="20%" stopColor={solid.color} stopOpacity="0.95" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="65%" stopColor={solid.color} stopOpacity="0.95" />
          <stop offset="85%" stopColor="#0f172a" stopOpacity="0.45" />
          <stop offset="100%" stopColor={solid.color} stopOpacity="0.90" />
        </linearGradient>
      </defs>

      {/* Metal Base Contact Shadow */}
      <ellipse cx={cx - 32} cy={floorY} rx={stripWidth * 0.9} ry="2.0" fill="rgba(15, 23, 42, 0.35)" />

      {/* Leaning Metallic Ribbon/Strip against glass wall */}
      <path
        d={`M ${cx - 38} ${floorY}
            L ${cx - 38 + stripWidth} ${floorY}
            L ${cx - 30 + stripWidth} ${floorY - stripHeight}
            L ${cx - 30} ${floorY - stripHeight}
            Z`}
        fill={`url(#${gradId})`}
        stroke="rgba(255, 255, 255, 0.75)"
        strokeWidth="0.9"
      />

      {/* Specular Highlight Streak Along Metallic Edge */}
      <line
        x1={cx - 30 + stripWidth * 0.4}
        y1={floorY - stripHeight}
        x2={cx - 38 + stripWidth * 0.4}
        y2={floorY}
        stroke="#ffffff"
        strokeWidth="1.0"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Metal Strip Top Chamfered Cut Edge */}
      <polygon
        points={`
          ${cx - 30},${floorY - stripHeight}
          ${cx - 30 + stripWidth},${floorY - stripHeight}
          ${cx - 28 + stripWidth},${floorY - stripHeight - 1.5}
          ${cx - 28},${floorY - stripHeight - 1.5}
        `}
        fill="#ffffff"
        opacity="0.75"
      />

      {/* Accompanying metallic granule chunks at the base */}
      <polygon
        points={`
          ${cx + 4},${floorY}
          ${cx + 9},${floorY - 7}
          ${cx + 16},${floorY - 6}
          ${cx + 18},${floorY}
        `}
        fill={`url(#${gradId})`}
        stroke="rgba(255, 255, 255, 0.6)"
        strokeWidth="0.8"
      />
      <polygon
        points={`
          ${cx + 16},${floorY}
          ${cx + 20},${floorY - 5}
          ${cx + 26},${floorY - 4}
          ${cx + 25},${floorY}
        `}
        fill={`url(#${gradId})`}
        stroke="rgba(255, 255, 255, 0.5)"
        strokeWidth="0.7"
      />
    </g>
  );
}
