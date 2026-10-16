import React from "react";
import type { ContainerContent, EquipmentType } from "../../types/experiment";
import { analyzeVesselPhases, type VesselSolid } from "../../utils/phaseUtils";
import { GlasswarePhases } from "./GlasswarePhases";
import "./GlasswareVessel.css";

interface GlasswareVesselProps {
  containerId?: string;
  equipmentType: EquipmentType;
  fillPercent: number;
  liquidColor: string;
  temperatureC: number;
  hasContents: boolean;
  contents?: ContainerContent[];
  capacity?: number;
}

export function GlasswareVessel({
  containerId,
  equipmentType,
  fillPercent,
  liquidColor,
  temperatureC,
  hasContents,
  contents,
  capacity,
}: GlasswareVesselProps) {
  const isHot = temperatureC >= 45;
  const isBoiling = temperatureC >= 80;
  const isCold = temperatureC <= 18;

  // Multi-phase state analysis (liquid, powder, crystal, solid metal)
  const phases = analyzeVesselPhases(contents || [], equipmentType, liquidColor);
  const effectiveCapacity = capacity || phases.capacity;
  const effectiveLiquidFill = contents && contents.length > 0 ? phases.liquidFillPercent : fillPercent;
  const effectiveLiquidColor = phases.liquidColor || liquidColor;
  const clampedFill = Math.max(0, Math.min(100, effectiveLiquidFill));
  const hasLiquid = phases.hasLiquid || (!contents && hasContents && fillPercent > 0);
  const gradId = `liq-grad-${containerId || equipmentType}`;

  return (
    <div className={`glassware-vessel glassware-vessel--${equipmentType}`}>
      {/* Thermal atmospheric effects */}
      {isHot && (
        <div className={`glassware-vessel__steam ${isBoiling ? "glassware-vessel__steam--intense" : ""}`} aria-hidden="true">
          <span className="steam-particle s1" />
          <span className="steam-particle s2" />
          <span className="steam-particle s3" />
        </div>
      )}
      {isCold && (
        <div className="glassware-vessel__frost" aria-hidden="true">
          <span className="frost-glint" />
        </div>
      )}

      <svg
        viewBox="0 0 160 200"
        className="glassware-vessel__svg"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          {/* Studio Softbox Specular Glare Gradient */}
          <linearGradient id="softbox-glare" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>

          {/* Pure Borosilicate Glass Cylindrical Body Optical Fill */}
          <linearGradient id="glass-body-fill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
            <stop offset="7%" stopColor="#e2e8f0" stopOpacity="0.08" />
            <stop offset="20%" stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="80%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="93%" stopColor="#e2e8f0" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.26" />
          </linearGradient>

          {/* Thick Solid Borosilicate Glass Base Caustic Gradient */}
          <linearGradient id="glass-base-caustic" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="45%" stopColor="#f8fafc" stopOpacity="0.45" />
            <stop offset="85%" stopColor="#ffffff" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.25" />
          </linearGradient>

          {/* Left Vertical Specular Highlight */}
          <linearGradient id="beaker-left-glare" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.60" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>

          {/* Liquid Depth Lighting Gradient (Natural authentic aqueous solution) */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={effectiveLiquidColor} stopOpacity="0.80" />
            <stop offset="30%" stopColor={effectiveLiquidColor} stopOpacity="0.90" />
            <stop offset="80%" stopColor={effectiveLiquidColor} stopOpacity="0.98" />
            <stop offset="100%" stopColor={effectiveLiquidColor} stopOpacity="0.92" />
          </linearGradient>

          {/* Liquid Meniscus Wetting Edge Glow */}
          <linearGradient id="meniscus-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="20%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="80%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
          </linearGradient>

          {/* Liquid Meniscus Surface 3D Oval */}
          <radialGradient id="meniscus-surface-grad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="50%" stopColor={effectiveLiquidColor} stopOpacity="0.65" />
            <stop offset="100%" stopColor={effectiveLiquidColor} stopOpacity="0.95" />
          </radialGradient>

          {/* Beaker Interior Clip Path for Liquid Containment */}
          <clipPath id="clip-beaker">
            <path d="M 27 24 L 27 172 Q 27 179 39 179 L 121 179 Q 133 179 133 172 L 133 24 Z" />
          </clipPath>

          <clipPath id="clip-erlenmeyer">
            <path d="M 68 22 L 68 54 L 27 172 Q 27 179 39 179 L 121 179 Q 133 179 133 172 L 92 54 L 92 22 Z" />
          </clipPath>

          <clipPath id="clip-test-tube">
            <path d="M 62 18 L 62 152 C 62 184 98 184 98 152 L 98 18 Z" />
          </clipPath>

          <clipPath id="clip-cylinder">
            <path d="M 60 22 L 60 166 L 100 166 L 100 22 Z" />
          </clipPath>

          <clipPath id="clip-burette">
            <path d="M 72 14 L 72 152 L 88 152 L 88 14 Z" />
          </clipPath>
        </defs>

        {/* Render specific glassware vessel with phase support */}
        {equipmentType === "erlenmeyer_flask" && (
          <ErlenmeyerSvg
            fillPercent={clampedFill}
            hasContents={hasContents}
            hasLiquid={hasLiquid}
            solids={phases.solids}
            gradId={gradId}
            containerId={containerId}
            capacity={effectiveCapacity}
          />
        )}
        {equipmentType === "test_tube" && (
          <TestTubeSvg
            fillPercent={clampedFill}
            hasContents={hasContents}
            hasLiquid={hasLiquid}
            solids={phases.solids}
            gradId={gradId}
            containerId={containerId}
            capacity={effectiveCapacity}
          />
        )}
        {equipmentType === "graduated_cylinder" && (
          <GraduatedCylinderSvg
            fillPercent={clampedFill}
            hasContents={hasContents}
            hasLiquid={hasLiquid}
            solids={phases.solids}
            gradId={gradId}
            containerId={containerId}
            capacity={effectiveCapacity}
          />
        )}
        {equipmentType === "burette" && (
          <BuretteSvg
            fillPercent={clampedFill}
            hasContents={hasContents}
            hasLiquid={hasLiquid}
            solids={phases.solids}
            gradId={gradId}
            containerId={containerId}
            capacity={effectiveCapacity}
          />
        )}
        {(equipmentType === "beaker" ||
          !["erlenmeyer_flask", "test_tube", "graduated_cylinder", "burette"].includes(equipmentType)) && (
          <BeakerSvg
            fillPercent={clampedFill}
            hasContents={hasContents}
            hasLiquid={hasLiquid}
            solids={phases.solids}
            gradId={gradId}
            containerId={containerId}
            capacity={effectiveCapacity}
          />
        )}
      </svg>
    </div>
  );
}

interface VesselSvgProps {
  fillPercent: number;
  hasContents: boolean;
  hasLiquid: boolean;
  solids?: VesselSolid[];
  gradId?: string;
  containerId?: string;
  capacity?: number;
}

/* =========================================================================
 * BEAKER SVG COMPONENT - ULTRA-REALISTIC BOROSILICATE GLASSWARE
 * ========================================================================= */
function BeakerSvg({
  fillPercent,
  hasContents,
  hasLiquid,
  solids,
  gradId = "liq-grad-beaker",
  containerId,
  capacity = 100,
}: VesselSvgProps) {
  // Continuous piece-wise linear mapping between floor y = 179 and Level 5 mark y = 58
  // 0% -> 179 (floor)
  // 20% -> 172 (Level 1 mark)
  // 40% -> 148 (Level 2 mark)
  // 60% -> 118 (Level 3 mark)
  // 80% -> 88 (Level 4 mark)
  // 100% -> 58 (Level 5 mark)
  // >100% -> headroom up to y = 35 (safe max rim height)
  const p = Math.max(0, Math.min(115, fillPercent));
  let liquidY = 179;
  if (p <= 0) liquidY = 179;
  else if (p <= 20) liquidY = 179 - (p / 20) * (179 - 172);
  else if (p <= 40) liquidY = 172 - ((p - 20) / 20) * (172 - 148);
  else if (p <= 60) liquidY = 148 - ((p - 40) / 20) * (148 - 118);
  else if (p <= 80) liquidY = 118 - ((p - 60) / 20) * (118 - 88);
  else if (p <= 100) liquidY = 88 - ((p - 80) / 20) * (88 - 58);
  else liquidY = 58 - ((p - 100) / 15) * (58 - 35);
  const liquidHeight = Math.max(0, 179 - liquidY);

  const val100 = capacity;
  const val80 = Math.round(capacity * 0.8);
  const val60 = Math.round(capacity * 0.6);
  const val40 = Math.round(capacity * 0.4);
  const val20 = Math.round(capacity * 0.2);
  const isLarge = capacity >= 1000;
  const fontSize = isLarge ? "7.5" : "8.5";

  // Real-life buoyant bubble distribution across fluid depth (matching reference photo)
  const bubbleList = [
    { x: 44, yRatio: 0.85, r: 2.8, delay: "0s", cls: "b1" },
    { x: 58, yRatio: 0.65, r: 4.5, delay: "0.4s", cls: "b2" },
    { x: 72, yRatio: 0.40, r: 2.0, delay: "1.1s", cls: "b3" },
    { x: 86, yRatio: 0.75, r: 3.6, delay: "0.7s", cls: "b4" },
    { x: 98, yRatio: 0.28, r: 5.2, delay: "1.6s", cls: "b5" },
    { x: 110, yRatio: 0.80, r: 2.4, delay: "0.2s", cls: "b6" },
    { x: 50, yRatio: 0.22, r: 3.4, delay: "1.3s", cls: "b7" },
    { x: 80, yRatio: 0.55, r: 5.0, delay: "0.9s", cls: "b8" },
    { x: 64, yRatio: 0.90, r: 1.8, delay: "0.5s", cls: "b9" },
    { x: 102, yRatio: 0.50, r: 2.6, delay: "1.4s", cls: "b10" },
    { x: 76, yRatio: 0.15, r: 4.0, delay: "1.8s", cls: "b11" },
  ];

  return (
    <g className="glass-beaker">
      {/* 1. Subtle Glass Bench Contact Shadow */}
      <ellipse cx="80" cy="189" rx="50" ry="3.5" fill="rgba(15, 23, 42, 0.08)" aria-hidden="true" />

      {/* 2. Glass Beaker Back Rim / Interior Optical Depth */}
      <ellipse
        cx="80"
        cy="22.5"
        rx="57"
        ry="5.5"
        fill="rgba(241, 245, 249, 0.10)"
        stroke="rgba(255, 255, 255, 0.55)"
        strokeWidth="1.2"
      />
      <ellipse
        cx="80"
        cy="22.5"
        rx="56"
        ry="5.0"
        fill="none"
        stroke="rgba(148, 163, 184, 0.25)"
        strokeWidth="0.8"
      />

      {/* 2b. Translucent Borosilicate Glass Cylindrical Body (Ambient glass refraction) */}
      <path
        d="M 22 23 Q 25 35 25 50 L 25 174 Q 25 187 40 187 L 120 187 Q 135 187 135 174 L 135 50 Q 135 35 138 23 Z"
        fill="url(#glass-body-fill)"
      />

      {/* 3. Thick Solid Borosilicate Glass Base (Transparent solid bottom slab) */}
      <path
        d="M 25 174 Q 25 187 40 187 L 120 187 Q 135 187 135 174 L 133 174 Q 133 179 121 179 L 39 179 Q 27 179 27 174 Z"
        fill="url(#glass-base-caustic)"
      />

      {/* 4. Contents Body (Solids & Liquid Clipped inside inner vessel cavity) */}
      {(hasContents || (solids && solids.length > 0)) && (
        <g clipPath="url(#clip-beaker)">
          {/* Solid mounds, crystals, metal chunks resting on vessel floor */}
          {solids && solids.length > 0 && (
            <GlasswarePhases
              solids={solids}
              cx={80}
              floorY={179}
              baseWidth={104}
              isSubmerged={hasLiquid && fillPercent > 0}
              containerId={containerId}
            />
          )}

          {/* Liquid Body */}
          {hasLiquid && fillPercent > 0 && (
            <>
              {/* Main Translucent Volumetric Aqueous Fluid */}
              <rect
                x="24"
                y={liquidY}
                width="112"
                height={liquidHeight + 12}
                fill={`url(#${gradId})`}
                className="glass-liquid-rect"
              />

              {/* Meniscus Top Surface Ellipse (3D Fluid Interface) */}
              <ellipse
                cx="80"
                cy={liquidY}
                rx="53"
                ry="4.5"
                fill="url(#meniscus-surface-grad)"
                className="beaker-meniscus-surface"
              />

              {/* Meniscus Wetting Edge Glow Line */}
              <path
                d={`M 27 ${liquidY} Q 80 ${liquidY + 4.5} 133 ${liquidY}`}
                stroke="url(#meniscus-glow)"
                strokeWidth="2.2"
                fill="none"
                opacity="0.95"
              />
              <path
                d={`M 27 ${liquidY} Q 80 ${liquidY - 4.0} 133 ${liquidY}`}
                stroke="rgba(255, 255, 255, 0.40)"
                strokeWidth="1.0"
                fill="none"
              />

              {/* Spherical Refractive Bubbles (Matching reference photograph) */}
              {bubbleList.map((b, i) => {
                const bubbleY = liquidY + liquidHeight * b.yRatio;
                if (bubbleY < liquidY + 6 || bubbleY > 175) return null;
                return (
                  <g key={i} className={`beaker-bubble-group ${b.cls}`} style={{ animationDelay: b.delay }}>
                    {/* Bubble translucent outer bubble sphere */}
                    <circle
                      cx={b.x}
                      cy={bubbleY}
                      r={b.r}
                      fill="rgba(255, 255, 255, 0.16)"
                      stroke="rgba(255, 255, 255, 0.85)"
                      strokeWidth="0.8"
                    />
                    {/* Specular pinpoint highlight glint on top-left */}
                    <circle
                      cx={b.x - b.r * 0.35}
                      cy={bubbleY - b.r * 0.35}
                      r={Math.max(0.65, b.r * 0.3)}
                      fill="#ffffff"
                      fillOpacity="0.98"
                    />
                    {/* Lower-right refraction shadow arc */}
                    <path
                      d={`M ${b.x - b.r * 0.65} ${bubbleY + b.r * 0.3} Q ${b.x} ${bubbleY + b.r * 0.85} ${b.x + b.r * 0.65} ${bubbleY + b.r * 0.3}`}
                      stroke="rgba(15, 23, 42, 0.28)"
                      strokeWidth="0.65"
                      fill="none"
                    />
                  </g>
                );
              })}
            </>
          )}
        </g>
      )}

      {/* 5. Lab-Grade Black Ceramic Graduation Markings */}
      <g className="glass-graduations" stroke="#0f172a" strokeWidth="1.4" opacity="0.88">
        {/* 100% Capacity Mark */}
        <line x1="104" y1="58" x2="133" y2="58" strokeWidth="1.8" />
        <text x="98" y="61.5" fontSize={fontSize} fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val100}
        </text>

        {/* 90% Sub-tick */}
        <line x1="120" y1="73" x2="133" y2="73" strokeWidth="1.1" opacity="0.75" />

        {/* 80% Mark */}
        <line x1="108" y1="88" x2="133" y2="88" strokeWidth="1.6" />
        <text x="102" y="91.5" fontSize={fontSize} fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val80}
        </text>

        {/* 70% Sub-tick */}
        <line x1="120" y1="103" x2="133" y2="103" strokeWidth="1.1" opacity="0.75" />

        {/* 60% Mark */}
        <line x1="108" y1="118" x2="133" y2="118" strokeWidth="1.6" />
        <text x="102" y="121.5" fontSize={fontSize} fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val60}
        </text>

        {/* 50% Sub-tick */}
        <line x1="120" y1="133" x2="133" y2="133" strokeWidth="1.1" opacity="0.75" />

        {/* 40% Mark */}
        <line x1="108" y1="148" x2="133" y2="148" strokeWidth="1.6" />
        <text x="102" y="151.5" fontSize={fontSize} fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val40}
        </text>

        {/* 30% Sub-tick */}
        <line x1="120" y1="160" x2="133" y2="160" strokeWidth="1.1" opacity="0.75" />

        {/* 20% Mark */}
        <line x1="112" y1="172" x2="133" y2="172" strokeWidth="1.5" />
        <text x="106" y="175" fontSize={isLarge ? "7" : "8"} fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val20}
        </text>
      </g>

      {/* 6. Heavy Borosilicate Glass Bottom Caustics & Reflection Arcs */}
      {/* Outer bench contact line */}
      <path
        d="M 38 186.5 L 122 186.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.90"
      />
      {/* Inner glass floor meniscus caustic */}
      <path
        d="M 28 179 Q 80 183.5 132 179"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.0"
        strokeLinecap="round"
        opacity="0.78"
      />
      {/* Rounded bottom corner caustic reflections */}
      <path
        d="M 25 170 Q 25 186.5 38 186.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M 135 170 Q 135 186.5 122 186.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* 7. Cylindrical Wall Specular Edges & Refractions (No cartoonish outlines) */}
      {/* Outer Left Edge Specular Contour */}
      <path
        d="M 22 23 Q 25 35 25 50 L 25 174 Q 25 187 40 187"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.95"
      />
      {/* Faint subtle optical boundary for edge definition */}
      <path
        d="M 22 23 Q 25 35 25 50 L 25 174 Q 25 187 40 187"
        fill="none"
        stroke="rgba(71, 85, 105, 0.22)"
        strokeWidth="1.0"
        strokeLinecap="round"
      />

      {/* Outer Right Edge Specular Contour */}
      <path
        d="M 138 23 Q 135 35 135 50 L 135 174 Q 135 187 120 187"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.90"
      />
      <path
        d="M 138 23 Q 135 35 135 50 L 135 174 Q 135 187 120 187"
        fill="none"
        stroke="rgba(71, 85, 105, 0.22)"
        strokeWidth="1.0"
        strokeLinecap="round"
      />

      {/* 8. Studio Softbox Specular Glare (3-Layered Realistic Lighting from Left) */}
      {/* Layer 1: Wide ambient softbox bloom */}
      <path
        d="M 28.5 28 L 28.5 172 Q 28.5 183 37 183"
        fill="none"
        stroke="#ffffff"
        strokeWidth="8.5"
        strokeLinecap="round"
        opacity="0.20"
      />
      {/* Layer 2: Medium specular sheen */}
      <path
        d="M 28.5 28 L 28.5 172 Q 28.5 183 37 183"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.2"
        strokeLinecap="round"
        opacity="0.70"
      />
      {/* Layer 3: Brilliant specular highlight core */}
      <path
        d="M 28.5 28 L 28.5 172 Q 28.5 183 37 183"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.98"
      />
      {/* Secondary softer vertical reflection beam */}
      <line x1="35" y1="38" x2="35" y2="168" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.38" />

      {/* Right side secondary specular reflection */}
      <path
        d="M 131.5 28 L 131.5 172 Q 131.5 183 123 183"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* 9. Front Flared Pouring Spout & 3D Beaded Glass Rim Lip */}
      {/* Front rim toroidal specular highlight */}
      <path
        d="M 14 18 Q 19 23 24 25 Q 80 29.5 136 25 Q 139 23 138 21"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.96"
      />
      {/* Inner lip edge accent */}
      <path
        d="M 24 24.5 Q 80 28 136 24.5"
        fill="none"
        stroke="rgba(255, 255, 255, 0.65)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Pouring spout tip glint */}
      <circle cx="15" cy="18.5" r="1.4" fill="#ffffff" opacity="0.95" />
    </g>
  );
}

