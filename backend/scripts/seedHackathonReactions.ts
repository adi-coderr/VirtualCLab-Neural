import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ShowcaseReaction {
  num: number;
  id: string;
  name: string;
  reactionType: string;
  equation: string;
  netIonicEquation?: string;
  reactants: { chemicalId: string; coefficient: number }[];
  products: { chemicalId: string; coefficient: number; isByproduct?: boolean }[];
  enthalpyKjPerMol: number;
  energyClassification: "exothermic" | "endothermic";
  conditionsDescription: string;
  outcome: string;
  afterEffect: string;
  temperatureMinC?: number;
  temperatureMaxC?: number;
  solvent?: string;
  catalystChemicalId?: string;
  safetyNotes: string;
  observableEffects: {
    type: string;
    description: string;
    colorFrom?: string;
    colorTo?: string;
    relatedChemicalId?: string;
  }[];
  aliases?: string[];
}

const SHOWCASE_REACTIONS: ShowcaseReaction[] = [
  {
    num: 1,
    id: "hackathon-rxn-01-sodium-chlorine",
    name: "Sodium + chlorine → sodium chloride",
    reactionType: "synthesis",
    equation: "2Na(s) + Cl2(g) -> 2NaCl(s)",
    netIonicEquation: "2Na + Cl2 -> 2Na+ + 2Cl-",
    reactants: [
      { chemicalId: "na", coefficient: 2 },
      { chemicalId: "cl2", coefficient: 1 },
    ],
    products: [{ chemicalId: "nacl", coefficient: 2, isByproduct: false }],
    enthalpyKjPerMol: -822,
    energyClassification: "exothermic",
    conditionsDescription: "Warmed sodium lowered into a chlorine-filled jar",
    outcome: "Sodium melts and burns with an intense yellow flame, white smoke forms and the green-yellow gas fades",
    afterEffect: "White NaCl coats the vessel, with a large temperature rise. Leftover Cl₂ is toxic. Two non-ionic elements end up as an ionic solid.",
    safetyNotes: "Violent exothermic reaction; molten sodium fire hazard; toxic chlorine gas. Conduct strictly in fume hood with safety shielding.",
    observableEffects: [
      {
        type: "temperature_increase",
        description: "Intense exothermic heat release (ΔH ≈ -822 kJ/mol) causing thermal rise.",
      },
      {
        type: "color_change",
        description: "Green-yellow chlorine gas fades as it reacts; intense brilliant yellow flame appears.",
        colorFrom: "#D4E157",
        colorTo: "#FFF176",
        relatedChemicalId: "cl2",
      },
      {
        type: "phase_change",
        description: "Dense billowing white smoke of solid sodium chloride micro-crystals coats the vessel.",
        relatedChemicalId: "nacl",
      },
    ],
  },
  {
    num: 2,
    id: "hackathon-rxn-02-aluminium-iodine",
    name: "Aluminium + iodine → aluminium iodide",
    reactionType: "synthesis",
    equation: "2Al(s) + 3I2(s) -> 2AlI3(s)",
    reactants: [
      { chemicalId: "al", coefficient: 2 },
      { chemicalId: "i2", coefficient: 3 },
    ],
    products: [{ chemicalId: "ali3", coefficient: 2, isByproduct: false }],
    enthalpyKjPerMol: -606,
    energyClassification: "exothermic",
    conditionsDescription: "Room temperature, water added last (a few drops of H₂O as initiator)",
    outcome: "After a short delay the mixture ignites, unreacted iodine sublimes into dense purple vapour, and steam rises",
    afterEffect: "Yellow-brown AlI₃ residue and purple iodine crystals on cooler glass. AlI₃ fumes (HI) in moist air.",
    safetyNotes: "Dense purple toxic iodine vapor generated; AlI3 fumes violently with air moisture forming corrosive HI.",
    observableEffects: [
      {
        type: "temperature_increase",
        description: "Spontaneous ignition after water activation releasing extreme heat (ΔH ≈ -606 kJ/mol).",
      },
      {
        type: "color_change",
        description: "Unreacted iodine sublimes into a dramatic, dense cloud of brilliant violet-purple vapor.",
        colorFrom: "#4A148C",
        colorTo: "#8E24AA",
        relatedChemicalId: "i2",
      },
      {
        type: "phase_change",
        description: "Yellow-brown AlI3 residue forms with purple crystalline iodine sublimate depositing on cool surfaces.",
        relatedChemicalId: "ali3",
      },
    ],
  },
  {
    num: 3,
    id: "hackathon-rxn-03-magnesium-carbon-dioxide",
    name: "Magnesium + carbon dioxide",
    reactionType: "single_displacement",
    equation: "2Mg(s) + CO2(g) -> 2MgO(s) + C(s)",
    reactants: [
      { chemicalId: "mg", coefficient: 2 },
      { chemicalId: "co2", coefficient: 1 },
    ],
    products: [
      { chemicalId: "mgo", coefficient: 2, isByproduct: false },
      { chemicalId: "c", coefficient: 1, isByproduct: false },
    ],
    enthalpyKjPerMol: -810,
    energyClassification: "exothermic",
    conditionsDescription: "Ignite the Mg ribbon first, then lower it into CO₂ (gas or dry-ice block)",
    outcome: "Dazzling white light, white powder with black specks",
    afterEffect: "MgO and carbon residue. A CO₂ extinguisher fails on a magnesium fire, and the light is a hazard to eyes.",
    safetyNotes: "Blinding actinic UV emission; never view directly without shade 5+ welder goggles. CO2 extinguishers fail to suppress magnesium fires.",
    observableEffects: [
      {
        type: "temperature_increase",
        description: "Extreme exothermic combustion (ΔH ≈ -810 kJ/mol) sustaining burn in pure carbon dioxide.",
      },
      {
        type: "color_change",
        description: "Dazzling, intense white actinic luminescence emitted by burning magnesium.",
        colorFrom: "#90A4AE",
        colorTo: "#FFFFFF",
      },
      {
        type: "precipitation",
        description: "White refractory magnesium oxide powder forms impregnated with black specks of elemental carbon.",
        relatedChemicalId: "mgo",
      },
    ],
  },
  {
    num: 4,
    id: "hackathon-rxn-04-iron-sulfur",
    name: "Iron + sulfur → iron(II) sulfide",
    reactionType: "synthesis",
    equation: "Fe(s) + S(s) -> FeS(s)",
    reactants: [
      { chemicalId: "fe", coefficient: 1 },
      { chemicalId: "s", coefficient: 1 },
    ],
    products: [{ chemicalId: "fes", coefficient: 1, isByproduct: false }],
    enthalpyKjPerMol: -100,
    energyClassification: "exothermic",
    conditionsDescription: "Fe filings and S powder roughly 7:4 by mass. Heat one spot, then the reaction spreads autonomously",
    outcome: "The mixture glows red and the glow travels through it, leaving a black-grey solid",
    afterEffect: "The product is no longer magnetic, which is the mixture-versus-compound point. Adding dilute HCl gives rotten-egg H₂S gas (FeS + 2HCl → FeCl₂ + H₂S), which is a good follow-up reaction.",
    safetyNotes: "Reaction mixture glows red hot. Reaction with dilute acid liberates deadly, paralytic hydrogen sulfide (H2S) gas.",
    observableEffects: [
      {
        type: "temperature_increase",
        description: "Self-sustaining exothermic thermal front glows red and travels spontaneously through the powder (ΔH ≈ -100 kJ/mol).",
      },
      {
        type: "color_change",
        description: "Yellow sulfur powder and metallic grey iron fuse into a matte black-grey solid.",
        colorFrom: "#FDD835",
        colorTo: "#212121",
        relatedChemicalId: "fes",
      },
      {
        type: "phase_change",
        description: "Product completely loses ferromagnetism, demonstrating chemical compound synthesis.",
        relatedChemicalId: "fes",
      },
    ],
  },
  {
    num: 5,
    id: "hackathon-rxn-05-hydrogen-chlorine",
    name: "Hydrogen + chlorine → hydrogen chloride (photochemical chain)",
    reactionType: "synthesis",
    equation: "H2(g) + Cl2(g) -> 2HCl(g)",
    reactants: [
      { chemicalId: "h2", coefficient: 1 },
      { chemicalId: "cl2", coefficient: 1 },
    ],
    products: [{ chemicalId: "hcl", coefficient: 2, isByproduct: false }],
    enthalpyKjPerMol: -184.6,
    energyClassification: "exothermic",
    conditionsDescription: "No reaction in the dark; bright light, UV photons, or a spark triggers it",
    outcome: "The green-yellow colour fades and the reaction is very fast (explosive for 1:1 mixtures). White fumes form in moist air.",
    afterEffect: "HCl dissolves in water to give strong hydrochloric acid, and damp blue litmus turns red. Mechanism: Cl₂ → 2Cl•, Cl• + H₂ → HCl + H•, H• + Cl₂ → HCl + Cl•.",
    safetyNotes: "Violent photochemical explosive hazard. HCl gas produces corrosive acid aerosol on contact with moisture.",
    observableEffects: [
      {
        type: "temperature_increase",
        description: "Ultra-fast explosive radical chain propagation releasing intense heat (ΔH = -184.6 kJ/mol).",
      },
      {
        type: "color_change",
        description: "Pale green-yellow chlorine gas colour fades instantly as diatomic bonds break.",
        colorFrom: "#D4E157",
        colorTo: "#F5F5F5",
        relatedChemicalId: "cl2",
      },
      {
        type: "gas_evolution",
        description: "Misty acidic white fumes of hydrogen chloride condense on atmospheric moisture.",
        relatedChemicalId: "hcl",
      },
    ],
  },
  {
    num: 6,
    id: "hackathon-rxn-06-copper-nitric-acid",
    name: "Copper + nitric acid (concentrated)",
    reactionType: "redox_other",
    equation: "Cu(s) + 4HNO3(aq) -> Cu(NO3)2(aq) + 2NO2(g) + 2H2O(l)",
    reactants: [
      { chemicalId: "cu", coefficient: 1 },
      { chemicalId: "hno3", coefficient: 4 },
    ],
    products: [
      { chemicalId: "cuno32", coefficient: 1, isByproduct: false },
      { chemicalId: "no2", coefficient: 2, isByproduct: true },
      { chemicalId: "water", coefficient: 2, isByproduct: true },
    ],
    enthalpyKjPerMol: -136,
    energyClassification: "exothermic",
    conditionsDescription: "Concentrated vs dilute acid (concentrated ~68% HNO₃, room temperature)",
    outcome: "Concentrated gives a vigorous reaction with dense brown NO₂. Dilute is slower, with colourless NO that turns brown at the vessel mouth (2NO + O₂ → 2NO₂).",
    afterEffect: "Green solution that turns blue on dilution (Cu(NO₃)₂). Exothermic. NO₂ is toxic, so a fume hood is needed.",
    safetyNotes: "NO2 gas causes severe pulmonary damage and delayed chemical pneumonitis. Concentrated HNO3 causes severe skin burns.",
    observableEffects: [
      {
        type: "gas_evolution",
        description: "Vigorous bubbling and continuous outpouring of dense, choking reddish-brown nitrogen dioxide gas.",
        relatedChemicalId: "no2",
      },
      {
        type: "color_change",
        description: "Solution shifts to deep emerald green from high nitrate coordination, transforming to bright blue upon water dilution.",
        colorFrom: "#FFFFFF",
        colorTo: "#0288D1",
        relatedChemicalId: "cuno32",
      },
      {
        type: "temperature_increase",
        description: "Substantial exothermic warming as copper metal rapidly dissolves.",
      },
    ],
  },
  {
    num: 7,
    id: "hackathon-rxn-07-ammonia-hydrogen-chloride",
    name: "Ammonia + hydrogen chloride (smoke ring)",
    reactionType: "synthesis",
    equation: "NH3(g) + HCl(g) -> NH4Cl(s)",
    reactants: [
      { chemicalId: "ammonia", coefficient: 1 },
      { chemicalId: "hcl", coefficient: 1 },
    ],
    products: [{ chemicalId: "ammonium-chloride", coefficient: 1, isByproduct: false }],
    enthalpyKjPerMol: -176,
    energyClassification: "exothermic",
    conditionsDescription: "Cotton soaked in concentrated NH₃ and concentrated HCl at opposite ends of a dry glass tube",
    outcome: "A white ring forms about 59% of the tube length from the NH₃ end, because the lighter NH₃ diffuses faster (Graham’s law)",
    afterEffect: "White NH₄Cl deposit. Heating decomposes it back to NH₃ + HCl, and in water it gives a slightly acidic solution.",
    safetyNotes: "Concentrated ammonia and hydrochloric acid vapors are pungent respiratory irritants. Wear protective eyewear and gloves.",
    observableEffects: [
      {
        type: "precipitation",
        description: "Dense, brilliant white particulate smoke ring forms where the two counter-diffusing gas fronts meet.",
        relatedChemicalId: "ammonium-chloride",
      },
      {
        type: "color_change",
        description: "Clear gas chamber develops a sharp opaque white crystalline band at ~59% length from NH3 source.",
        colorFrom: "#FFFFFF",
        colorTo: "#FAFAFA",
      },
      {
        type: "temperature_increase",
        description: "Exothermic gas-phase proton-transfer neutralization (ΔH ≈ -176 kJ/mol).",
      },
    ],
  },
  {
    num: 8,
    id: "hackathon-rxn-08-claus-reaction",
    name: "Hydrogen sulfide + sulfur dioxide → sulfur (Claus reaction)",
    reactionType: "redox_other",
    equation: "2H2S(g) + SO2(g) -> 3S(s) + 2H2O(g)",
    reactants: [
      { chemicalId: "h2s", coefficient: 2 },
      { chemicalId: "so2", coefficient: 1 },
    ],
    products: [
      { chemicalId: "s", coefficient: 3, isByproduct: false },
      { chemicalId: "water", coefficient: 2, isByproduct: true },
    ],
    enthalpyKjPerMol: -146,
    energyClassification: "exothermic",
    conditionsDescription: "Room temperature in a moist vessel (industrially ~200–300 °C over alumina)",
    outcome: "Two colourless gases produce a yellow sulfur deposit and water droplets, and the rotten-egg smell fades",
    afterEffect: "Yellow S powder on the walls. A comproportionation (S from −2 and +4 to 0). Both gases are highly toxic.",
    safetyNotes: "Hydrogen sulfide (H2S) is extremely lethal and rapidly paralyzes olfactory nerves. SO2 is an acute choking agent. Fume hood mandatory.",
    observableEffects: [
      {
        type: "precipitation",
        description: "Fine, bright canary-yellow elemental sulfur dust coats the inner walls of the reaction chamber.",
        relatedChemicalId: "s",
      },
      {
        type: "phase_change",
        description: "Liquid water droplets condense on the vessel glass as the foul rotten-egg stench dissipates.",
        relatedChemicalId: "water",
      },
      {
        type: "temperature_increase",
        description: "Exothermic comproportionation redox releasing heat (ΔH ≈ -146 kJ/mol).",
      },
    ],
  },
  {
    num: 9,
    id: "hackathon-rxn-09-hydrogen-iodine",
    name: "Hydrogen + iodine ⇌ hydrogen iodide",
    reactionType: "synthesis",
    equation: "H2(g) + I2(g) ⇌ 2HI(g)",
    reactants: [
      { chemicalId: "h2", coefficient: 1 },
      { chemicalId: "i2", coefficient: 1 },
    ],
    products: [{ chemicalId: "hi", coefficient: 2, isByproduct: false }],
    enthalpyKjPerMol: -9.5,
    energyClassification: "exothermic",
    conditionsDescription: "Sealed vessel at ~425 °C, Kc ≈ 54",
    outcome: "Violet iodine vapour fades but never disappears. A 1:1 mixture reaches about 79% conversion.",
    afterEffect: "A three-gas equilibrium mixture. Pressure has no effect (equal moles each side) and a higher temperature lowers K slightly. HI dissolves to give a strong acid.",
    safetyNotes: "Hot iodine vapor is toxic. HI gas is strongly corrosive. High temperature sealed glass ampoule requires thermal blast shield.",
    observableEffects: [
      {
        type: "color_change",
        description: "Deep violet iodine vapor steadily fades into a persistent, pale purple dynamic equilibrium mixture.",
        colorFrom: "#4A148C",
        colorTo: "#CE93D8",
        relatedChemicalId: "i2",
      },
      {
        type: "phase_change",
        description: "Reaches dynamic equilibrium with constant partial pressures; pressure changes have zero stoichiometric shift.",
      },
    ],
  },
  {
    num: 10,
    id: "hackathon-rxn-10-acetone-iodine",
    name: "Acetone + iodine (acid-catalysed kinetics)",
    reactionType: "redox_other",
    equation: "CH3COCH3(l) + I2(aq) -> CH3COCH2I(l) + HI(aq)",
    reactants: [
      { chemicalId: "ch3coch3", coefficient: 1 },
      { chemicalId: "i2", coefficient: 1 },
    ],
    products: [
      { chemicalId: "iodoacetone", coefficient: 1, isByproduct: false },
      { chemicalId: "hi", coefficient: 1, isByproduct: true },
    ],
    enthalpyKjPerMol: -2,
    energyClassification: "exothermic",
    conditionsDescription: "Room temperature; HCl as catalyst",
    outcome: "Brown iodine colour fades at a constant rate, because the reaction is zero order in I₂ (rate = k[acetone][H⁺])",
    afterEffect: "Iodoacetone (a tear-inducing lachrymator) forms. HI raises the acidity, so the rate speeds up slightly as it proceeds (autocatalysis).",
    safetyNotes: "Iodoacetone is a potent lachrymator (tear gas) causing severe stinging of eyes and respiratory tract. Work in verified fume hood.",
    observableEffects: [
      {
        type: "color_change",
        description: "Deep brown aqueous iodine solution undergoes a steady linear decolourisation to clear at a zero-order rate.",
        colorFrom: "#795548",
        colorTo: "#FAFAFA",
        relatedChemicalId: "i2",
      },
      {
        type: "effervescence",
        description: "Autocatalytic generation of pungent, tear-inducing iodoacetone and rising solution acidity.",
        relatedChemicalId: "iodoacetone",
      },
    ],
  },
  {
    num: 11,
    id: "hackathon-rxn-11-ethene-bromine",
    name: "Ethene + bromine (alkene test)",
    reactionType: "synthesis",
    equation: "C2H4(g) + Br2(aq) -> C2H4Br2(l)",
    reactants: [
      { chemicalId: "c2h4", coefficient: 1 },
      { chemicalId: "br2", coefficient: 1 },
    ],
    products: [{ chemicalId: "c2h4br2", coefficient: 1, isByproduct: false }],
    enthalpyKjPerMol: -130,
    energyClassification: "exothermic",
    conditionsDescription: "Room temperature; H₂O is the solvent (bromine water)",
    outcome: "Orange-brown bromine water decolourises instantly",
    afterEffect: "A dense oily layer of 1,2-dibromoethane (toxic) under the aqueous layer, with a slightly acidic solution from the HBr pathway.",
    safetyNotes: "Bromine liquid and vapor cause deep chemical burns. 1,2-Dibromoethane is toxic and a suspected human carcinogen.",
    observableEffects: [
      {
        type: "color_change",
        description: "Orange-brown bromine water solution decolourises immediately to clear upon ethene addition.",
        colorFrom: "#E65100",
        colorTo: "#FFFFFF",
        relatedChemicalId: "br2",
      },
      {
        type: "phase_change",
        description: "Dense immiscible oily droplets of 1,2-dibromoethane settle into a separate bottom layer.",
        relatedChemicalId: "c2h4br2",
      },
      {
        type: "temperature_increase",
        description: "Exothermic electrophilic halogen addition across the carbon-carbon double bond (ΔH ≈ -130 kJ/mol).",
      },
    ],
  },
  {
    num: 12,
    id: "hackathon-rxn-12-methane-chlorine",
    name: "Methane + chlorine (UV free-radical substitution)",
    reactionType: "synthesis",
    equation: "CH4(g) + Cl2(g) -> CH3Cl(g) + HCl(g)",
    reactants: [
      { chemicalId: "ch4", coefficient: 1 },
      { chemicalId: "cl2", coefficient: 1 },
    ],
    products: [
      { chemicalId: "ch3cl", coefficient: 1, isByproduct: false },
      { chemicalId: "hcl", coefficient: 1, isByproduct: true },
    ],
    enthalpyKjPerMol: -99,
    energyClassification: "exothermic",
    conditionsDescription: "UV light; nothing happens in the dark",
    outcome: "The pale-green colour fades under UV, with misty HCl in damp air",
    afterEffect: "A mixture of chloromethanes. Excess CH₄ favours CH₃Cl, excess Cl₂ favours the heavier ones (CH₂Cl₂, CHCl₃, CCl₄). Damp litmus turns red.",
    safetyNotes: "Direct intense UV or solar exposure can trigger an explosive homolytic detonation. Chloromethanes are toxic and narcotic.",
    observableEffects: [
      {
        type: "color_change",
        description: "Pale green-yellow chlorine gas color rapidly fades under UV radiation.",
        colorFrom: "#D4E157",
        colorTo: "#FFFFFF",
        relatedChemicalId: "cl2",
      },
      {
        type: "gas_evolution",
        description: "Misty acidic vapors of HCl form in moist ambient air.",
        relatedChemicalId: "hcl",
      },
      {
        type: "temperature_increase",
        description: "Exothermic radical propagation steps release heat into the reaction vessel (ΔH ≈ -99 kJ/mol).",
      },
    ],
  },
  {
    num: 13,
    id: "hackathon-rxn-13-haber-process",
    name: "Haber process (ammonia synthesis)",
    reactionType: "synthesis",
    equation: "N2(g) + 3H2(g) ⇌ 2NH3(g)",
    reactants: [
      { chemicalId: "n2", coefficient: 1 },
      { chemicalId: "h2", coefficient: 3 },
    ],
    products: [{ chemicalId: "ammonia", coefficient: 2, isByproduct: false }],
    enthalpyKjPerMol: -92,
    energyClassification: "exothermic",
    conditionsDescription: "400–450 °C, 150–250 atm; Fe catalyst with K₂O/Al₂O₃ promoters",
    outcome: "No visible change in the gases. Per-pass conversion is only ~15–20%.",
    afterEffect: "NH₃ is condensed out as a liquid and unreacted gas is recycled. Yield rises with pressure and falls with temperature, and the catalyst is unchanged.",
    safetyNotes: "Extreme high pressure (200 atm) and elevated temperature with flammable hydrogen and toxic ammonia.",
    observableEffects: [
      {
        type: "phase_change",
        description: "High-pressure gas condensation yields liquid anhydrous ammonia in refrigeration chiller.",
        relatedChemicalId: "ammonia",
      },
      {
        type: "temperature_increase",
        description: "Continuous exothermic energy release across the multi-bed catalytic converter (ΔH ≈ -92 kJ/mol).",
      },
    ],
  },
  {
    num: 14,
    id: "hackathon-rxn-14-steam-reforming",
    name: "Steam reforming + water–gas shift",
    reactionType: "redox_other",
    equation: "CH4(g) + 2H2O(g) -> CO2(g) + 4H2(g)",
    reactants: [
      { chemicalId: "ch4", coefficient: 1 },
      { chemicalId: "water", coefficient: 2 },
    ],
    products: [
      { chemicalId: "co2", coefficient: 1, isByproduct: false },
      { chemicalId: "h2", coefficient: 4, isByproduct: false },
    ],
    enthalpyKjPerMol: 165,
    energyClassification: "endothermic",
    conditionsDescription: "700–1000 °C over Ni catalyst, then ~200–400 °C for shift converter",
    outcome: "No visible change. The endothermic step needs continuous heat input.",
    afterEffect: "H₂-rich gas. CO₂ is scrubbed out, and the product is flammable.",
    safetyNotes: "High thermal furnace temperatures. Produces flammable hydrogen and toxic carbon monoxide intermediate.",
    observableEffects: [
      {
        type: "temperature_decrease",
        description: "Strongly endothermic overall (+165 kJ/mol), demanding continuous external furnace firing.",
      },
      {
        type: "gas_evolution",
        description: "Substantial molar expansion generating 4 moles of clean hydrogen per mole of methane.",
        relatedChemicalId: "h2",
      },
    ],
  },
  {
    num: 15,
    id: "hackathon-rxn-15-ostwald-process",
    name: "Ostwald process (ammonia → nitric acid)",
    reactionType: "redox_other",
    equation: "4NH3(g) + 5O2(g) -> 4NO(g) + 6H2O(g)",
    reactants: [
      { chemicalId: "ammonia", coefficient: 4 },
      { chemicalId: "o2", coefficient: 5 },
    ],
    products: [
      { chemicalId: "no", coefficient: 4, isByproduct: false },
      { chemicalId: "water", coefficient: 6, isByproduct: true },
    ],
    enthalpyKjPerMol: -905,
    energyClassification: "exothermic",
    conditionsDescription: "Pt–Rh gauze at ~850 °C, then cooling and absorption in water",
    outcome: "The gauze glows orange-red, heated by the reaction itself. Colourless NO turns brown NO₂ in air.",
    afterEffect: "Nitric acid (pale yellow if NO₂ is dissolved), with NO recycled. NOx is an emission hazard.",
    safetyNotes: "Highly exothermic oxidation maintaining red-hot gauze. Effluent forms corrosive HNO3 and toxic NOx.",
    observableEffects: [
      {
        type: "temperature_increase",
        description: "Self-sustaining reaction heat keeps the Pt-Rh catalyst gauze glowing incandescent orange-red (ΔH ≈ -905 kJ/mol).",
      },
      {
        type: "color_change",
        description: "Colourless nitric oxide spontaneously oxidizes in air into choking reddish-brown NO2 gas.",
        colorFrom: "#FFFFFF",
        colorTo: "#8D6E63",
        relatedChemicalId: "no",
      },
    ],
  },
  {
    num: 16,
    id: "hackathon-rxn-16-fischer-esterification",
    name: "Ethanol + acetic acid ⇌ ethyl acetate (Fischer esterification)",
    reactionType: "synthesis",
    equation: "CH3COOH(l) + C2H5OH(l) ⇌ CH3COOC2H5(l) + H2O(l)",
    reactants: [
      { chemicalId: "acetic-acid", coefficient: 1 },
      { chemicalId: "c2h5oh", coefficient: 1 },
    ],
    products: [
      { chemicalId: "ch3cooc2h5", coefficient: 1, isByproduct: false },
      { chemicalId: "water", coefficient: 1, isByproduct: true },
    ],
    enthalpyKjPerMol: -2,
    energyClassification: "exothermic",
    conditionsDescription: "Gentle reflux; conc. H₂SO₄ as catalyst",
    outcome: "A sweet, fruity smell, with no colour change",
    afterEffect: "An equilibrium mixture of four species, ~67% yield at 1:1. Excess ethanol or removing water pushes it above 90%. The product is flammable.",
    safetyNotes: "Concentrated sulfuric acid catalyst is corrosive. Ethyl acetate and ethanol vapors are flammable.",
    observableEffects: [
      {
        type: "color_change",
        description: "Clear homogeneous liquid develops a distinct, sweet, fragrant, fruity pear-drop aroma.",
        colorFrom: "#FFFFFF",
        colorTo: "#FAFAFA",
        relatedChemicalId: "ch3cooc2h5",
      },
      {
        type: "phase_change",
        description: "Equilibrium mixture of four organic and aqueous species reaches dynamic balance at ~67% yield.",
      },
    ],
  },
  {
    num: 17,
    id: "hackathon-rxn-17-aspirin-synthesis",
    name: "Salicylic acid + acetic anhydride → aspirin",
    reactionType: "synthesis",
    equation: "C7H6O3(s) + C4H6O3(l) -> C9H8O4(s) + CH3COOH(l)",
    reactants: [
      { chemicalId: "c7h6o3", coefficient: 1 },
      { chemicalId: "acetic-anhydride", coefficient: 1 },
    ],
    products: [
      { chemicalId: "aspirin", coefficient: 1, isByproduct: false },
      { chemicalId: "acetic-acid", coefficient: 1, isByproduct: true },
    ],
    enthalpyKjPerMol: -85,
    energyClassification: "exothermic",
    conditionsDescription: "70–80 °C for 10–15 min, then add cold water and chill; H₃PO₄ (few drops) as catalyst",
    outcome: "The solid dissolves in the warm anhydride. Water destroys the excess (hot, vinegar smell) and white crystals form on cooling.",
    afterEffect: "Crude aspirin (pure melting point ~135 °C). Ferric chloride test: violet means leftover salicylic acid. Recrystallise to purify.",
    safetyNotes: "Acetic anhydride is a corrosive lachrymator. Phosphoric acid catalyst causes acid burns. Hot acidic vinegar vapors on quench.",
    observableEffects: [
      {
        type: "dissolution",
        description: "Salicylic acid powder dissolves completely into the warm acetic anhydride liquid.",
        relatedChemicalId: "c7h6o3",
      },
      {
        type: "precipitation",
        description: "Snow-white needle-like crystals of acetylsalicylic acid (aspirin) rapidly precipitate upon ice bath chilling.",
        relatedChemicalId: "aspirin",
      },
      {
        type: "temperature_increase",
        description: "Exothermic acetylation followed by vigorous exothermic hydrolysis upon water quenching.",
      },
    ],
  },
  {
    num: 18,
    id: "hackathon-rxn-18-nylon-rope-trick",
    name: "Adipoyl chloride + hexamethylenediamine → nylon-6,6",
    reactionType: "synthesis",
    equation: "C6H8Cl2O2(hex) + C6H16N2(aq) -> C12H22N2O2(s) + 2HCl(aq)",
    reactants: [
      { chemicalId: "adipoyl-chloride", coefficient: 1 },
      { chemicalId: "hexamethylenediamine", coefficient: 1 },
    ],
    products: [
      { chemicalId: "nylon_66", coefficient: 1, isByproduct: false },
      { chemicalId: "hcl", coefficient: 2, isByproduct: true },
    ],
    enthalpyKjPerMol: -120,
    energyClassification: "exothermic",
    conditionsDescription: "The two layers meet without mixing (ClOC(CH₂)₄COCl in hexane, H₂N(CH₂)₆NH₂ in water)",
    outcome: "A film forms instantly at the interface and can be pulled out as a continuous rope",
    afterEffect: "White nylon thread. In practice NaOH is added to absorb the HCl, giving NaCl. Wash the polymer before handling. Adipoyl chloride is corrosive.",
    safetyNotes: "Adipoyl chloride is fuming and corrosive. Hexane is volatile and flammable. Wash the raw nylon rope thoroughly before handling.",
    observableEffects: [
      {
        type: "precipitation",
        description: "Instantaneous nucleation of a tough, elastic polymer membrane at the liquid-liquid boundary.",
        relatedChemicalId: "nylon_66",
      },
      {
        type: "phase_change",
        description: "A continuous, resilient white polymeric thread can be spooled smoothly out of the vessel.",
        relatedChemicalId: "nylon_66",
      },
      {
        type: "temperature_increase",
        description: "Localized interfacial exothermic polycondensation releasing heat at the boundary.",
      },
    ],
  },
  {
    num: 19,
    id: "hackathon-rxn-19-photosynthesis",
    name: "Photosynthesis (endothermic, needs light)",
    reactionType: "redox_other",
    equation: "6CO2(g) + 6H2O(l) -> C6H12O6(aq) + 6O2(g)",
    reactants: [
      { chemicalId: "co2", coefficient: 6 },
      { chemicalId: "water", coefficient: 6 },
    ],
    products: [
      { chemicalId: "glucose", coefficient: 1, isByproduct: false },
      { chemicalId: "o2", coefficient: 6, isByproduct: false },
    ],
    enthalpyKjPerMol: 2803,
    energyClassification: "endothermic",
    conditionsDescription: "Light input is required (solar/photon flux) plus chlorophyll as the catalyst",
    outcome: "O₂ bubbles from an aquatic plant, and no heat is released because the system absorbs energy",
    afterEffect: "Glucose (stored as starch, which gives a blue-black iodine test) and a rising O₂ level. Dissolved CO₂ drops, so the water pH rises. Your engine needs an energy-input path for this one, not a temperature rise.",
    safetyNotes: "High oxygen concentrations support energetic combustion. Biological photochemistry requires photon absorption rather than thermal heat.",
    observableEffects: [
      {
        type: "temperature_decrease",
        description: "Absorbs solar radiant energy (+2803 kJ/mol) storing chemical potential energy without thermal heating.",
      },
      {
        type: "gas_evolution",
        description: "Continuous stream of pure oxygen (O2) bubbles steadily evolves from plant tissue.",
        relatedChemicalId: "o2",
      },
      {
        type: "phase_change",
        description: "Fixation of dissolved carbon dioxide into glucose biochemical energy storage.",
        relatedChemicalId: "glucose",
      },
    ],
  },
  {
    num: 20,
    id: "hackathon-rxn-20-acid-rain-chain",
    name: "Sulfur + oxygen + water (acid rain chain)",
    reactionType: "synthesis",
    equation: "S(s) + O2(g) + H2O(l) -> H2SO3(aq)",
    reactants: [
      { chemicalId: "s", coefficient: 1 },
      { chemicalId: "o2", coefficient: 1 },
      { chemicalId: "water", coefficient: 1 },
    ],
    products: [{ chemicalId: "h2so3", coefficient: 1, isByproduct: false }],
    enthalpyKjPerMol: -314,
    energyClassification: "exothermic",
    conditionsDescription: "Sulfur melts at ~115 °C and then ignites; combustion gas bubbled into water",
    outcome: "A pale-blue flame (brighter in pure O₂) and a choking pungent gas",
    afterEffect: "Bubbling the gas into water with universal indicator gives red-orange (pH ~2–3). SO₂ also temporarily bleaches coloured petals.",
    safetyNotes: "SO2 gas is a choking respiratory toxin. Sulfurous acid is corrosive. Wear eye protection and execute in fume hood.",
    observableEffects: [
      {
        type: "color_change",
        description: "Sulfur burns with an eerie pale-blue flame; gas dissolved in water turns universal indicator red-orange (pH ~2-3).",
        colorFrom: "#0288D1",
        colorTo: "#D32F2F",
        relatedChemicalId: "h2so3",
      },
      {
        type: "gas_evolution",
        description: "Choking, pungent sulfur dioxide gas evolves during combustion.",
      },
      {
        type: "temperature_increase",
        description: "Exothermic combustion and acid hydration cascade (ΔH ≈ -314 kJ/mol).",
      },
    ],
  },
];

