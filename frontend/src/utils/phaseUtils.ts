import type { ContainerContent, EquipmentType } from "../types/experiment";
import type { PhysicalForm, PhysicalState } from "../types/chemistry";
import { getChemicalColor } from "./chemicalColorMixer";

export interface DerivePhysicalFormInput {
  physicalState?: PhysicalState;
  formula?: string;
  commonName?: string;
  chemicalClass?: string;
}

export function derivePhysicalForm(
  inputOrState?: PhysicalState | DerivePhysicalFormInput,
  formula?: string,
  commonName?: string,
  chemicalClass?: string
): PhysicalForm {
  let physicalState: PhysicalState | undefined;
  let f = formula || "";
  let normName = (commonName || "").toLowerCase();
  let cls = (chemicalClass || "").toLowerCase();

  if (typeof inputOrState === "object" && inputOrState !== null) {
    physicalState = inputOrState.physicalState;
    f = inputOrState.formula || "";
    normName = (inputOrState.commonName || "").toLowerCase();
    cls = (inputOrState.chemicalClass || "").toLowerCase();
  } else {
    physicalState = inputOrState;
  }

  if (physicalState === "gas" || /^(CO2|NH3|Cl2|O2|H2|N2|CH4|SO2|NO2|H2S)$/i.test(f)) {
    return "gas";
  }
  if (
    physicalState === "liquid" ||
    physicalState === "aqueous" ||
    cls === "solvent" ||
    /^(H2O|C2H5OH|CH3OH|HCl|H2SO4|HNO3|CH3COOH|H3PO4)$/i.test(f)
  ) {
    return "liquid";
  }

  // 1. Elemental metals and physical strips/turnings/granules
  const isMetalElem =
    cls === "metal" || /^(fe|zn|cu|mg|al|na|k|ca|ag|au|pt|pb|sn|ni|co|li|ba|sr)$/i.test(f);
  if (
    isMetalElem ||
    normName.includes("ribbon") ||
    normName.includes("strip") ||
    normName.includes("filings") ||
    normName.includes("wire") ||
    normName.includes("foil") ||
    normName.includes("turnings") ||
    normName.includes("granule") ||
    normName.includes("pellet") ||
    normName.includes("chunk") ||
    normName.includes("sheet") ||
    normName.includes("mossy")
  ) {
    return "solid";
  }

  // 2. Crystals: hydrates, crystalline ionic salts, vitriols, nitrates, sulfates, sugars
  if (
    f.includes("·") ||
    f.includes(".H2O") ||
    cls === "salt" ||
    normName.includes("hydrate") ||
    normName.includes("vitriol") ||
    normName.includes("crystal") ||
    normName.includes("alum") ||
    normName.includes("sucrose") ||
    normName.includes("glucose") ||
    normName.includes("permanganate") ||
    normName.includes("dichromate") ||
    normName.includes("chromate") ||
    normName.includes("sulfate") ||
    normName.includes("chloride") ||
    normName.includes("nitrate") ||
    normName.includes("iodide") ||
    normName.includes("bromide") ||
    normName.includes("phosphate")
  ) {
    return "crystal";
  }

  // 3. Powders: oxides, carbonates, hydroxides, amorphous organics, powders, sulfur, precipitates
  if (
    normName.includes("powder") ||
    normName.includes("dust") ||
    normName.includes("oxide") ||
    normName.includes("carbonate") ||
    normName.includes("bicarbonate") ||
    normName.includes("sulfur") ||
    normName.includes("hydroxide") ||
    normName.includes("carbon") ||
    normName.includes("charcoal") ||
    normName.includes("starch") ||
    normName.includes("talc") ||
    normName.includes("chalk") ||
    cls === "oxide" ||
    cls === "carbonate" ||
    cls === "base"
  ) {
    return "powder";
  }

  // Default solid form: crystalline salts if salt, otherwise powder
  return "powder";
}

export function getPhaseIcon(form?: PhysicalForm): string {
  switch (form) {
    case "crystal":
      return "💎";
    case "powder":
      return "🧂";
    case "solid":
      return "🪙";
    case "gas":
      return "💨";
    case "liquid":
    default:
      return "💧";
  }
}