/* =========================================================================
 * ERLENMEYER FLASK SVG COMPONENT - ULTRA-REALISTIC CONICAL BOROSILICATE
 * ========================================================================= */
function ErlenmeyerSvg({
  fillPercent,
  hasContents,
  hasLiquid,
  solids,
  gradId = "liq-grad-erlenmeyer_flask",
  containerId,
  capacity = 250,
}: VesselSvgProps) {
  const isLarge = capacity >= 1000;
  const val4 = Math.round(capacity * 0.8);
  const val3 = Math.round(capacity * 0.6);
  const val2 = Math.round(capacity * 0.4);
  const val1 = Math.round(capacity * 0.2);

  // Height from interior base y = 179 to neck junction y = 54 = 125px span
  const liquidHeight = (125 * fillPercent) / 100;
  const liquidY = 179 - liquidHeight;

  // Dynamic conical width calculation at liquid surface level
  const t = Math.max(0, Math.min(1, (179 - liquidY) / (179 - 54)));
  const halfW = 54 - t * 41;
  const leftX = 80 - halfW;
  const rightX = 80 + halfW;
  const meniscusRy = Math.max(2.4, Math.min(5.2, halfW * 0.09));

  const flaskBubbles = [
    { x: 52, yRatio: 0.85, r: 2.8, delay: "0.2s", cls: "b1" },
    { x: 66, yRatio: 0.65, r: 4.2, delay: "0.8s", cls: "b2" },
    { x: 80, yRatio: 0.40, r: 2.2, delay: "1.4s", cls: "b3" },
    { x: 95, yRatio: 0.78, r: 3.6, delay: "0.5s", cls: "b4" },
    { x: 108, yRatio: 0.88, r: 2.5, delay: "1.1s", cls: "b5" },
    { x: 74, yRatio: 0.20, r: 3.2, delay: "1.7s", cls: "b6" },
    { x: 86, yRatio: 0.55, r: 4.5, delay: "0.9s", cls: "b7" },
  ];

  return (
    <g className="glass-erlenmeyer">
      {/* 1. Subtle Glass Bench Contact Shadow */}
      <ellipse cx="80" cy="189" rx="52" ry="3.5" fill="rgba(15, 23, 42, 0.08)" aria-hidden="true" />

      {/* 2. Top Rim Collar / Back Glass Depth */}
      <ellipse
        cx="80"
        cy="18.5"
        rx="16.5"
        ry="3.5"
        fill="rgba(241, 245, 249, 0.12)"
        stroke="rgba(255, 255, 255, 0.55)"
        strokeWidth="1.2"
      />
      <ellipse
        cx="80"
        cy="18.5"
        rx="15.5"
        ry="3.0"
        fill="none"
        stroke="rgba(148, 163, 184, 0.25)"
        strokeWidth="0.8"
      />

      {/* 2b. Translucent Borosilicate Conical Glass Body */}
      <path
        d="M 68 19 L 68 54 L 25 174 Q 25 187 40 187 L 120 187 Q 135 187 135 174 L 92 54 L 92 19 Z"
        fill="url(#glass-body-fill)"
      />

      {/* 3. Thick Solid Borosilicate Glass Base (Heavy bottom caustics) */}
      <path
        d="M 25 174 Q 25 187 40 187 L 120 187 Q 135 187 135 174 L 133 174 Q 133 179 121 179 L 39 179 Q 27 179 27 174 Z"
        fill="url(#glass-base-caustic)"
      />

      {/* 4. Contents Body (Solids & Liquid Clipped inside inner conical glass cavity) */}
      {(hasContents || (solids && solids.length > 0)) && (
        <g clipPath="url(#clip-erlenmeyer)">
          {/* Solid mounds, crystals, metal chunks resting on conical floor */}
          {solids && solids.length > 0 && (
            <GlasswarePhases
              solids={solids}
              cx={80}
              floorY={179}
              baseWidth={104}
              isSubmerged={hasLiquid && fillPercent > 0}
              containerId={containerId}
            />
          )}

          {/* Liquid Body */}
          {hasLiquid && fillPercent > 0 && (
            <>
              <rect
                x="15"
                y={liquidY}
                width="130"
                height={liquidHeight + 12}
                fill={`url(#${gradId})`}
                className="glass-liquid-rect"
              />

              <ellipse
                cx="80"
                cy={liquidY}
                rx={halfW}
                ry={meniscusRy}
                fill="url(#meniscus-surface-grad)"
                className="beaker-meniscus-surface"
              />

              <path
                d={`M ${leftX} ${liquidY} Q 80 ${liquidY + meniscusRy} ${rightX} ${liquidY}`}
                stroke="url(#meniscus-glow)"
                strokeWidth="2.2"
                fill="none"
                opacity="0.95"
              />
              <path
                d={`M ${leftX} ${liquidY} Q 80 ${liquidY - meniscusRy * 0.8} ${rightX} ${liquidY}`}
                stroke="rgba(255, 255, 255, 0.40)"
                strokeWidth="1.0"
                fill="none"
              />

              {flaskBubbles.map((b, i) => {
                const bubbleY = liquidY + liquidHeight * b.yRatio;
                if (bubbleY < liquidY + 6 || bubbleY > 175) return null;
                return (
                  <g key={i} className={`beaker-bubble-group ${b.cls}`} style={{ animationDelay: b.delay }}>
                    <circle
                      cx={b.x}
                      cy={bubbleY}
                      r={b.r}
                      fill="rgba(255, 255, 255, 0.16)"
                      stroke="rgba(255, 255, 255, 0.85)"
                      strokeWidth="0.8"
                    />
                    <circle
                      cx={b.x - b.r * 0.35}
                      cy={bubbleY - b.r * 0.35}
                      r={Math.max(0.65, b.r * 0.3)}
                      fill="#ffffff"
                      fillOpacity="0.98"
                    />
                    <path
                      d={`M ${b.x - b.r * 0.65} ${bubbleY + b.r * 0.3} Q ${b.x} ${bubbleY + b.r * 0.85} ${b.x + b.r * 0.65} ${bubbleY + b.r * 0.3}`}
                      stroke="rgba(15, 23, 42, 0.28)"
                      strokeWidth="0.65"
                      fill="none"
                    />
                  </g>
                );
              })}
            </>
          )}
        </g>
      )}

      {/* 5. Lab-Grade Black Ceramic Graduation Markings & Watermark */}
      <g className="glass-graduations" stroke="#0f172a" strokeWidth="1.4" opacity="0.88">
        <line x1="94" y1="105" x2="108" y2="105" strokeWidth="1.8" />
        <text x="90" y="108.5" fontSize={isLarge ? "7" : "8"} fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val4}
        </text>

        <line x1="102" y1="130" x2="118" y2="130" strokeWidth="1.6" />
        <text x="98" y="133.5" fontSize={isLarge ? "7" : "8"} fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val3}
        </text>

        <line x1="110" y1="155" x2="128" y2="155" strokeWidth="1.6" />
        <text x="106" y="158.5" fontSize={isLarge ? "7" : "8"} fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val2}
        </text>

        <line x1="118" y1="172" x2="134" y2="172" strokeWidth="1.5" />
        <text x="114" y="175" fontSize={isLarge ? "6.5" : "7.5"} fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val1}
        </text>
      </g>

      {/* 6. Heavy Borosilicate Glass Bottom Caustics */}
      <path
        d="M 38 186.5 L 122 186.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.90"
      />
      <path
        d="M 28 179 Q 80 183.5 132 179"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.0"
        strokeLinecap="round"
        opacity="0.78"
      />
      <path
        d="M 25 170 Q 25 186.5 38 186.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M 135 170 Q 135 186.5 122 186.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* 7. Conical Outer Specular Edges & Optical Boundary (No cartoonish outlines) */}
      <path
        d="M 68 18.5 L 68 54 L 25 174 Q 25 187 40 187"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M 68 18.5 L 68 54 L 25 174 Q 25 187 40 187"
        fill="none"
        stroke="rgba(71, 85, 105, 0.22)"
        strokeWidth="1.0"
        strokeLinecap="round"
      />

      <path
        d="M 92 18.5 L 92 54 L 135 174 Q 135 187 120 187"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.90"
      />
      <path
        d="M 92 18.5 L 92 54 L 135 174 Q 135 187 120 187"
        fill="none"
        stroke="rgba(71, 85, 105, 0.22)"
        strokeWidth="1.0"
        strokeLinecap="round"
      />

      {/* 8. Studio Softbox Specular Glare along Conical Slope (3-Layered) */}
      <path
        d="M 70 24 L 70 53 L 28.5 172 Q 28.5 183 37 183"
        fill="none"
        stroke="#ffffff"
        strokeWidth="8.0"
        strokeLinecap="round"
        opacity="0.20"
      />
      <path
        d="M 70 24 L 70 53 L 28.5 172 Q 28.5 183 37 183"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.8"
        strokeLinecap="round"
        opacity="0.70"
      />
      <path
        d="M 70 24 L 70 53 L 28.5 172 Q 28.5 183 37 183"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.98"
      />
      <line x1="72" y1="26" x2="72" y2="52" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />

      {/* Right Edge Slope Glare */}
      <path
        d="M 90 26 L 90 53 L 131.5 172 Q 131.5 183 123 183"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* 9. Beaded Top Rim Lip */}
      <ellipse cx="80" cy="18.5" rx="16.5" ry="3.5" fill="none" stroke="#ffffff" strokeWidth="2.2" opacity="0.96" />
      <ellipse cx="80" cy="18.5" rx="17.5" ry="4.0" fill="none" stroke="rgba(255, 255, 255, 0.65)" strokeWidth="1.0" />
    </g>
  );
}

