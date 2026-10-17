import type { ReactionResolution } from "../types/chemistry";

export type AfterEffectVisualType =
  | "salt_crust"
  | "purple_vapor"
  | "carbon_specks"
  | "solid_compound"
  | "acid_mist"
  | "brown_fumes"
  | "white_smoke"
  | "sulfur_deposit"
  | "oily_layer"
  | "crystal_mesh"
  | "polymer_film"
  | "o2_bubbles"
  | "generic";

export type ReactionVisualEffect =
  | "flame_smoke"
  | "purple_eruption"
  | "brown_fumes_effervescence"
  | "white_smoke_cloud"
  | "incandescent_glow"
  | "colloidal_precipitate"
  | "nylon_rope_pull"
  | "crystal_growth"
  | "decolorization_oily"
  | "effervescent_stream"
  | "acid_flash_color"
  | "droplet_condensation"
  | "generic";

export interface AfterEffectVisual {
  type: AfterEffectVisualType;
  effect: ReactionVisualEffect;
  title: string;
  description: string;
  badge: string;
  tintColor: string;
  flameColor?: string;
  fumeColor?: string;
  hasSparks?: boolean;
  hasViolentBubbles?: boolean;
  hasNylonRope?: boolean;
  hasCrystalMesh?: boolean;
  hasOilyLayer?: boolean;
  hasGlowingCore?: boolean;
  hasSulfurPrecipitate?: boolean;
  hasOxygenMicrobubbles?: boolean;
  hasWallBeads?: boolean;
  hasAtmosphericClouds?: boolean;
}

/**
 * Analyzes the reaction resolution (outcome, after-effects, observableEffects, chemicals)
 * and generates the full physical in-beaker visual simulation parameters.
 */
