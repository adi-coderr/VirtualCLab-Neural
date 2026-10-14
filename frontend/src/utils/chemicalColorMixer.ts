import chemicalColorsData from "../data/chemicalColors.json";

export interface ColorInfo {
  color: string;
  formula?: string;
  name?: string;
  state?: string;
}

const colorDatabase = chemicalColorsData as Record<string, ColorInfo>;

const EXTRA_CHEMICAL_COLORS: Record<string, string> = {
  // Iconic coordination complexes & deep pigments
  "prussian blue": "#003153",
  "prussian-blue": "#003153",
  "fe4[fe(cn)6]3": "#003153",
  "fe4(fe(cn)6)3": "#003153",
  "fe4-fe-cn-6-3": "#003153",
  "kfe[fe(cn)6]": "#003153",
  "tetraamminecopper": "#0047AB",
  "[cu(nh3)4]2+": "#0047AB",
  "[cu(nh3)4](oh)2": "#0047AB",
  "[cu(nh3)4]so4": "#0047AB",
  "schweizer's reagent": "#0047AB",

  // Transition metal hydroxides & insoluble oxides
  "cu(oh)2": "#1E88E5",
  "fe(oh)3": "#8B4513",
  "fe(oh)2": "#2E5834",
  "ni(oh)2": "#98FB98",
  "co(oh)2": "#FF69B4",
  "mn(oh)2": "#F5F5DC",
  "cr(oh)3": "#4A704A",
  "al(oh)3": "#F5F5F0",
  "zn(oh)2": "#FFFFFF",
  "fe2o3": "#8B0000",
  "fe3o4": "#1C1C1C",
  "cu2o": "#B22222",
  "cuo": "#1C1C1C",
  "mno2": "#1C1C1C",
  "cro3": "#8B0000",
  "cr2o3": "#2E8B57",

  // Chromates & dichromates
  "pbcro4": "#FFA500",
  "ag2cro4": "#8B0000",
  "bacro4": "#FFFF00",
  "k2cro4": "#FFD700",
  "k2cr2o7": "#FF4500",
  "na2cr2o7": "#FF4500",
  "na2cro4": "#FFD700",
  "cro4": "#FFD700",
  "cr2o7": "#FF4500",

  // Halides, sulfates, carbonates & classic precipitates
  "pbi2": "#F7D046",
  "agcl": "#F5F5F0",
  "agbr": "#FAFAD2",
  "agi": "#FFF9A6",
  "ag3po4": "#FFD700",
  "ag2co3": "#E6D770",
  "baso4": "#FFFFFF",
  "caso4": "#FFFFFF",
  "caco3": "#FFFFFF",
  "mg(oh)2": "#FFFFFF",

  // Sulfides (insoluble dark & colored precipitates)
  "cus": "#0A0A0A",
  "fes": "#1C1C1C",
  "pbs": "#1C1C1C",
  "nis": "#1A1A1A",
  "cos": "#1A1A1A",
  "ag2s": "#1C1C1C",
  "cds": "#FFD700",
  "sns": "#5B3A29",
  "as2s3": "#FFD700",
  "sb2s3": "#FF4500",
  "bi2s3": "#4A3B32",
  "zns": "#FFFFFF",
  "mns": "#FA8072",

  // Soluble colored transition metal salts & ions
  "kmno4": "#6B21A8",
  "mno4": "#6B21A8",
  "cuso4": "#0284C7",
  "cucl2": "#009688",
  "cuno32": "#0288D1",
  "cu(no3)2": "#0288D1",
  "fecl3": "#C27803",
  "fecl2": "#86EFAC",
  "feso4": "#86EFAC",
  "fe2(so4)3": "#D97706",
  "niso4": "#10B981",
  "nicl2": "#10B981",
  "cocl2": "#EC4899",
  "coso4": "#F472B6",
  "crcl3": "#6B21A8",

  // Elemental halogens & nonmetals
  "i2": "#4B0082",
  "br2": "#D35400",
  "cl2": "#D4E157",
  "s8": "#FFFF33",
  "s": "#FFFF33",
  "p4": "#FFFFFF",

  // Indicators & special colored organics
  "phenolphthalein": "#FF1493",
  "methyl orange": "#E67E22",
  "bromothymol blue": "#2980B9",
  "litmus": "#800080",
};

// Normalized lookup map by id, formula, and commonName (case-insensitive)
const lookupMap = new Map<string, string>();
for (const [id, info] of Object.entries(colorDatabase)) {
  if (info.color) {
    lookupMap.set(id.toLowerCase(), info.color);
    if (info.formula) lookupMap.set(info.formula.toLowerCase(), info.color);
    if (info.name) lookupMap.set(info.name.toLowerCase(), info.color);
  }
}
for (const [key, color] of Object.entries(EXTRA_CHEMICAL_COLORS)) {
  lookupMap.set(key.toLowerCase(), color);
}

/**
 * Returns the realistic real-life hex color of a chemical by its id, formula, or common name.
 */