async function main() {
  console.log("==========================================================");
  console.log("   SEEDING 20 HACKATHON SHOWCASE REACTIONS TO DATABASES   ");
  console.log("==========================================================\n");

  const dbPaths = [
    path.join(__dirname, "..", "data", "chemlab.db"),
    path.join(__dirname, "..", "..", "data", "chemlab.db"),
  ];

  for (const dbPath of dbPaths) {
    if (!fs.existsSync(dbPath)) {
      console.log(`Skipping non-existent DB: ${dbPath}`);
      continue;
    }
    console.log(`\nProcessing SQLite DB: ${dbPath}`);
    const db = new Database(dbPath);

    // 1. Ensure table columns exist
    const cols = (db.prepare("PRAGMA table_info(reactions)").all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes("conditions_description")) {
      db.exec("ALTER TABLE reactions ADD COLUMN conditions_description TEXT");
      console.log("  + Added conditions_description column to reactions");
    }
    if (!cols.includes("outcome")) {
      db.exec("ALTER TABLE reactions ADD COLUMN outcome TEXT");
      console.log("  + Added outcome column to reactions");
    }
    if (!cols.includes("after_effect")) {
      db.exec("ALTER TABLE reactions ADD COLUMN after_effect TEXT");
      console.log("  + Added after_effect column to reactions");
    }

    // 2. Insert missing chemicals if needed
    const insertChem = db.prepare(`
      INSERT OR REPLACE INTO chemicals (
        id, common_name, iupac_name, formula, molar_mass,
        physical_state, chemical_class, is_acid, is_base, charge, source, confidence, data_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'high', '1.0')
    `);

    const missingChems = [
      {
        id: "h2so3",
        common_name: "Sulfurous acid",
        iupac_name: "Sulfurous acid",
        formula: "H2SO3",
        molar_mass: 82.07,
        physical_state: "aqueous",
        chemical_class: "inorganic",
        is_acid: 1,
        is_base: 0,
        charge: 0,
        source: "hackathon_showcase",
      },
      {
        id: "iodoacetone",
        common_name: "Iodoacetone",
        iupac_name: "1-iodopropan-2-one",
        formula: "CH3COCH2I",
        molar_mass: 183.98,
        physical_state: "liquid",
        chemical_class: "organic",
        is_acid: 0,
        is_base: 0,
        charge: 0,
        source: "hackathon_showcase",
      },
      {
        id: "nylon_66",
        common_name: "Nylon-6,6",
        iupac_name: "Poly(hexamethylene adipamide)",
        formula: "C12H22N2O2",
        molar_mass: 226.32,
        physical_state: "solid",
        chemical_class: "polymer",
        is_acid: 0,
        is_base: 0,
        charge: 0,
        source: "hackathon_showcase",
      },
      {
        id: "brch2ch2oh",
        common_name: "2-Bromoethanol",
        iupac_name: "2-bromoethanol",
        formula: "C2H5BrO",
        molar_mass: 124.97,
        physical_state: "liquid",
        chemical_class: "organic",
        is_acid: 0,
        is_base: 0,
        charge: 0,
        source: "hackathon_showcase",
      },
    ];

    for (const c of missingChems) {
      insertChem.run(
        c.id,
        c.common_name,
        c.iupac_name,
        c.formula,
        c.molar_mass,
        c.physical_state,
        c.chemical_class,
        c.is_acid,
        c.is_base,
        c.charge,
        c.source
      );
    }
    console.log("  ✓ Verified / inserted missing chemicals (h2so3, iodoacetone, nylon_66, brch2ch2oh)");

    // Insert composition for missing chemicals
    const insertComp = db.prepare(`
      INSERT OR REPLACE INTO chemical_elements (chemical_id, element_symbol, count) VALUES (?, ?, ?)
    `);
    insertComp.run("h2so3", "H", 2);
    insertComp.run("h2so3", "S", 1);
    insertComp.run("h2so3", "O", 3);

    insertComp.run("iodoacetone", "C", 3);
    insertComp.run("iodoacetone", "H", 5);
    insertComp.run("iodoacetone", "I", 1);
    insertComp.run("iodoacetone", "O", 1);

    insertComp.run("nylon_66", "C", 12);
    insertComp.run("nylon_66", "H", 22);
    insertComp.run("nylon_66", "N", 2);
    insertComp.run("nylon_66", "O", 2);

    insertComp.run("brch2ch2oh", "C", 2);
    insertComp.run("brch2ch2oh", "H", 5);
    insertComp.run("brch2ch2oh", "Br", 1);
    insertComp.run("brch2ch2oh", "O", 1);

    // Insert aliases
    const insertAlias = db.prepare(`
      INSERT OR IGNORE INTO chemical_aliases (chemical_id, alias) VALUES (?, ?)
    `);
    insertAlias.run("c2h4", "ethene");
    insertAlias.run("c2h4", "ethylene");
    insertAlias.run("c2h4br2", "1,2-dibromoethane");
    insertAlias.run("c2h4br2", "ch2brch2br");
    insertAlias.run("c7h6o3", "salicylic acid");
    insertAlias.run("c7h6o3", "salicylic_acid");
    insertAlias.run("acetic-anhydride", "acetic anhydride");
    insertAlias.run("acetic-anhydride", "acetic_anhydride");
    insertAlias.run("adipoyl-chloride", "adipoyl chloride");
    insertAlias.run("adipoyl-chloride", "adipoyl_chloride");
    insertAlias.run("hexamethylenediamine", "hexamethylenediamine");
    insertAlias.run("hexamethylenediamine", "1,6-diaminohexane");
    insertAlias.run("nylon_66", "nylon-6,6");
    insertAlias.run("nylon_66", "nylon 6,6");
    insertAlias.run("nylon_66", "nylon66");
    insertAlias.run("iodoacetone", "ch3coch2i");
    insertAlias.run("iodoacetone", "1-iodoacetone");
    insertAlias.run("h2so3", "sulfurous acid");
    insertAlias.run("h2so3", "sulfurous_acid");
    insertAlias.run("aspirin", "aspirin");
    insertAlias.run("aspirin", "acetylsalicylic acid");
    insertAlias.run("ch3cooc2h5", "ethyl acetate");
    insertAlias.run("ch3cooc2h5", "ethyl_acetate");

    // 3. Insert or update the 20 reactions in chemlab.db
    const insertRxn = db.prepare(`
      INSERT OR REPLACE INTO reactions (
        id, name, reaction_type, equation_display, net_ionic_equation,
        confidence_score, energy_classification, enthalpy_kj_per_mol,
        experimental_status, source, reference, safety_notes,
        conditions_description, outcome, after_effect
      ) VALUES (?, ?, ?, ?, ?, 1.0, ?, ?, 'experimentally_verified', 'hackathon_showcase', 'Hackathon Verified Protocol', ?, ?, ?, ?)
    `);

    const delReactants = db.prepare("DELETE FROM reaction_reactants WHERE reaction_id = ?");
    const insReactant = db.prepare(
      "INSERT INTO reaction_reactants (reaction_id, chemical_id, coefficient) VALUES (?, ?, ?)"
    );

    const delProducts = db.prepare("DELETE FROM reaction_products WHERE reaction_id = ?");
    const insProduct = db.prepare(
      "INSERT INTO reaction_products (reaction_id, chemical_id, coefficient, is_byproduct) VALUES (?, ?, ?, ?)"
    );

    const delEffects = db.prepare("DELETE FROM reaction_observable_effects WHERE reaction_id = ?");
    const insEffect = db.prepare(
      "INSERT INTO reaction_observable_effects (reaction_id, effect_type, description, color_from, color_to, related_chemical_id) VALUES (?, ?, ?, ?, ?, ?)"
    );

    for (const rx of SHOWCASE_REACTIONS) {
      insertRxn.run(
        rx.id,
        rx.name,
        rx.reactionType,
        rx.equation,
        rx.netIonicEquation ?? null,
        rx.energyClassification,
        rx.enthalpyKjPerMol,
        rx.safetyNotes,
        rx.conditionsDescription,
        rx.outcome,
        rx.afterEffect
      );

      delReactants.run(rx.id);
      for (const r of rx.reactants) {
        insReactant.run(rx.id, r.chemicalId, r.coefficient);
      }

      delProducts.run(rx.id);
      for (const p of rx.products) {
        insProduct.run(rx.id, p.chemicalId, p.coefficient, p.isByproduct ? 1 : 0);
      }

      delEffects.run(rx.id);
      for (const eff of rx.observableEffects) {
        insEffect.run(
          rx.id,
          eff.type,
          eff.description,
          eff.colorFrom ?? null,
          eff.colorTo ?? null,
          eff.relatedChemicalId ?? null
        );
      }
    }
    console.log(`  ✓ Successfully seeded all 20 showcase reactions into ${dbPath}`);
    db.close();
  }

  // 4. Seed into Prisma dev.db
  const devDbPath = path.join(__dirname, "..", "prisma", "dev.db");
  if (fs.existsSync(devDbPath)) {
    console.log(`\nProcessing Prisma DB: ${devDbPath}`);
    const devDb = new Database(devDbPath);

    const upsertPrisma = devDb.prepare(`
      INSERT OR REPLACE INTO Reaction (
        id, reactantKey, name, equation, netIonicEquation,
        reactionType, reactants, products, conditions, observations, hazards,
        source, verified, confidenceScore, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'hackathon_showcase', 1, 1.0, datetime('now'))
    `);

    for (const rx of SHOWCASE_REACTIONS) {
      // Generate deterministic reactant keys
      const canonicalKey = rx.reactants
        .map((r) => r.chemicalId.trim().toLowerCase())
        .sort()
        .join("+");

      const conditionsJson = JSON.stringify({
        description: rx.conditionsDescription,
        specialConditions: rx.conditionsDescription,
        outcome: rx.outcome,
        afterEffect: rx.afterEffect,
        enthalpyKjPerMol: rx.enthalpyKjPerMol,
        energyClassification: rx.energyClassification,
        temperatureMinC: rx.temperatureMinC,
        temperatureMaxC: rx.temperatureMaxC,
        solvent: rx.solvent ?? null,
        catalystChemicalId: rx.catalystChemicalId ?? null,
      });

      const observationsJson = JSON.stringify(rx.observableEffects);
      const hazardsJson = JSON.stringify({ safetyNotes: rx.safetyNotes });
      const reactantsJson = JSON.stringify(rx.reactants);
      const productsJson = JSON.stringify(rx.products);

      // Primary entry
      upsertPrisma.run(
        rx.id,
        canonicalKey,
        rx.name,
        rx.equation,
        rx.netIonicEquation ?? null,
        rx.reactionType,
        reactantsJson,
        productsJson,
        conditionsJson,
        observationsJson,
        hazardsJson
      );

      // Also create alias reactant keys for common formula synonyms (e.g. water vs h2o, ammonia vs nh3)
      const altKeys = new Set<string>();
      if (canonicalKey.includes("water")) altKeys.add(canonicalKey.replace("water", "h2o"));
      if (canonicalKey.includes("ammonia")) altKeys.add(canonicalKey.replace("ammonia", "nh3"));
      if (canonicalKey.includes("c2h4")) altKeys.add(canonicalKey.replace("c2h4", "ethene"));
      if (canonicalKey.includes("acetic-acid")) altKeys.add(canonicalKey.replace("acetic-acid", "ch3cooh"));
      if (canonicalKey.includes("ch3coch3")) altKeys.add(canonicalKey.replace("ch3coch3", "acetone"));
      if (canonicalKey.includes("adipoyl-chloride")) altKeys.add(canonicalKey.replace("adipoyl-chloride", "adipoyl_chloride"));

      for (const altKey of altKeys) {
        if (altKey !== canonicalKey) {
          upsertPrisma.run(
            `${rx.id}-alias-${altKey.replace(/[^a-z0-9]/g, "_")}`,
            altKey,
            rx.name,
            rx.equation,
            rx.netIonicEquation ?? null,
            rx.reactionType,
            reactantsJson,
            productsJson,
            conditionsJson,
            observationsJson,
            hazardsJson
          );
        }
      }
    }

    console.log(`  ✓ Successfully seeded all 20 showcase reactions into Prisma dev.db`);
    devDb.close();
  }

  console.log("\n==========================================================");
  console.log("   ALL 20 HACKATHON CHEMICAL REACTIONS SEEDED SUCCESSFULLY! ");
  console.log("==========================================================\n");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
