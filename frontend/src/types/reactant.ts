export interface PropertyProvenance {
  status: "value" | "not_applicable" | "unknown" | "predicted" | string;
  source: string;
  confidence: number;
  rawValue?: string | null;
}

export interface IsotopeRecord {
  massNumber: number;
  isotopicMassU: number;
  abundancePercent: number;
  halfLife: string;
}

export interface UnifiedReactantDTO {
  id: string;
  canonicalName: string;
  iupacName: string | null;
  formula: string;
  casNumber: string | null;
  smiles: string | null;
  categoryTags: string[];
  bondingType: string;
  atomicNumber: number | null;
  molarMass: {
    gMol: number;
    kgMol: number;
    provenance: PropertyProvenance;
  };
  physicalState: string;
  temperatures: {
    meltingPointK: number | null;
    meltingPointC: number | null;
    boilingPointK: number | null;
    boilingPointC: number | null;
    provenance: Record<string, PropertyProvenance>;
  };
  density: {
    kgM3: number | null;
    gCm3: number | null;
    provenance: PropertyProvenance;
  };
  appearance: {
    color: string;
    odor: string;
  };
  solubility: {
    category: string;
    gPer100gWater: number | null;
  };
  electronic: {
    valenceElectrons: number | null;
    commonOxidationStates: number[];
    electronegativityPauling: number | null;
    ionizationEnergyJouleMol: number | null;
    atomicRadiusPm: number | null;
  };
  categoryProperties: {
    metals?: {
      malleability: string | null;
      ductility: string | null;
      luster: string | null;
      oxideBehavior: string | null;
      electronTendency: string | null;
    };
    nonmetals?: {
      brittleness: string | null;
      electronTendency: string | null;
    };
    nobleGases?: {
      chemicallyInert: boolean;
    };
  };
  characterization: {
    isAmphoteric: boolean;
    magneticBehavior: string;
    isRadioactive: boolean;
    isFlammable: boolean;
    redoxCharacter: string;
    acidBaseClass: string;
    pKa: number | null;
    pKb: number | null;
  };
  reactivity: {
    reactsWithWater: boolean;
    waterNotes: string | null;
    reactsWithAcid: boolean;
    acidNotes: string | null;
    reactsWithBase: boolean;
    baseNotes: string | null;
    reactsWithOxygen: boolean;
    oxygenNotes: string | null;
    flameTestColor: string | null;
    ghsHazardCodes: string[];
    handlingPrecautions: string;
    ppeRequirements: string;
  };
  isotopes: IsotopeRecord[];
  aliases: string[];
  structure?: any;
}
