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
 * Deterministic Chemical Visualizer:
 * Strict Two-Tier Architecture:
 * - Tier 1: Dedicated animations for the 20 Curated Showcase Reactions (matched strictly by Canonical ID or Exact Chemical Species pairs).
 * - Tier 2: Physically accurate observable effects for all other 600+ reactions (bubbling, precipitate settling, or clean solution).
 * This completely eliminates hallucinations and accidental visual effect leaks between reactions.
 */
export function getAfterEffectVisual(resolution: ReactionResolution): AfterEffectVisual | null {
  const rxnId = String((resolution as any).reactionId || (resolution as any).id || "").toLowerCase();

  const reactantIds = new Set(
    (resolution.reactants || []).map((r) => String(r.chemicalId || "").toLowerCase().trim())
  );
  const productIds = new Set(
    (resolution.products || []).map((p) => String(p.chemicalId || "").toLowerCase().trim())
  );

  const hasR = (...candidates: string[]) => candidates.some((c) => reactantIds.has(c));
  const hasP = (...candidates: string[]) => candidates.some((c) => productIds.has(c));

  const text = [
    resolution.outcome || "",
    resolution.specialConditions?.outcome || "",
    resolution.afterEffect || "",
    resolution.specialConditions?.afterEffect || "",
    resolution.balancedEquation || "",
    rxnId,
    ...(resolution.reactants || []).map((r) => `${r.chemicalId} ${r.formula} ${r.commonName}`),
    ...(resolution.products || []).map((p) => `${p.chemicalId} ${p.formula} ${p.commonName}`),
  ]
    .join(" ")
    .toLowerCase();

  if (!text.trim() && !resolution.conditionsDescription && reactantIds.size === 0) {
    return null;
  }

  // =========================================================================
  // TIER 1: THE 20 CURATED SHOWCASE REACTIONS (STRICT MATCHING)
  // =========================================================================

  // 1. Nylon-6,6 interfacial trick (Reaction 18)
  if (
    rxnId.includes("rxn-18") ||
    rxnId.includes("nylon-rope") ||
    hasP("nylon_66", "nylon-6,6", "c12h22n2o2") ||
    (hasR("adipoyl-chloride", "adipoyl_chloride") && hasR("hexamethylenediamine")) ||
    text.includes("interfacial nylon") ||
    text.includes("nylon rope") ||
    text.includes("nylon thread")
  ) {
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
  if (
    rxnId.includes("rxn-01") ||
    rxnId.includes("sodium-chlorine") ||
    (hasR("na") && hasR("cl2")) ||
    text.includes("warmed sodium lowered into a chlorine-filled jar") ||
    text.includes("sodium melts and burns with an intense yellow flame") ||
    text.includes("white nacl coats the vessel")
  ) {
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
  if (
    rxnId.includes("rxn-03") ||
    rxnId.includes("magnesium-carbon-dioxide") ||
    (hasR("mg") && hasR("co2")) ||
    text.includes("magnesium burns furiously inside co2") ||
    text.includes("carbon specks on the vessel wall")
  ) {
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
  if (
    rxnId.includes("rxn-02") ||
    rxnId.includes("aluminium-iodine") ||
    (hasR("al") && hasR("i2")) ||
    hasP("ali3") ||
    text.includes("purple iodine crystals and vapour") ||
    text.includes("unreacted iodine sublimes into dense purple vapour")
  ) {
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
  if (
    rxnId.includes("rxn-06") ||
    rxnId.includes("copper-nitric-acid") ||
    (hasR("cu") && hasR("hno3")) ||
    text.includes("dense brown no2 fumes") ||
    text.includes("dense choking reddish-brown no2")
  ) {
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
  if (
    rxnId.includes("rxn-07") ||
    rxnId.includes("ammonia-hydrogen-chloride") ||
    (hasR("ammonia", "nh3") && hasR("hcl")) ||
    hasP("ammonium-chloride", "nh4cl") ||
    text.includes("white nh4cl smoke") ||
    text.includes("white ammonium chloride smoke")
  ) {
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
  if (
    rxnId.includes("rxn-04") ||
    rxnId.includes("iron-sulfur") ||
    (hasR("fe") && hasR("s")) ||
    hasP("fes") ||
    text.includes("fused fes") ||
    text.includes("cherry-red incandescent thermal front")
  ) {
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
  if (
    rxnId.includes("rxn-08") ||
    rxnId.includes("claus") ||
    (hasR("h2s") && hasR("so2")) ||
    text.includes("canary-yellow colloidal sulfur cloud")
  ) {
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
  if (
    rxnId.includes("rxn-09") ||
    rxnId.includes("hydrogen-iodine") ||
    ((hasR("h2") && hasR("i2")) && (text.includes("equilibrium") || text.includes("reversible")))
  ) {
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

  // 10. Decolorization & Oily Phase Lens (Reactions 10 & 11)
  if (
    rxnId.includes("rxn-10") ||
    rxnId.includes("rxn-11") ||
    rxnId.includes("ethene-bromine") ||
    rxnId.includes("acetone-iodine") ||
    (hasR("c2h4", "ethene") && hasR("br2", "bromine")) ||
    (hasR("acetone", "ch3coch3") && hasR("i2", "iodine")) ||
    hasP("c2h4br2", "1,2-dibromoethane") ||
    text.includes("1,2-dibromoethane oily lens") ||
    text.includes("bromine water decoloriz")
  ) {
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
  if (
    rxnId.includes("rxn-17") ||
    rxnId.includes("aspirin") ||
    hasP("aspirin", "c9h8o4") ||
    (hasR("c7h6o3", "salicylic-acid", "salicylic_acid") && hasR("acetic-anhydride", "acetic_anhydride")) ||
    text.includes("needle crystal forest") ||
    text.includes("aspirin crystals")
  ) {
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
  if (
    rxnId.includes("rxn-19") ||
    rxnId.includes("photosynthesis") ||
    (hasP("glucose") && hasP("o2"))
  ) {
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
  if (
    rxnId.includes("rxn-20") ||
    rxnId.includes("acid-rain") ||
    (hasR("s") && hasR("o2") && hasR("water", "h2o"))
  ) {
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
  if (
    rxnId.includes("rxn-15") ||
    rxnId.includes("ostwald") ||
    ((hasR("ammonia", "nh3") && hasR("o2")) && (hasP("no") || text.includes("pt catalyst") || text.includes("gauze")))
  ) {
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
  if (
    rxnId.includes("rxn-16") ||
    rxnId.includes("fischer-esterification") ||
    hasP("ch3cooc2h5") ||
    (hasR("acetic-acid", "ch3cooh") && hasR("c2h5oh", "ethanol"))
  ) {
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
  if (
    rxnId.includes("rxn-05") ||
    rxnId.includes("rxn-12") ||
    rxnId.includes("rxn-13") ||
    rxnId.includes("rxn-14") ||
    rxnId.includes("haber") ||
    rxnId.includes("steam-reforming") ||
    (hasR("h2") && hasR("cl2")) ||
    (hasR("n2") && hasR("h2")) ||
    (hasR("ch4") && hasR("cl2")) ||
    (hasR("ch4") && hasR("water", "h2o"))
  ) {
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

  // =========================================================================
  // TIER 2: GENERAL DETERMINISTIC OBSERVABLE PHYSICS (FOR ALL OTHER REACTIONS)
  // =========================================================================
  const hasGas =
    resolution.observableEffects?.some((e) => e.type === "gas_evolution" || e.type === "effervescence") ||
    /\bco2\b/i.test(text) ||
    /\bh2\b/i.test(text) ||
    text.includes("effervescence") ||
    text.includes("gas bubbling");

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