/* =========================================================================
 * TEST TUBE SVG COMPONENT - ULTRA-REALISTIC CYLINDRICAL BOROSILICATE
 * ========================================================================= */
function TestTubeSvg({
  fillPercent,
  hasContents,
  hasLiquid,
  solids,
  gradId = "liq-grad-test_tube",
  containerId,
  capacity = 20,
}: VesselSvgProps) {
  const val3 = Math.round(capacity * 0.75);
  const val2 = Math.round(capacity * 0.5);
  const val1 = Math.round(capacity * 0.25);

  // Height from interior bottom curve y = 178 to top y = 28 = 150px span
  const liquidHeight = (150 * fillPercent) / 100;
  const liquidY = 178 - liquidHeight;

  const tubeBubbles = [
    { x: 74, yRatio: 0.85, r: 2.2, delay: "0.1s", cls: "b1" },
    { x: 84, yRatio: 0.60, r: 3.4, delay: "0.6s", cls: "b2" },
    { x: 78, yRatio: 0.35, r: 2.0, delay: "1.2s", cls: "b3" },
    { x: 82, yRatio: 0.18, r: 2.8, delay: "1.8s", cls: "b4" },
    { x: 76, yRatio: 0.72, r: 3.6, delay: "0.9s", cls: "b5" },
  ];

  return (
    <g className="glass-test-tube">
      {/* 1. Subtle Test Tube Base Shadow */}
      <ellipse cx="80" cy="191" rx="22" ry="3" fill="rgba(15, 23, 42, 0.08)" aria-hidden="true" />

      {/* 2. Top Flanged Rim Back Glass */}
      <ellipse
        cx="80"
        cy="17.5"
        rx="22"
        ry="4.0"
        fill="rgba(241, 245, 249, 0.12)"
        stroke="rgba(255, 255, 255, 0.55)"
        strokeWidth="1.2"
      />
      <ellipse
        cx="80"
        cy="17.5"
        rx="21"
        ry="3.5"
        fill="none"
        stroke="rgba(148, 163, 184, 0.25)"
        strokeWidth="0.8"
      />

      {/* 2b. Translucent Borosilicate Test Tube Cylindrical Body */}
      <path
        d="M 60 18 L 60 152 C 60 190 100 190 100 152 L 100 18 Z"
        fill="url(#glass-body-fill)"
      />

      {/* 3. Thick Hemispherical Solid Glass Bottom Slab */}
      <path
        d="M 60 152 C 60 190 100 190 100 152 C 98 184 62 184 60 152 Z"
        fill="url(#glass-base-caustic)"
      />

      {/* 4. Contents Body (Solids & Liquid Clipped inside rounded test tube) */}
      {(hasContents || (solids && solids.length > 0)) && (
        <g clipPath="url(#clip-test-tube)">
          {/* Solid mounds, crystals, metal chunks resting on hemispherical bottom */}
          {solids && solids.length > 0 && (
            <GlasswarePhases
              solids={solids}
              cx={80}
              floorY={178}
              baseWidth={34}
              isSubmerged={hasLiquid && fillPercent > 0}
              containerId={containerId}
            />
          )}

          {/* Liquid Body */}
          {hasLiquid && fillPercent > 0 && (
            <>
              <rect
                x="58"
                y={liquidY}
                width="44"
                height={liquidHeight + 25}
                fill={`url(#${gradId})`}
                className="glass-liquid-rect"
              />

              <ellipse
                cx="80"
                cy={liquidY}
                rx="18"
                ry="3.2"
                fill="url(#meniscus-surface-grad)"
                className="beaker-meniscus-surface"
              />

              <path
                d={`M 62 ${liquidY} Q 80 ${liquidY + 3.2} 98 ${liquidY}`}
                stroke="url(#meniscus-glow)"
                strokeWidth="2.0"
                fill="none"
                opacity="0.95"
              />
              <path
                d={`M 62 ${liquidY} Q 80 ${liquidY - 2.8} 98 ${liquidY}`}
                stroke="rgba(255, 255, 255, 0.40)"
                strokeWidth="1.0"
                fill="none"
              />

              {tubeBubbles.map((b, i) => {
                const bubbleY = liquidY + liquidHeight * b.yRatio;
                if (bubbleY < liquidY + 5 || bubbleY > 175) return null;
                return (
                  <g key={i} className={`beaker-bubble-group ${b.cls}`} style={{ animationDelay: b.delay }}>
                    <circle
                      cx={b.x}
                      cy={bubbleY}
                      r={b.r}
                      fill="rgba(255, 255, 255, 0.16)"
                      stroke="rgba(255, 255, 255, 0.85)"
                      strokeWidth="0.8"
                    />
                    <circle
                      cx={b.x - b.r * 0.35}
                      cy={bubbleY - b.r * 0.35}
                      r={Math.max(0.65, b.r * 0.3)}
                      fill="#ffffff"
                      fillOpacity="0.98"
                    />
                    <path
                      d={`M ${b.x - b.r * 0.65} ${bubbleY + b.r * 0.3} Q ${b.x} ${bubbleY + b.r * 0.85} ${b.x + b.r * 0.65} ${bubbleY + b.r * 0.3}`}
                      stroke="rgba(15, 23, 42, 0.28)"
                      strokeWidth="0.65"
                      fill="none"
                    />
                  </g>
                );
              })}
            </>
          )}
        </g>
      )}

      {/* 5. Lab-Grade Black Ceramic Tube Graduations */}
      <g className="glass-graduations" stroke="#0f172a" strokeWidth="1.3" opacity="0.88">
        <line x1="88" y1="65" x2="98" y2="65" strokeWidth="1.6" />
        <text x="85" y="68" fontSize="7" fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val3}ml
        </text>

        <line x1="91" y1="85" x2="98" y2="85" strokeWidth="1.0" opacity="0.75" />

        <line x1="88" y1="105" x2="98" y2="105" strokeWidth="1.6" />
        <text x="85" y="108" fontSize="7" fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val2}
        </text>

        <line x1="91" y1="125" x2="98" y2="125" strokeWidth="1.0" opacity="0.75" />

        <line x1="88" y1="145" x2="98" y2="145" strokeWidth="1.6" />
        <text x="85" y="148" fontSize="7" fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
          {val1}
        </text>
      </g>

      {/* 6. Hemispherical Solid Glass Bottom Caustics */}
      {/* Outer hemisphere bottom caustic line */}
      <path
        d="M 64 152 C 64 188 96 188 96 152"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.90"
      />
      {/* Inner floor caustic curve */}
      <path
        d="M 62 152 C 62 181 98 181 98 152"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* 7. Cylindrical Tube Specular Edges & Optical Boundary (No cartoonish outlines) */}
      <path
        d="M 60 18 L 60 152 C 60 190 80 190 80 190"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M 60 18 L 60 152 C 60 190 100 190 100 152 L 100 18"
        fill="none"
        stroke="rgba(71, 85, 105, 0.22)"
        strokeWidth="1.0"
        strokeLinecap="round"
      />
      <path
        d="M 100 18 L 100 152 C 100 190 80 190 80 190"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.90"
      />

      {/* 8. Studio Softbox Specular Highlights along Column and Base Hemisphere */}
      {/* Layer 1: Wide softbox bloom */}
      <path
        d="M 64.5 24 L 64.5 150 C 64.5 176 74 184 80 184"
        fill="none"
        stroke="#ffffff"
        strokeWidth="7.0"
        strokeLinecap="round"
        opacity="0.20"
      />
      {/* Layer 2: Medium sheen */}
      <path
        d="M 64.5 24 L 64.5 150 C 64.5 176 74 184 80 184"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.70"
      />
      {/* Layer 3: Brilliant core */}
      <path
        d="M 64.5 24 L 64.5 150 C 64.5 176 74 184 80 184"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.98"
      />
      <line x1="95.5" y1="24" x2="95.5" y2="152" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />

      {/* 9. Flanged Beaded Top Lip */}
      <ellipse cx="80" cy="17.5" rx="22" ry="4.0" fill="none" stroke="#ffffff" strokeWidth="2.2" opacity="0.96" />
      <ellipse cx="80" cy="17.5" rx="23" ry="4.5" fill="none" stroke="rgba(255, 255, 255, 0.65)" strokeWidth="1.0" />
    </g>
  );
}