export function getChemicalColor(chemicalId?: string, formula?: string, commonName?: string): string | undefined {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\-_\[\]\(\)]/g, "");

  if (chemicalId) {
    const raw = chemicalId.toLowerCase();
    const byId = lookupMap.get(raw) || lookupMap.get(normalize(raw));
    if (byId) return byId;
  }
  if (formula) {
    const raw = formula.toLowerCase();
    const byFormula = lookupMap.get(raw) || lookupMap.get(normalize(raw));
    if (byFormula) return byFormula;
  }
  if (commonName) {
    const raw = commonName.toLowerCase();
    const byName = lookupMap.get(raw) || lookupMap.get(normalize(raw));
    if (byName) return byName;
  }
  return undefined;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB | null {
  const cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length === 3) {
    const rChar = cleaned.charAt(0);
    const gChar = cleaned.charAt(1);
    const bChar = cleaned.charAt(2);
    return {
      r: parseInt(rChar + rChar, 16),
      g: parseInt(gChar + gChar, 16),
      b: parseInt(bChar + bChar, 16),
    };
  }
  if (cleaned.length === 6) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  }
  return null;
}

function rgbToHex(rgb: RGB): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(rgb.r).toString(16).padStart(2, "0");
  const g = clamp(rgb.g).toString(16).padStart(2, "0");
  const b = clamp(rgb.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

/**
 * Calculates the realistic color of a mixture of chemicals in a laboratory vessel.
 * Accounts for:
 * 1. Dominant chromophores (transition metals: Cu, Fe, Cr, Mn, Co, Ni; halogens: Br2, I2)
 * 2. Precipitates and insoluble colored salts (e.g. PbI2 bright yellow, AgI pale yellow, CuS inky black)
 * 3. Volumetric & mass optical density weighting
 * 4. Realistic solvent tinting (water is crystal cyan-clear #CFE8F3)
 */
export function calculateMixtureColor(contents: Array<{
  chemicalId: string;
  formula?: string;
  commonName?: string;
  substanceColor?: string;
  amount: number;
  unit: string;
}>): string {
  if (!contents || contents.length === 0) {
    return "transparent";
  }

  // Resolve colors for all items
  const resolved = contents.map((c) => {
    const colorHex = c.substanceColor || getChemicalColor(c.chemicalId, c.formula, c.commonName) || "#F0F8FF";
    const rgb = hexToRgb(colorHex) || { r: 240, g: 248, b: 255 };

    // Amount weighting
    let amountWeight = c.amount;
    if (c.unit === "L") amountWeight = c.amount * 1000;
    else if (c.unit === "g") amountWeight = c.amount * 10;
    else if (c.unit === "mg") amountWeight = c.amount * 0.01;
    else if (c.unit === "mol") amountWeight = c.amount * 100;
    else if (c.unit === "mmol") amountWeight = c.amount * 0.1;
    amountWeight = Math.max(0.1, amountWeight);

    // Color strength / optical absorbance factor
    // Strongly colored substances (deep chromophores, metal salts, halogens, precipitates)
    // have high molar extinction coefficients and visually overpower clear solvents.
    const isWater = c.chemicalId.toLowerCase() === "water" || c.chemicalId.toLowerCase() === "h2o";
    const isPureWhite = colorHex.toLowerCase() === "#ffffff" || colorHex.toLowerCase() === "#fff";
    const isVeryLight = rgb.r > 240 && rgb.g > 240 && rgb.b > 240;

    let extinctionFactor = 1.0;
    if (isWater) {
      extinctionFactor = 0.05; // Water provides transparent volume but weak tint compared to colored solutes
    } else if (isPureWhite || isVeryLight) {
      extinctionFactor = 0.15; // Colorless/white dissolved salts have modest whitening/clouding effect
    } else {
      // Strongly colored chromophore: transition metals, halogens, dark pigments
      // Calculate color saturation distance from neutral white
      const deviation = Math.abs(rgb.r - rgb.g) + Math.abs(rgb.g - rgb.b) + Math.abs(rgb.b - rgb.r);
      const darkness = 765 - (rgb.r + rgb.g + rgb.b); // 0 (pure white) to 765 (pure black)
      extinctionFactor = 1.5 + (deviation / 255) * 3.0 + (darkness / 765) * 4.0;
    }

    return {
      colorHex,
      rgb,
      weight: amountWeight * extinctionFactor,
      isStrongColor: !isWater && !isPureWhite && !isVeryLight,
    };
  });

  // If there are colored species present alongside water, prioritize their optical color
  const coloredItems = resolved.filter((r) => r.isStrongColor);
  const itemsToMix = coloredItems.length > 0 ? coloredItems : resolved;

  let totalWeight = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  for (const item of itemsToMix) {
    totalWeight += item.weight;
    // Optical perceived mixing in quadratic space for photorealistic brightness
    rSum += item.rgb.r * item.rgb.r * item.weight;
    gSum += item.rgb.g * item.rgb.g * item.weight;
    bSum += item.rgb.b * item.rgb.b * item.weight;
  }

  if (totalWeight <= 0) return "#CFE8F3";

  return rgbToHex({
    r: Math.sqrt(rSum / totalWeight),
    g: Math.sqrt(gSum / totalWeight),
    b: Math.sqrt(bSum / totalWeight),
  });
}
