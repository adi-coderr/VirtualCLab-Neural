/**
 * Utility to resolve accurate constituent oxidation numbers for chemicals (both elements and compounds).
 * Provides pedagogically sound oxidation number representations for chemical profile views.
 */

export interface ConstituentOxidation {
  element: string;
  oxidationNumber: string; // e.g. "+2", "+6", "-2"
}

export interface OxidationStateResult {
  isElement: boolean;
  cardDisplay: string; // concise representation for metric card, e.g. "Fe(+2), S(+6), O(-2)" or "+2, +3"
  subtitle: string; // e.g. "Constituent oxidation states" or "Element Z = 26"
  detailedList: ConstituentOxidation[];
}

// Known common laboratory compounds and minerals with authoritative constituent oxidation states
const KNOWN_COMPOUND_OXIDATIONS: Record<string, ConstituentOxidation[]> = {
  // Iron compounds
  feso4: [{ element: "Fe", oxidationNumber: "+2" }, { element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  fecl2: [{ element: "Fe", oxidationNumber: "+2" }, { element: "Cl", oxidationNumber: "-1" }],
  fecl3: [{ element: "Fe", oxidationNumber: "+3" }, { element: "Cl", oxidationNumber: "-1" }],
  fe2o3: [{ element: "Fe", oxidationNumber: "+3" }, { element: "O", oxidationNumber: "-2" }],
  feo: [{ element: "Fe", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }],
  fe3o4: [{ element: "Fe", oxidationNumber: "+2, +3" }, { element: "O", oxidationNumber: "-2" }],
  feoh2: [{ element: "Fe", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  feoh3: [{ element: "Fe", oxidationNumber: "+3" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  "fe-oh-2": [{ element: "Fe", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  "fe-oh-3": [{ element: "Fe", oxidationNumber: "+3" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],

  // Copper compounds
  cuso4: [{ element: "Cu", oxidationNumber: "+2" }, { element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  cucl2: [{ element: "Cu", oxidationNumber: "+2" }, { element: "Cl", oxidationNumber: "-1" }],
  cucl: [{ element: "Cu", oxidationNumber: "+1" }, { element: "Cl", oxidationNumber: "-1" }],
  cuo: [{ element: "Cu", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }],
  cu2o: [{ element: "Cu", oxidationNumber: "+1" }, { element: "O", oxidationNumber: "-2" }],
  cuno32: [{ element: "Cu", oxidationNumber: "+2" }, { element: "N", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
  "cu-no3-2": [{ element: "Cu", oxidationNumber: "+2" }, { element: "N", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
  cuoh2: [{ element: "Cu", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  "cu-oh-2": [{ element: "Cu", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],

  // Calcium, Barium & Magnesium compounds
  caco3: [{ element: "Ca", oxidationNumber: "+2" }, { element: "C", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  cacl2: [{ element: "Ca", oxidationNumber: "+2" }, { element: "Cl", oxidationNumber: "-1" }],
  caoh2: [{ element: "Ca", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  "ca-oh-2": [{ element: "Ca", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  caso4: [{ element: "Ca", oxidationNumber: "+2" }, { element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  bacl2: [{ element: "Ba", oxidationNumber: "+2" }, { element: "Cl", oxidationNumber: "-1" }],
  baso4: [{ element: "Ba", oxidationNumber: "+2" }, { element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  mgcl2: [{ element: "Mg", oxidationNumber: "+2" }, { element: "Cl", oxidationNumber: "-1" }],
  mgso4: [{ element: "Mg", oxidationNumber: "+2" }, { element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  mgco3: [{ element: "Mg", oxidationNumber: "+2" }, { element: "C", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  mgoh2: [{ element: "Mg", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  "mg-oh-2": [{ element: "Mg", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],

  // Lead, Silver & Zinc compounds
  pbno32: [{ element: "Pb", oxidationNumber: "+2" }, { element: "N", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
  "pb-no3-2": [{ element: "Pb", oxidationNumber: "+2" }, { element: "N", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
  pbcl2: [{ element: "Pb", oxidationNumber: "+2" }, { element: "Cl", oxidationNumber: "-1" }],
  pbo: [{ element: "Pb", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }],
  pbo2: [{ element: "Pb", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  agno3: [{ element: "Ag", oxidationNumber: "+1" }, { element: "N", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
  agcl: [{ element: "Ag", oxidationNumber: "+1" }, { element: "Cl", oxidationNumber: "-1" }],
  ag2o: [{ element: "Ag", oxidationNumber: "+1" }, { element: "O", oxidationNumber: "-2" }],
  znso4: [{ element: "Zn", oxidationNumber: "+2" }, { element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  zncl2: [{ element: "Zn", oxidationNumber: "+2" }, { element: "Cl", oxidationNumber: "-1" }],
  zno: [{ element: "Zn", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }],
  znoh2: [{ element: "Zn", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  "zn-oh-2": [{ element: "Zn", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],

  // Alkali Salts & Hydroxides
  naoh: [{ element: "Na", oxidationNumber: "+1" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  koh: [{ element: "K", oxidationNumber: "+1" }, { element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  nacl: [{ element: "Na", oxidationNumber: "+1" }, { element: "Cl", oxidationNumber: "-1" }],
  kcl: [{ element: "K", oxidationNumber: "+1" }, { element: "Cl", oxidationNumber: "-1" }],
  ki: [{ element: "K", oxidationNumber: "+1" }, { element: "I", oxidationNumber: "-1" }],
  nabr: [{ element: "Na", oxidationNumber: "+1" }, { element: "Br", oxidationNumber: "-1" }],
  kbr: [{ element: "K", oxidationNumber: "+1" }, { element: "Br", oxidationNumber: "-1" }],
  na2co3: [{ element: "Na", oxidationNumber: "+1" }, { element: "C", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  nahco3: [{ element: "Na", oxidationNumber: "+1" }, { element: "H", oxidationNumber: "+1" }, { element: "C", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  k2co3: [{ element: "K", oxidationNumber: "+1" }, { element: "C", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  khco3: [{ element: "K", oxidationNumber: "+1" }, { element: "H", oxidationNumber: "+1" }, { element: "C", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  na2so4: [{ element: "Na", oxidationNumber: "+1" }, { element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  k2so4: [{ element: "K", oxidationNumber: "+1" }, { element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  nano3: [{ element: "Na", oxidationNumber: "+1" }, { element: "N", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
  kno3: [{ element: "K", oxidationNumber: "+1" }, { element: "N", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],

  // Acids & Nonmetals
  hcl: [{ element: "H", oxidationNumber: "+1" }, { element: "Cl", oxidationNumber: "-1" }],
  h2so4: [{ element: "H", oxidationNumber: "+1" }, { element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  hno3: [{ element: "H", oxidationNumber: "+1" }, { element: "N", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
  h3po4: [{ element: "H", oxidationNumber: "+1" }, { element: "P", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
  ch3cooh: [{ element: "C", oxidationNumber: "0" }, { element: "H", oxidationNumber: "+1" }, { element: "O", oxidationNumber: "-2" }],
  h2co3: [{ element: "H", oxidationNumber: "+1" }, { element: "C", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  h2o: [{ element: "H", oxidationNumber: "+1" }, { element: "O", oxidationNumber: "-2" }],
  h2o2: [{ element: "H", oxidationNumber: "+1" }, { element: "O", oxidationNumber: "-1" }],
  co2: [{ element: "C", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  co: [{ element: "C", oxidationNumber: "+2" }, { element: "O", oxidationNumber: "-2" }],
  so2: [{ element: "S", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
  so3: [{ element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
  nh3: [{ element: "N", oxidationNumber: "-3" }, { element: "H", oxidationNumber: "+1" }],
  nh4cl: [{ element: "N", oxidationNumber: "-3" }, { element: "H", oxidationNumber: "+1" }, { element: "Cl", oxidationNumber: "-1" }],
  kmno4: [{ element: "K", oxidationNumber: "+1" }, { element: "Mn", oxidationNumber: "+7" }, { element: "O", oxidationNumber: "-2" }],
  k2cr2o7: [{ element: "K", oxidationNumber: "+1" }, { element: "Cr", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
};

export function getOxidationStateInfo(
  chemicalId: string,
  formula: string,
  atomicNumber?: number | null,
  elementalStates?: number[] | null
): OxidationStateResult {
  const normId = (chemicalId || "").toLowerCase().trim();
  const cleanFormula = (formula || "").trim();

  // 1. If it is an elemental substance (atomicNumber is provided and > 0)
  if (atomicNumber !== null && atomicNumber !== undefined && atomicNumber > 0) {
    const states = elementalStates && elementalStates.length > 0 ? elementalStates : [0];
    const cardDisplay = states.map((s) => (s > 0 ? `+${s}` : `${s}`)).join(", ");
    return {
      isElement: true,
      cardDisplay,
      subtitle: `Element Z = ${atomicNumber}`,
      detailedList: [{ element: cleanFormula, oxidationNumber: cardDisplay }],
    };
  }

  // 2. Direct dictionary match for known compounds
  if (KNOWN_COMPOUND_OXIDATIONS[normId]) {
    const list = KNOWN_COMPOUND_OXIDATIONS[normId]!;
    const cardDisplay = list.map((item) => `${item.element}(${item.oxidationNumber})`).join(", ");
    return {
      isElement: false,
      cardDisplay,
      subtitle: "Constituent oxidation states",
      detailedList: list,
    };
  }

  // 3. Normalized formula match (e.g. "FeSO4", "CuSO4")
  const normFormulaKey = cleanFormula.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (KNOWN_COMPOUND_OXIDATIONS[normFormulaKey]) {
    const list = KNOWN_COMPOUND_OXIDATIONS[normFormulaKey]!;
    const cardDisplay = list.map((item) => `${item.element}(${item.oxidationNumber})`).join(", ");
    return {
      isElement: false,
      cardDisplay,
      subtitle: "Constituent oxidation states",
      detailedList: list,
    };
  }

  // 4. Algorithmic fallback: Check for common polyatomic ions
  const polyatomicMap: Record<string, ConstituentOxidation[]> = {
    so4: [{ element: "S", oxidationNumber: "+6" }, { element: "O", oxidationNumber: "-2" }],
    so3: [{ element: "S", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
    no3: [{ element: "N", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
    no2: [{ element: "N", oxidationNumber: "+3" }, { element: "O", oxidationNumber: "-2" }],
    co3: [{ element: "C", oxidationNumber: "+4" }, { element: "O", oxidationNumber: "-2" }],
    po4: [{ element: "P", oxidationNumber: "+5" }, { element: "O", oxidationNumber: "-2" }],
    oh: [{ element: "O", oxidationNumber: "-2" }, { element: "H", oxidationNumber: "+1" }],
  };

  for (const [sub, oxList] of Object.entries(polyatomicMap)) {
    if (cleanFormula.toLowerCase().includes(sub)) {
      const cardDisplay = oxList.map((item) => `${item.element}(${item.oxidationNumber})`).join(", ");
      return {
        isElement: false,
        cardDisplay: `${cardDisplay} ...`,
        subtitle: "Constituent oxidation states",
        detailedList: oxList,
      };
    }
  }

  // 5. Ultimate fallback if neither element nor known compound
  return {
    isElement: false,
    cardDisplay: "Constituent states",
    subtitle: "Stable compound lattice",
    detailedList: [],
  };
}