/* =========================================================================
 * GRADUATED CYLINDER SVG COMPONENT - ULTRA-REALISTIC HEAVY GLASS BASE
 * ========================================================================= */
function GraduatedCylinderSvg({
  fillPercent,
  hasContents,
  hasLiquid,
  solids,
  gradId = "liq-grad-graduated_cylinder",
  containerId,
  capacity = 100,
}: VesselSvgProps) {
  // Height from pedestal junction y = 166 to top y = 26 = 140px span
  const liquidHeight = (140 * fillPercent) / 100;
  const liquidY = 166 - liquidHeight;

  return (
    <g className="glass-cylinder">
      {/* 1. Glass Pedestal Bench Shadow */}
      <ellipse cx="80" cy="190" rx="46" ry="3.5" fill="rgba(15, 23, 42, 0.08)" aria-hidden="true" />

      {/* 2. Heavy Borosilicate Glass Hexagonal Pedestal Base with 3D Refraction */}
      <polygon
        points="44,188 116,188 106,166 54,166"
        fill="rgba(241, 245, 249, 0.22)"
      />
      <polygon
        points="44,188 116,188 106,166 54,166"
        fill="none"
        stroke="rgba(71, 85, 105, 0.22)"
        strokeWidth="1.0"
      />
      <line x1="48" y1="187" x2="112" y2="187" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.90" />
      <line x1="55" y1="167" x2="105" y2="167" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.80" />
      <line x1="45" y1="187" x2="55" y2="167" stroke="#ffffff" strokeWidth="1.6" opacity="0.85" />
      <line x1="115" y1="187" x2="105" y2="167" stroke="#ffffff" strokeWidth="1.4" opacity="0.75" />

      {/* 2b. Translucent Borosilicate Cylinder Body */}
      <rect
        x="60"
        y="22"
        width="40"
        height="144"
        fill="url(#glass-body-fill)"
      />

      {/* 3. Contents Body (Solids & Liquid Clipped inside vertical cylinder column) */}
      {(hasContents || (solids && solids.length > 0)) && (
        <g clipPath="url(#clip-cylinder)">
          {/* Solid mounds, crystals, metal chunks resting on cylinder floor */}
          {solids && solids.length > 0 && (
            <GlasswarePhases
              solids={solids}
              cx={80}
              floorY={166}
              baseWidth={38}
              isSubmerged={hasLiquid && fillPercent > 0}
              containerId={containerId}
            />
          )}

          {/* Liquid Body */}
          {hasLiquid && fillPercent > 0 && (
            <>
              <rect
                x="58"
                y={liquidY}
                width="44"
                height={liquidHeight + 12}
                fill={`url(#${gradId})`}
                className="glass-liquid-rect"
              />

              <ellipse
                cx="80"
                cy={liquidY}
                rx="19.5"
                ry="3.5"
                fill="url(#meniscus-surface-grad)"
                className="beaker-meniscus-surface"
              />

              <path
                d={`M 60 ${liquidY} Q 80 ${liquidY + 3.5} 100 ${liquidY}`}
                stroke="url(#meniscus-glow)"
                strokeWidth="2.0"
                fill="none"
                opacity="0.95"
              />
              <path
                d={`M 60 ${liquidY} Q 80 ${liquidY - 3.0} 100 ${liquidY}`}
                stroke="rgba(255, 255, 255, 0.40)"
                strokeWidth="1.0"
                fill="none"
              />

              <circle cx="74" cy={Math.min(158, liquidY + 25)} r="2.2" fill="rgba(255,255,255,0.2)" stroke="#ffffff" strokeWidth="0.8" className="bubble b1" />
              <circle cx="86" cy={Math.min(158, liquidY + 45)} r="2.8" fill="rgba(255,255,255,0.2)" stroke="#ffffff" strokeWidth="0.8" className="bubble b2" />
            </>
          )}
        </g>
      )}

      {/* 4. High-Precision Black Ceramic Volumetric Graduations */}
      <g className="glass-graduations" stroke="#0f172a" strokeWidth="1.2" opacity="0.88">
        {[28, 42, 56, 70, 84, 98, 112, 126, 140, 154].map((y, i) => {
          const stepVal = Math.round(capacity - (i * capacity) / 10);
          return (
            <React.Fragment key={y}>
              <line x1="88" y1={y} x2="99" y2={y} strokeWidth={i % 2 === 0 ? 1.6 : 1.0} />
              {i % 2 === 0 && (
                <text
                  x="85"
                  y={y + 3}
                  fontSize={capacity >= 1000 ? "5.5" : "6.5"}
                  fontFamily="'Inter', system-ui, sans-serif"
                  fontWeight="700"
                  textAnchor="end"
                  fill="#0f172a"
                  stroke="none"
                >
                  {stepVal}
                </text>
              )}
            </React.Fragment>
          );
        })}
      </g>

      {/* 5. Cylindrical Wall Specular Edges (No cartoonish outlines) */}
      <line x1="60" y1="22" x2="60" y2="166" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
      <line x1="60" y1="22" x2="60" y2="166" stroke="rgba(71, 85, 105, 0.22)" strokeWidth="1.0" strokeLinecap="round" />
      <line x1="100" y1="22" x2="100" y2="166" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.90" />
      <line x1="100" y1="22" x2="100" y2="166" stroke="rgba(71, 85, 105, 0.22)" strokeWidth="1.0" strokeLinecap="round" />

      {/* 6. Spout Accent & 3D Top Lip */}
      <path
        d="M 50 16 Q 55 20 60 22 Q 80 25 100 22 Q 104 19 103 17"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.96"
      />
      <ellipse cx="80" cy="22" rx="20" ry="3.5" fill="none" stroke="rgba(255, 255, 255, 0.65)" strokeWidth="1.0" />

      {/* 7. Vertical Studio Softbox Glare Strip (3-Layered) */}
      <line x1="64" y1="26" x2="64" y2="164" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" opacity="0.20" />
      <line x1="64" y1="26" x2="64" y2="164" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" opacity="0.70" />
      <line x1="64" y1="26" x2="64" y2="164" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.98" />
      <line x1="96" y1="26" x2="96" y2="164" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
    </g>
  );
}