export function getAfterEffectVisual(resolution: ReactionResolution): AfterEffectVisual | null {
  const text = [
    resolution.outcome || "",
    resolution.specialConditions?.outcome || "",
    resolution.afterEffect || "",
    resolution.specialConditions?.afterEffect || "",
    resolution.balancedEquation || "",
    (resolution as any).reactionId || (resolution as any).id || "",
    ...(resolution.reactants || []).map((r) => `${r.chemicalId} ${r.formula} ${r.commonName}`),
    ...(resolution.products || []).map((p) => `${p.chemicalId} ${p.formula} ${p.commonName}`),
  ]
    .join(" ")
    .toLowerCase();

  if (!text.trim() && !resolution.conditionsDescription) {
    return null;
  }

  // 1. Nylon-6,6 interfacial trick (Reaction 18)
  if (text.includes("nylon") || text.includes("adipoyl") || text.includes("c12h22n2o2")) {
    return {
      type: "polymer_film",
      effect: "nylon_rope_pull",
      title: "Interfacial Nylon-6,6 Rope Pull",
      description: "White elastic polymer film at interface with continuous ascending pulled thread.",
      badge: "Nylon Polymer Rope",
      tintColor: "#f8fafc",
      hasNylonRope: true,
    };
  }

  // 2. Sodium + chlorine (Reaction 1)
  if ((text.includes("na") && text.includes("cl2")) || (text.includes("sodium") && text.includes("chlorine")) || text.includes("coats the vessel")) {
    return {
      type: "salt_crust",
      effect: "flame_smoke",
      title: "Brilliant Gold Flame & Billowing Smoke",
      description: "Sodium burns with intense yellow-gold flame and dense white smoke, forming salt crust.",
      badge: "Flame & Salt Crust",
      tintColor: "#f59e0b",
      flameColor: "#f59e0b",
      fumeColor: "#ffffff",
      hasSparks: true,
      hasGlowingCore: true,
      hasAtmosphericClouds: true,
    };
  }

  // 3. Magnesium + CO2 (Reaction 3)
  if ((text.includes("mg") && text.includes("co2")) || text.includes("carbon specks") || text.includes("magnesium")) {
    return {
      type: "carbon_specks",
      effect: "flame_smoke",
      title: "Blinding White Flare & Crackling Sparks",
      description: "Magnesium burns furiously inside CO2 with brilliant white light and black carbon soot.",
      badge: "Blinding Flare",
      tintColor: "#ffffff",
      flameColor: "#ffffff",
      fumeColor: "#94a3b8",
      hasSparks: true,
      hasGlowingCore: true,
      hasAtmosphericClouds: true,
    };
  }

  // 4. Aluminium + iodine (Reaction 2)
  if ((text.includes("al") && text.includes("i2")) || text.includes("purple vapour") || text.includes("purple iodine") || text.includes("sublimes")) {
    return {
      type: "purple_vapor",
      effect: "purple_eruption",
      title: "Dense Violet Iodine Vapor Eruption",
      description: "White-hot thermal incandescence followed by towering billowing clouds of deep violet vapor.",
      badge: "Purple Eruption",
      tintColor: "#a855f7",
      fumeColor: "#a855f7",
      hasGlowingCore: true,
      hasAtmosphericClouds: true,
    };
  }

  // 5. Copper + concentrated nitric acid (Reaction 6)
  if ((text.includes("cu") && text.includes("hno3")) || text.includes("brown no2") || text.includes("brown fumes")) {
    return {
      type: "brown_fumes",
      effect: "brown_fumes_effervescence",
      title: "Violent Boiling Effervescence & NO₂ Fumes",
      description: "Violent vigorous bubbling, emerald solution shift, and dense choking reddish-brown NO2 gas.",
      badge: "Reddish-Brown NO₂",
      tintColor: "#b45309",
      fumeColor: "#b45309",
      hasViolentBubbles: true,
      hasAtmosphericClouds: true,
    };
  }

  // 6. Ammonia + HCl magic smoke (Reaction 7)
  if ((text.includes("nh3") && text.includes("hcl")) || text.includes("nh4cl") || text.includes("white smoke")) {
    return {
      type: "white_smoke",
      effect: "white_smoke_cloud",
      title: "Spontaneous Billowing White Smoke Cloud",
      description: "Thick, opaque billowing white ammonium chloride smoke spontaneously filling the vessel.",
      badge: "White Smoke Cloud",
      tintColor: "#f1f5f9",
      fumeColor: "#ffffff",
      hasAtmosphericClouds: true,
    };
  }

  // 7. Iron + sulfur (Reaction 4)
  if ((text.includes("fe") && text.includes("s")) || text.includes("fes") || text.includes("red glow")) {
    return {
      type: "solid_compound",
      effect: "incandescent_glow",
      title: "Autonomous Red-Hot Incandescent Wave",
      description: "Cherry-red incandescent thermal front traveling autonomously through powder into fused FeS.",
      badge: "Incandescent Glow",
      tintColor: "#ef4444",
      flameColor: "#ef4444",
      hasGlowingCore: true,
    };
  }

  // 8. Claus reaction / Sulfur precipitation (Reaction 8)
  if (text.includes("claus") || text.includes("h2s") || text.includes("so2") || text.includes("colloidal sulfur") || text.includes("turbid")) {
    return {
      type: "sulfur_deposit",
      effect: "colloidal_precipitate",
      title: "Canary-Yellow Colloidal Sulfur Cloud",
      description: "Rapid milky yellow turbidity precipitating into a vivid canary-yellow sulfur bed.",
      badge: "Yellow Precipitate",
      tintColor: "#facc15",
      hasSulfurPrecipitate: true,
    };
  }

  // 9. Hydrogen + iodine equilibrium (Reaction 9)
  if (text.includes("h2(g) + i2(g)") || (text.includes("equilibrium") && text.includes("iodine"))) {
    return {
      type: "purple_vapor",
      effect: "purple_eruption",
      title: "Dynamic Violet Gas Equilibrium",
      description: "Ethereal steady-state purple vapor indicating reversible gas equilibrium.",
      badge: "Equilibrium Vapor",
      tintColor: "#c084fc",
      fumeColor: "#c084fc",
      hasAtmosphericClouds: true,
    };
  }

  // 10. Ethene + bromine & Acetone + iodine (Reaction 11 & 10)
  if (text.includes("c2h4") || text.includes("bromine water") || text.includes("decoloriz") || text.includes("dibromoethane") || text.includes("acetone")) {
    return {
      type: "oily_layer",
      effect: "decolorization_oily",
      title: "Rapid Decolorization & Oily Phase Lens",
      description: "Red-brown color bleaches clear, leaving dense immiscible 1,2-dibromoethane oily lens.",
      badge: "Decolorization & Oil",
      tintColor: "#fef08a",
      hasOilyLayer: true,
    };
  }

  // 11. Aspirin crystallization (Reaction 17)
  if (text.includes("aspirin") || text.includes("c9h8o4") || text.includes("needle") || text.includes("crystals")) {
    return {
      type: "crystal_mesh",
      effect: "crystal_growth",
      title: "Needle Crystal Forest Nucleation",
      description: "Rapidly branching white needle crystals nucleating and expanding across the floor.",
      badge: "Needle Crystals",
      tintColor: "#f8fafc",
      hasCrystalMesh: true,
    };
  }

  // 12. Photosynthesis (Reaction 19)
  if (text.includes("photosynthesis") || text.includes("glucose") || (text.includes("co2") && text.includes("o2"))) {
    return {
      type: "o2_bubbles",
      effect: "effervescent_stream",
      title: "Steady Effervescent O₂ Micro-Bubble Streams",
      description: "Dense streams of pure glistening oxygen micro-bubbles rising and clinging to glass walls.",
      badge: "Oxygen Streams",
      tintColor: "#38bdf8",
      hasOxygenMicrobubbles: true,
    };
  }

  // 13. Acid rain / Sulfur + O2 + H2O (Reaction 20)
  if ((text.includes("s(s)") && text.includes("o2") && text.includes("h2o")) || text.includes("acid rain") || text.includes("h2so3")) {
    return {
      type: "acid_mist",
      effect: "acid_flash_color",
      title: "Fiery Red Acid Flash & SO₂ Fumes",
      description: "Solution flashes to vivid acid red with pale blue flame flicker and mist droplets.",
      badge: "Acidic Flash",
      tintColor: "#ef4444",
      flameColor: "#60a5fa",
      fumeColor: "#fde047",
      hasAtmosphericClouds: true,
      hasWallBeads: true,
    };
  }

  // 14. Ostwald process (Reaction 15)
  if (text.includes("ostwald") || (text.includes("ammonia") && text.includes("o2") && text.includes("no"))) {
    return {
      type: "brown_fumes",
      effect: "brown_fumes_effervescence",
      title: "Red-Hot Catalyst Glow & NO₂ Gas Billows",
      description: "Pt gauze glowing red-hot with colorless NO gas turning into dense brown NO2 at mouth.",
      badge: "Red-Hot Glow & NO₂",
      tintColor: "#d97706",
      fumeColor: "#b45309",
      hasGlowingCore: true,
      hasAtmosphericClouds: true,
    };
  }

  // 15. Fischer esterification (Reaction 16)
  if (text.includes("esterification") || text.includes("ethyl acetate") || text.includes("ch3cooc2h5")) {
    return {
      type: "oily_layer",
      effect: "decolorization_oily",
      title: "Biphasic Upper Ester Meniscus",
      description: "Refluxing liquid separates into an aqueous base and floating shimmering organic ester layer.",
      badge: "Shimmering Ester Layer",
      tintColor: "#e0f2fe",
      hasOilyLayer: true,
    };
  }

  // 16. Wall droplets & condensation (Reactions 5, 12, 13, 14)
  if (text.includes("condensation") || text.includes("misty") || text.includes("haber") || text.includes("reforming") || text.includes("chloromethane")) {
    return {
      type: "acid_mist",
      effect: "droplet_condensation",
      title: "Condensation Trickles & Wall Droplets",
      description: "Moisture beads and liquid micro-condensate trickling down the cooled glass walls.",
      badge: "Wall Droplets",
      tintColor: "#e0f2fe",
      hasWallBeads: true,
    };
  }

  // Generic fallback if reaction has observableEffects or gas/precipitation
  const hasGas = resolution.observableEffects?.some((e) => e.type === "gas_evolution");
  const hasPrecip = resolution.observableEffects?.some((e) => e.type === "precipitation");

  if (hasGas) {
    return {
      type: "generic",
      effect: "effervescent_stream",
      title: "Active Effervescence & Bubbling",
      description: "Vigorous gas bubbling rising continuously through the fluid.",
      badge: "Active Bubbling",
      tintColor: "#38bdf8",
      hasViolentBubbles: true,
    };
  }

  if (hasPrecip) {
    return {
      type: "generic",
      effect: "colloidal_precipitate",
      title: "Solid Precipitate Settling",
      description: "Insoluble particulate precipitate accumulating at the vessel floor.",
      badge: "Precipitate Settling",
      tintColor: "#f8fafc",
    };
  }

  return null;
}
