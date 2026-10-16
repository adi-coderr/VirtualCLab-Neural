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

export function getPhaseIcon(_form?: PhysicalForm): string {
  return "";
}

export function getPhaseLabel(form?: PhysicalForm): string {
  switch (form) {
    case "crystal":
      return "Crystal";
    case "powder":
      return "Powder";
    case "solid":
      return "Solid";
    case "gas":
      return "Gas";
    case "liquid":
    default:
      return "Liquid";
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
  capacity: number;
  liquidVolumeMl: number;
  totalVolumeMl: number;
}

export function getAdaptiveCapacity(
  equipmentType: EquipmentType,
  contents: ContainerContent[]
): {
  capacity: number;
  liquidVolumeMl: number;
  solidVolumeMl: number;
  totalVolumeMl: number;
} {
  let liquidVolumeMl = 0;
  let solidVolumeMl = 0;

  for (const item of contents) {
    const form = item.physicalForm || derivePhysicalForm(item.physicalState, item.formula, item.commonName);
    const isLiquid =
      form === "liquid" ||
      item.unit === "mL" ||
      item.unit === "L" ||
      item.physicalState === "liquid" ||
      item.physicalState === "aqueous";

    if (isLiquid) {
      const ml = item.unit === "L" ? item.amount * 1000 : item.unit === "mL" ? item.amount : item.amount || 25;
      liquidVolumeMl += ml;
    } else {
      const g =
        item.unit === "kg"
          ? item.amount * 1000
          : item.unit === "g"
          ? item.amount
          : item.unit === "mg"
          ? item.amount / 1000
          : item.amount || 5;
      solidVolumeMl += g;
    }
  }

  const totalVolumeMl = liquidVolumeMl + solidVolumeMl;

  let capacity = 100;
  if (equipmentType === "beaker") {
    if (totalVolumeMl <= 100) capacity = 100;
    else if (totalVolumeMl <= 250) capacity = 250;
    else if (totalVolumeMl <= 500) capacity = 500;
    else if (totalVolumeMl <= 1000) capacity = 1000;
    else if (totalVolumeMl <= 2000) capacity = 2000;
    else if (totalVolumeMl <= 5000) capacity = 5000;
    else capacity = Math.ceil(totalVolumeMl / 1000) * 1000;
  } else if (equipmentType === "erlenmeyer_flask") {
    if (totalVolumeMl <= 100) capacity = 100;
    else if (totalVolumeMl <= 250) capacity = 250;
    else if (totalVolumeMl <= 500) capacity = 500;
    else if (totalVolumeMl <= 1000) capacity = 1000;
    else if (totalVolumeMl <= 2000) capacity = 2000;
    else capacity = Math.ceil(totalVolumeMl / 500) * 500;
  } else if (equipmentType === "graduated_cylinder") {
    if (totalVolumeMl <= 25) capacity = 25;
    else if (totalVolumeMl <= 50) capacity = 50;
    else if (totalVolumeMl <= 100) capacity = 100;
    else if (totalVolumeMl <= 250) capacity = 250;
    else if (totalVolumeMl <= 500) capacity = 500;
    else if (totalVolumeMl <= 1000) capacity = 1000;
    else capacity = Math.ceil(totalVolumeMl / 250) * 250;
  } else if (equipmentType === "test_tube") {
    if (totalVolumeMl <= 20) capacity = 20;
    else if (totalVolumeMl <= 50) capacity = 50;
    else capacity = Math.ceil(totalVolumeMl / 25) * 25;
  } else if (equipmentType === "burette") {
    capacity = totalVolumeMl <= 50 ? 50 : 100;
  } else {
    capacity = totalVolumeMl <= 100 ? 100 : totalVolumeMl <= 250 ? 250 : totalVolumeMl <= 500 ? 500 : 1000;
  }

  return { capacity, liquidVolumeMl, solidVolumeMl, totalVolumeMl };
}

export function analyzeVesselPhases(
  contents: ContainerContent[],
  equipmentType: EquipmentType,
  fallbackColor: string
): VesselPhaseState {
  const { capacity, liquidVolumeMl, solidVolumeMl, totalVolumeMl } = getAdaptiveCapacity(
    equipmentType,
    contents || []
  );

  if (!contents || contents.length === 0) {
    return {
      hasLiquid: false,
      liquidFillPercent: 0,
      liquidHeightPx: 0,
      liquidColor: fallbackColor,
      solids: [],
      isPureSolid: false,
      capacity,
      liquidVolumeMl: 0,
      totalVolumeMl: 0,
    };
  }

  // Split into liquid vs solid
  const solidItems: ContainerContent[] = [];

  for (const item of contents) {
    const form = item.physicalForm || derivePhysicalForm(item.physicalState, item.formula, item.commonName);
    const isLiquid =
      form === "liquid" ||
      item.unit === "mL" ||
      item.unit === "L" ||
      item.physicalState === "liquid" ||
      item.physicalState === "aqueous";

    if (!isLiquid) {
      solidItems.push(item);
    }
  }

  const hasLiquid = liquidVolumeMl > 0;
  const liquidFillPercent = hasLiquid
    ? Math.min(100, Math.max(8, (liquidVolumeMl / capacity) * 100))
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
    capacity,
    liquidVolumeMl,
    totalVolumeMl,
  };
}