/* =========================================================================
 * BURETTE SVG COMPONENT - ULTRA-REALISTIC CAPILLARY & STOPCOCK
 * ========================================================================= */
function BuretteSvg({
  fillPercent,
  hasContents,
  hasLiquid,
  solids,
  gradId = "liq-grad-burette",
  containerId,
  capacity = 50,
}: VesselSvgProps) {
  const liquidHeight = (136 * fillPercent) / 100;
  const liquidY = 150 - liquidHeight;

  return (
    <g className="glass-burette">
      {/* 1. Workbench Dispensing Shadow */}
      <ellipse cx="80" cy="198" rx="12" ry="2.5" fill="rgba(15, 23, 42, 0.08)" aria-hidden="true" />

      {/* 2b. Translucent Borosilicate Slender Barrel Body */}
      <rect
        x="72"
        y="14"
        width="16"
        height="138"
        fill="url(#glass-body-fill)"
      />

      {/* 3. Contents Body (Solids & Liquid Clipped inside slim capillary barrel) */}
      {(hasContents || (solids && solids.length > 0)) && (
        <g clipPath="url(#clip-burette)">
          {/* Solid mounds, crystals, metal chunks */}
          {solids && solids.length > 0 && (
            <GlasswarePhases
              solids={solids}
              cx={80}
              floorY={150}
              baseWidth={15}
              isSubmerged={hasLiquid && fillPercent > 0}
              containerId={containerId}
            />
          )}

          {/* Liquid Body */}
          {hasLiquid && fillPercent > 0 && (
            <>
              <rect
                x="70"
                y={liquidY}
                width="20"
                height={liquidHeight + 10}
                fill={`url(#${gradId})`}
                className="glass-liquid-rect"
              />

              <ellipse
                cx="80"
                cy={liquidY}
                rx="8"
                ry="2"
                fill="url(#meniscus-surface-grad)"
                className="beaker-meniscus-surface"
              />

              <path
                d={`M 72 ${liquidY} Q 80 ${liquidY + 2} 88 ${liquidY}`}
                stroke="url(#meniscus-glow)"
                strokeWidth="1.8"
                fill="none"
                opacity="0.95"
              />
            </>
          )}
        </g>
      )}

      {/* 4. High-Precision Black Ceramic Burette Scale (0 at top, capacity at bottom) */}
      <g className="glass-graduations" stroke="#0f172a" strokeWidth="0.9" opacity="0.88">
        {[24, 38, 52, 66, 80, 94, 108, 122, 136, 148].map((y, i) => (
          <React.Fragment key={y}>
            <line x1="82" y1={y} x2="88" y2={y} strokeWidth={i % 2 === 0 ? 1.5 : 0.9} />
            {i % 2 === 0 && (
              <text x="80" y={y + 2.5} fontSize="5.5" fontFamily="'Inter', system-ui, sans-serif" fontWeight="700" textAnchor="end" fill="#0f172a" stroke="none">
                {Math.round((i * capacity) / 10)}
              </text>
            )}
          </React.Fragment>
        ))}
      </g>

      {/* 5. Precision Slender Capillary Barrel Specular Edges (No cartoonish outlines) */}
      {/* Left edge contour */}
      <path
        d="M 68 12 L 72 16 L 72 152 L 76 160 L 76 178 L 80 194"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M 68 12 L 72 16 L 72 152 L 76 160 L 76 178 L 80 194 L 84 178 L 84 160 L 88 152 L 88 16 L 92 12"
        fill="none"
        stroke="rgba(71, 85, 105, 0.22)"
        strokeWidth="1.0"
        strokeLinecap="round"
      />
      {/* Right edge contour */}
      <path
        d="M 92 12 L 88 16 L 88 152 L 84 160 L 84 178 L 80 194"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.90"
      />

      {/* 6. Flared Top Funnel Beaded Rim */}
      <ellipse cx="80" cy="12" rx="14" ry="2.8" fill="none" stroke="#ffffff" strokeWidth="2.0" opacity="0.96" />
      <ellipse cx="80" cy="12" rx="15" ry="3.2" fill="none" stroke="rgba(255, 255, 255, 0.65)" strokeWidth="0.9" />

      {/* 7. 3D PTFE Stopcock Valve Assembly */}
      <rect x="66" y="160" width="28" height="6.5" rx="2" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
      <circle cx="80" cy="163.2" r="3.8" fill="#ffffff" stroke="#0369a1" strokeWidth="1" />
      <circle cx="80" cy="163.2" r="1.6" fill="#0284c7" />

      {/* 8. Studio Softbox Specular Glare Strip & Tip Highlight (3-Layered) */}
      <line x1="74" y1="16" x2="74" y2="148" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" opacity="0.20" />
      <line x1="74" y1="16" x2="74" y2="148" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.70" />
      <line x1="74" y1="16" x2="74" y2="148" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.98" />
      <line x1="86" y1="16" x2="86" y2="148" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />

      {/* Capillary Jet Tip Specular Glint */}
      <line x1="79.5" y1="182" x2="80.5" y2="193" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.96" />
    </g>
  );
}