export function getPhaseLabel(form?: PhysicalForm): string {
  switch (form) {
    case "crystal":
      return "Crystalline";
    case "powder":
      return "Fine Powder";
    case "solid":
      return "Metal / Solid";
    case "gas":
      return "Gas";
    case "liquid":
    default:
      return "Liquid Solution";
  }
}

export interface VesselSolid {
  chemicalId: string;
  name: string;
  form: "powder" | "crystal" | "solid";
  color: string;
  amountG: number;
  heightPx: number; // Rendered height in px
  opacity: number;
  isSubmerged: boolean;
}

export interface VesselPhaseState {
  hasLiquid: boolean;
  liquidFillPercent: number;
  liquidHeightPx: number;
  liquidColor: string;
  solids: VesselSolid[];
  isPureSolid: boolean;
}

export function analyzeVesselPhases(
  contents: ContainerContent[],
  equipmentType: EquipmentType,
  fallbackColor: string
): VesselPhaseState {
  if (!contents || contents.length === 0) {
    return {
      hasLiquid: false,
      liquidFillPercent: 0,
      liquidHeightPx: 0,
      liquidColor: fallbackColor,
      solids: [],
      isPureSolid: false,
    };
  }

  const capacityMap: Record<string, number> = {
    beaker: 250,
    test_tube: 20,
    erlenmeyer_flask: 250,
    graduated_cylinder: 100,
    burette: 50,
  };
  const capacity = capacityMap[equipmentType] ?? 250;

  // Split into liquid vs solid
  let liquidMl = 0;
  const solidItems: ContainerContent[] = [];

  for (const item of contents) {
    const form = item.physicalForm || derivePhysicalForm(item.physicalState, item.formula, item.commonName);
    const isLiquid =
      form === "liquid" ||
      item.unit === "mL" ||
      item.unit === "L" ||
      item.physicalState === "liquid" ||
      item.physicalState === "aqueous";

    if (isLiquid) {
      const ml = item.unit === "L" ? item.amount * 1000 : item.unit === "mL" ? item.amount : 25;
      liquidMl += ml;
    } else {
      solidItems.push(item);
    }
  }

  const hasLiquid = liquidMl > 0;
  const liquidFillPercent = hasLiquid
    ? Math.min(88, Math.max(14, (liquidMl / capacity) * 75 + 10))
    : 0;

  // Height span inside vessel (approx 144px max height in beaker/erlenmeyer)
  const maxSpanPx = equipmentType === "test_tube" ? 134 : 144;
  const liquidHeightPx = (maxSpanPx * liquidFillPercent) / 100;

  // Map solid items to VesselSolid representations
  const solids: VesselSolid[] = solidItems.map((item) => {
    const form = item.physicalForm || derivePhysicalForm(item.physicalState, item.formula, item.commonName);
    const solidForm: "powder" | "crystal" | "solid" =
      form === "crystal" ? "crystal" : form === "solid" ? "solid" : "powder";

    const amountG =
      item.unit === "g"
        ? item.amount
        : item.unit === "kg"
        ? item.amount * 1000
        : item.unit === "mg"
        ? item.amount / 1000
        : 5;

    // Scale heap height between 10px (small 1-2g scoop) up to 40px (heavy 50g+ pile)
    const heightPx = Math.min(38, Math.max(12, Math.sqrt(amountG) * 5 + 6));
    const rawColor = item.substanceColor || getChemicalColor(item.chemicalId, item.formula, item.commonName);
    const color = rawColor && rawColor.toLowerCase() !== "#ffffff" ? rawColor : "#e2e8f0";

    return {
      chemicalId: item.chemicalId,
      name: item.commonName,
      form: solidForm,
      color,
      amountG,
      heightPx,
      opacity: 0.95,
      isSubmerged: hasLiquid,
    };
  });

  return {
    hasLiquid,
    liquidFillPercent,
    liquidHeightPx,
    liquidColor: fallbackColor,
    solids,
    isPureSolid: !hasLiquid && solids.length > 0,
  };
}
