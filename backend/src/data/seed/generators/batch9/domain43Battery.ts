// Domain 43: Advanced Battery Materials, Solid-State Electrolytes & Energy Storage (100 reactions)
import type { ReactionDefinition } from "./types.js";

export const DOMAIN_43_REACTIONS: ReactionDefinition[] = [
  // 1-10: Solid-State Electrolyte Syntheses (Garnet, NASICON, Argyrodite, Perovskite)
  {
    id: "batt-001-llzo-cubic-garnet-synthesis",
    name: "Solid-state synthesis of cubic garnet Li7La3Zr2O12 (LLZO) electrolyte",
    reactants: ["li2co3", "la2o3", "zro2"],
    products: ["li7la3zr2o12", "co2"],
    enthalpyKjPerMol: 245,
    reactionType: "synthesis",
    description: "High-temperature calcination (900-1150 °C) producing cubic garnet Li7La3Zr2O12 solid-state electrolyte with high ionic conductivity (>1 mS/cm).",
    observableEffects: [
      { type: "temperature_increase", description: "High-temperature solid-state firing with continuous effervescence of CO2 gas" },
      { type: "gas_evolution", description: "Carbon dioxide release during carbonate decomposition", relatedChemicalId: "co2" }
    ],
    solvent: "solid_state",
    tempMin: 900,
    tempMax: 1150
  },
  {
    id: "batt-002-latp-nasicon-calcination",
    name: "NASICON-type Li1.3Al0.3Ti1.7(PO4)3 (LATP) solid electrolyte calcination",
    reactants: ["li2co3", "al2o3", "tio2", "nh4h2po4"],
    products: ["li13al03ti17p3o12", "co2", "nh3", "water"],
    enthalpyKjPerMol: 310,
    reactionType: "synthesis",
    description: "Solid-state reaction yielding air-stable NASICON-structured Li1.3Al0.3Ti1.7(PO4)3 glass-ceramic solid electrolyte for all-solid-state lithium batteries.",
    observableEffects: [
      { type: "gas_evolution", description: "Evolution of ammonia and carbon dioxide off-gases during phosphate condensation" },
      { type: "phase_change", description: "White precursor powder sinters into dense ceramic pellet", colorTo: "#FFFFFF" }
    ],
    tempMin: 800,
    tempMax: 1000
  },
  {
    id: "batt-003-li6ps5cl-argyrodite-synthesis",
    name: "Mechanochemical synthesis of Li6PS5Cl lithium argyrodite solid electrolyte",
    reactants: ["li2s", "p2s5", "licl"],
    products: ["li6ps5cl"],
    enthalpyKjPerMol: -85,
    reactionType: "synthesis",
    description: "High-energy ball-milling and annealing of Li2S, P2S5, and LiCl yielding superionic argyrodite Li6PS5Cl (ionic conductivity ~2-3 mS/cm at room temperature).",
    observableEffects: [
      { type: "color_change", description: "Yellowish powder converts into pale grey argyrodite crystalline powder", colorFrom: "#FEF08A", colorTo: "#E2E8F0" }
    ],
    tempMin: 200,
    tempMax: 550
  },
  {
    id: "batt-004-li3ps4-beta-electrolyte-solution",
    name: "Liquid-phase synthesis of beta-Li3PS4 solid electrolyte from Li2S and P2S5",
    reactants: ["li2s", "p2s5"],
    products: ["li3ps4"],
    enthalpyKjPerMol: -112,
    reactionType: "synthesis",
    description: "Solvent-assisted complexation of lithium sulfide and phosphorus pentasulfide in ethyl acetate/THF yielding nanoporous beta-Li3PS4 solid electrolyte.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of microcrystalline beta-Li3PS4 from organic solution", colorTo: "#FFFFFF" }
    ],
    solvent: "ethyl_acetate",
    tempMin: 20,
    tempMax: 140
  },
  {
    id: "batt-005-li7p3s11-glass-ceramic",
    name: "High-conductivity Li7P3S11 glass-ceramic electrolyte crystallization",
    reactants: ["li2s", "p2s5"],
    products: ["li7p3s11"],
    enthalpyKjPerMol: -135,
    reactionType: "synthesis",
    description: "Stoichiometric reaction of 70Li2S·30P2S5 followed by heat treatment at 280 °C yielding triclinic Li7P3S11 with ionic conductivity reaching 3.2 mS/cm.",
    observableEffects: [
      { type: "phase_change", description: "Glassy precursor crystallizes into high-conductivity crystalline phase" }
    ],
    tempMin: 260,
    tempMax: 300
  },
  {
    id: "batt-006-li3incl6-halide-electrolyte",
    name: "Mechanochemical synthesis of Li3InCl6 halide solid electrolyte",
    reactants: ["licl", "incl3"],
    products: ["li3incl6"],
    enthalpyKjPerMol: -42,
    reactionType: "synthesis",
    description: "Synthesis of high-voltage oxidation-resistant (up to 4.5 V vs Li/Li+) lithium indium chloride halide solid electrolyte for 4V-class solid-state cells.",
    observableEffects: [
      { type: "phase_change", description: "Fine white crystalline halide powder formed upon mechanochemical milling", colorTo: "#FFFFFF" }
    ],
    tempMin: 25,
    tempMax: 200
  },
  {
    id: "batt-007-li3sccl6-halide-electrolyte",
    name: "Synthesis of Li3ScCl6 superionic halide electrolyte",
    reactants: ["licl", "sccl3"],
    products: ["li3sccl6"],
    enthalpyKjPerMol: -48,
    reactionType: "synthesis",
    description: "Reaction of anhydrous lithium chloride and scandium chloride producing trigonal Li3ScCl6 solid electrolyte with room-temperature conductivity of 3.0 mS/cm.",
    observableEffects: [
      { type: "phase_change", description: "Formation of uniform white microcrystalline powder", colorTo: "#FFFFFF" }
    ],
    tempMin: 25,
    tempMax: 260
  },
  {
    id: "batt-008-llto-perovskite-synthesis",
    name: "Perovskite Li0.33La0.56TiO3 (LLTO) solid electrolyte sintering",
    reactants: ["li2co3", "la2o3", "tio2"],
    products: ["li033la056tio3", "co2"],
    enthalpyKjPerMol: 198,
    reactionType: "synthesis",
    description: "Perovskite lithium lanthanum titanate solid electrolyte synthesis via high-temperature reaction with bulk ionic conductivity up to 10^-3 S/cm.",
    observableEffects: [
      { type: "temperature_increase", description: "Endothermic decarbonation sintering yielding ivory-white ceramic body", colorTo: "#FEF9C3" },
      { type: "gas_evolution", description: "CO2 release during carbonate thermal conversion" }
    ],
    tempMin: 1100,
    tempMax: 1350
  },
  {
    id: "batt-009-liclo4-peo-polymer-complexation",
    name: "Lithium perchlorate / polyethylene oxide (PEO) polymer electrolyte complexation",
    reactants: ["liclo4", "ethylene_oxide_oligomer"],
    products: ["liclo4_peo_complex"],
    enthalpyKjPerMol: -62,
    reactionType: "synthesis",
    description: "Dissolution and coordination of lithium cations by ether oxygen atoms in poly(ethylene oxide) matrix forming flexible solid polymer electrolyte membrane.",
    observableEffects: [
      { type: "phase_change", description: "Viscous clear solution casts into elastic translucent membrane", colorTo: "#F8FAFC" }
    ],
    solvent: "acetonitrile",
    tempMin: 20,
    tempMax: 60
  },
  {
    id: "batt-010-litfsi-peo-salt-dissolution",
    name: "Lithium bis(trifluoromethanesulfonyl)imide (LiTFSI) coordination in PEO",
    reactants: ["litfsi", "ethylene_oxide_oligomer"],
    products: ["litfsi_peo_complex"],
    enthalpyKjPerMol: -78,
    reactionType: "synthesis",
    description: "Complexation of highly dissociated LiTFSI salt with PEO ether chains yielding flexible plasticized solid polymer electrolyte with reduced crystallinity.",
    observableEffects: [
      { type: "phase_change", description: "Formation of flexible, free-standing solid polymer film with high plastic conductivity" }
    ],
    tempMin: 25,
    tempMax: 70
  },

  // 11-25: Cathode Active Materials (LFP, LCO, NMC, LMO, LMNO, LVP, S-cathodes)
  {
    id: "batt-011-lifepo4-hydrothermal-synthesis",
    name: "Hydrothermal synthesis of olivine LiFePO4 (LFP) cathode material",
    reactants: ["lioh", "feso4", "h3po4"],
    products: ["lifepo4", "li2so4", "water"],
    enthalpyKjPerMol: -185,
    reactionType: "synthesis",
    description: "Hydrothermal precipitation of phase-pure olivine LiFePO4 nanocrystals with safe flat 3.45 V discharge plateau and high cycle stability.",
    observableEffects: [
      { type: "precipitation", description: "Formation of greyish-green microcrystalline LiFePO4 precipitate", colorTo: "#86EFAC" },
      { type: "temperature_increase", description: "Exothermic acid-base neutralization and coordination" }
    ],
    solvent: "water",
    tempMin: 120,
    tempMax: 180
  },
  {
    id: "batt-012-licoo2-commercial-synthesis",
    name: "Solid-state calcination of commercial LiCoO2 (LCO) cathode",
    reactants: ["li2co3", "co3o4", "o2"],
    products: ["licoo2", "co2"],
    enthalpyKjPerMol: -142,
    reactionType: "synthesis",
    description: "Oxidative calcination at 850-900 °C synthesizing layered hexagonal LiCoO2 cathode with high tap density for consumer electronics cells.",
    observableEffects: [
      { type: "color_change", description: "Black cobalt oxide and white lithium carbonate form jet-black layered LiCoO2 powder", colorFrom: "#475569", colorTo: "#0F172A" },
      { type: "gas_evolution", description: "CO2 gas evolution during oxidizing calcination" }
    ],
    tempMin: 800,
    tempMax: 950
  },
  {
    id: "batt-013-limn2o4-spinel-calcination",
    name: "Solid-state synthesis of spinel LiMn2O4 (LMO) cathode material",
    reactants: ["li2co3", "mno2"],
    products: ["limn2o4", "co2", "o2"],
    enthalpyKjPerMol: 88,
    reactionType: "synthesis",
    description: "Thermal reaction yielding 4V-class cubic spinel LiMn2O4 with three-dimensional lithium-diffusion pathways and high rate capability.",
    observableEffects: [
      { type: "phase_change", description: "Transition to dark grey spinel microcrystalline powder", colorTo: "#334155" },
      { type: "gas_evolution", description: "Egress of CO2 and oxygen off-gases during lattice rearrangement" }
    ],
    tempMin: 700,
    tempMax: 850
  },
  {
    id: "batt-014-linio2-layered-oxide-synthesis",
    name: "Direct synthesis of layered LiNiO2 (LNO) high-nickel cathode",
    reactants: ["lioh", "nio", "o2"],
    products: ["linio2", "water"],
    enthalpyKjPerMol: -195,
    reactionType: "synthesis",
    description: "Pure oxygen calcination at 700 °C synthesizing layered LiNiO2 delivering high reversible specific capacity (>220 mAh/g).",
    observableEffects: [
      { type: "color_change", description: "Green nickel oxide oxidizes into dark black layered LiNiO2", colorFrom: "#15803D", colorTo: "#020617" }
    ],
    tempMin: 650,
    tempMax: 750
  },
  {
    id: "batt-015-nmc-hydroxide-precursor-coprecipitation",
    name: "Continuous co-precipitation of Ni-Co-Mn ternary hydroxide precursor",
    reactants: ["niso4", "coso4", "mnso4", "naoh"],
    products: ["ni08co01mn01_oh2", "na2so4"],
    enthalpyKjPerMol: -160,
    reactionType: "precipitation",
    description: "Controlled ammonia-buffered hydroxide co-precipitation yielding dense spherical Ni0.8Co0.1Mn0.1(OH)2 secondary particles with uniform compositional distribution.",
    observableEffects: [
      { type: "precipitation", description: "Rapid formation of dense brownish-tan spherical hydroxide precipitate", colorTo: "#A16207" },
      { type: "temperature_increase", description: "Exothermic double displacement neutralization" }
    ],
    solvent: "water",
    tempMin: 50,
    tempMax: 60
  },
  {
    id: "batt-016-nmc811-calcination-synthesis",
    name: "Lithiation and oxygen calcination of Ni-rich LiNi0.8Co0.1Mn0.1O2 (NMC-811)",
    reactants: ["ni08co01mn01_oh2", "lioh", "o2"],
    products: ["linmc811o2", "water"],
    enthalpyKjPerMol: -230,
    reactionType: "synthesis",
    description: "Calcination of co-precipitated precursor under pure O2 flux synthesizing layered NMC-811 cathode with high energy density for electric vehicle powertrains.",
    observableEffects: [
      { type: "color_change", description: "Tan precursor converts to lustrous black layered NMC-811 crystalline granules", colorFrom: "#A16207", colorTo: "#09090B" },
      { type: "phase_change", description: "Steam evolution during lithiation condensation" }
    ],
    tempMin: 700,
    tempMax: 800
  },
  {
    id: "batt-017-limn15ni05o4-spinel-synthesis",
    name: "Synthesis of high-voltage 5V spinel LiNi0.5Mn1.5O4 (LNMO)",
    reactants: ["li2co3", "nio", "mno2", "o2"],
    products: ["lini05mn15o4", "co2"],
    enthalpyKjPerMol: -110,
    reactionType: "synthesis",
    description: "Calcination at 850 °C producing cobalt-free high-voltage spinel LiNi0.5Mn1.5O4 with an operating potential of 4.7 V vs Li/Li+ via Ni2+/Ni4+ redox couple.",
    observableEffects: [
      { type: "gas_evolution", description: "CO2 release leaving dense grey-black high-voltage spinel particles", colorTo: "#1E293B" }
    ],
    tempMin: 800,
    tempMax: 900
  },
  {
    id: "batt-018-na3v2po43-nvp-cathode-synthesis",
    name: "Sol-gel synthesis of NASICON Na3V2(PO4)3 (NVP) cathode for sodium-ion cells",
    reactants: ["na2co3", "v2o5", "nh4h2po4", "carbon_active"],
    products: ["na3v2po43", "co2", "nh3", "water", "co"],
    enthalpyKjPerMol: 215,
    reactionType: "synthesis",
    description: "Carbothermal reduction and calcination synthesizing carbon-coated NASICON Na3V2(PO4)3 cathode displaying excellent 3.4 V sodium insertion stability.",
    observableEffects: [
      { type: "gas_evolution", description: "Evolution of CO, CO2, and NH3 gases leaving black carbon-coated NASICON powder", colorTo: "#18181B" }
    ],
    tempMin: 700,
    tempMax: 850
  },
  {
    id: "batt-019-nafeopo4-triphylite-synthesis",
    name: "Solid-state synthesis of maricite/triphylite NaFePO4 for sodium-ion batteries",
    reactants: ["naoh", "feso4", "h3po4"],
    products: ["nafepo4", "na2so4", "water"],
    enthalpyKjPerMol: -172,
    reactionType: "synthesis",
    description: "Direct chemical preparation of NaFePO4 olivine/maricite active cathode material for low-cost earth-abundant grid-scale sodium energy storage.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of pale green NaFePO4 powder", colorTo: "#BBF7D0" }
    ],
    solvent: "water",
    tempMin: 25,
    tempMax: 100
  },
  {
    id: "batt-020-lifemnpo4-lfmp-solid-solution",
    name: "Hydrothermal synthesis of mixed olivine LiFe0.5Mn0.5PO4 (LFMP)",
    reactants: ["lioh", "feso4", "mnso4", "h3po4"],
    products: ["life05mn05po4", "li2so4", "water"],
    enthalpyKjPerMol: -190,
    reactionType: "synthesis",
    description: "Solid-solution olivine LFMP cathode combining high 4.1 V Mn potential with stable 3.45 V Fe plateau for boosted energy density.",
    observableEffects: [
      { type: "precipitation", description: "Uniform light grey-green micro-precipitate formed in autoclave", colorTo: "#CBD5E1" }
    ],
    solvent: "water",
    tempMin: 150,
    tempMax: 200
  },
  {
    id: "batt-021-licoo2-chemical-delithiation",
    name: "Chemical delithiation of LiCoO2 with nitronium tetrafluoroborate",
    reactants: ["licoo2", "no2bf4"],
    products: ["coo2", "libf4", "no2"],
    enthalpyKjPerMol: -75,
    reactionType: "redox_other",
    description: "Topotactic chemical extraction of all lithium ions from LiCoO2 yielding metastable hexagonal CoO2 (O1 host phase).",
    observableEffects: [
      { type: "gas_evolution", description: "Brown toxic NO2 gas fumes evolved during deep oxidative delithiation", colorTo: "#78350F" },
      { type: "color_change", description: "LCO powder converts into deep bronze-black CoO2", colorFrom: "#0F172A", colorTo: "#451A03" }
    ],
    solvent: "acetonitrile",
    tempMin: 20,
    tempMax: 40
  },
  {
    id: "batt-022-lifepo4-chemical-delithiation-no2bf4",
    name: "Chemical oxidation of LiFePO4 to heterosite FePO4",
    reactants: ["lifepo4", "no2bf4"],
    products: ["fepo4", "libf4", "no2"],
    enthalpyKjPerMol: -92,
    reactionType: "redox_other",
    description: "Two-phase chemical delithiation producing fully oxidized heterosite FePO4 phase for phase-boundary kinetic studies.",
    observableEffects: [
      { type: "color_change", description: "Olive-grey LiFePO4 oxidizes to salmon-pink/tan heterosite FePO4 powder", colorFrom: "#94A3B8", colorTo: "#FBCFE8" },
      { type: "gas_evolution", description: "Pungent NO2 gas released", colorTo: "#92400E" }
    ],
    solvent: "acetonitrile",
    tempMin: 20,
    tempMax: 30
  },
  {
    id: "batt-023-fe3o4-conversion-lithium",
    name: "Conversion reaction of magnetite Fe3O4 with metallic lithium",
    reactants: ["fe3o4", "li"],
    products: ["fe", "li2o"],
    enthalpyKjPerMol: -620,
    reactionType: "redox_other",
    description: "High-capacity conversion discharge reaction reducing iron oxide into metallic Fe0 nanograins embedded in a Li2O matrix (delivering 926 mAh/g).",
    observableEffects: [
      { type: "temperature_increase", description: "Intensely exothermic solid-state multi-electron reduction" },
      { type: "phase_change", description: "Black spinel converted into highly dispersed metallic iron nanoparticles" }
    ],
    tempMin: 25,
    tempMax: 100
  },
  {
    id: "batt-024-co3o4-conversion-lithium",
    name: "Conversion reaction of cobalt oxide Co3O4 with lithium",
    reactants: ["co3o4", "li"],
    products: ["co", "li2o"],
    enthalpyKjPerMol: -780,
    reactionType: "redox_other",
    description: "Electrochemical conversion of Co3O4 yielding ultrafine Co nanoparticles in Li2O delivering theoretical capacity of 890 mAh/g.",
    observableEffects: [
      { type: "temperature_increase", description: "Strongly exothermic multi-electron reduction" },
      { type: "phase_change", description: "Formation of superparamagnetic Co metal nanocomposite" }
    ],
    tempMin: 25,
    tempMax: 100
  },
  {
    id: "batt-025-cuo-conversion-lithium",
    name: "Conversion reaction of copper(II) oxide CuO with lithium",
    reactants: ["cuo", "li"],
    products: ["cu", "li2o"],
    enthalpyKjPerMol: -340,
    reactionType: "redox_other",
    description: "Two-electron conversion reduction of CuO to metallic copper nanocrystals and lithium oxide at ~1.4 V plateau.",
    observableEffects: [
      { type: "color_change", description: "Black CuO reduces into reddish-metallic copper nanoparticles", colorFrom: "#020617", colorTo: "#B45309" }
    ],
    tempMin: 25,
    tempMax: 80
  },

  // 26-40: Anode Active Materials & Intercalation (LTO, Silicon, Hard Carbon, Sn, Ge)
  {
    id: "batt-026-li4ti5o12-lto-spinel-synthesis",
    name: "Solid-state synthesis of zero-strain spinel Li4Ti5O12 (LTO) anode",
    reactants: ["li2co3", "tio2"],
    products: ["li4ti5o12", "co2"],
    enthalpyKjPerMol: 165,
    reactionType: "synthesis",
    description: "Calcination at 800 °C yielding 'zero-strain' spinel Li4Ti5O12 anode with flat 1.55 V plateau, completely eliminating lithium dendrite risks.",
    observableEffects: [
      { type: "gas_evolution", description: "CO2 release leaving pure white crystalline spinel Li4Ti5O12 powder", colorTo: "#FFFFFF" }
    ],
    tempMin: 750,
    tempMax: 850
  },
  {
    id: "batt-027-lto-lithiation-rocksalt-transition",
    name: "Electrochemical lithiation of Li4Ti5O12 to rocksalt Li7Ti5O12",
    reactants: ["li4ti5o12", "li"],
    products: ["li7ti5o12"],
    enthalpyKjPerMol: -225,
    reactionType: "synthesis",
    description: "Reversible two-phase transition of spinel Li4Ti5O12 [Li]8a[Ti5Li]16dO12 into rocksalt [Li2]16c[Ti5Li]16dO12 at 1.55 V vs Li/Li+.",
    observableEffects: [
      { type: "color_change", description: "Insulating white LTO becomes dark blue-black electrically conducting Li7Ti5O12", colorFrom: "#FFFFFF", colorTo: "#1E3A8A" }
    ],
    tempMin: 20,
    tempMax: 60
  },
  {
    id: "batt-028-silicon-initial-lithiation-li15si4",
    name: "Electrochemical lithiation of silicon to crystalline Li15Si4",
    reactants: ["si", "li"],
    products: ["li15si4"],
    enthalpyKjPerMol: -410,
    reactionType: "synthesis",
    description: "Deep room-temperature electrochemical alloying of crystalline silicon to Li15Si4 phase delivering massive theoretical capacity of 3579 mAh/g.",
    observableEffects: [
      { type: "phase_change", description: "Silicon particles expand ~300% in volume forming metallic lithium silicide alloy" }
    ],
    tempMin: 20,
    tempMax: 50
  },
  {
    id: "batt-029-sio-disproportionation-nanocomposite",
    name: "Thermal disproportionation of silicon monoxide (SiO) into Si/SiO2",
    reactants: ["sio"],
    products: ["si", "sio2"],
    enthalpyKjPerMol: -78,
    reactionType: "decomposition",
    description: "High-temperature disproportionation at 900-1000 °C converting amorphous SiO into interconnected ultrafine Si nanodomains embedded in resilient SiO2 buffer matrix.",
    observableEffects: [
      { type: "phase_change", description: "Homogeneous brown glass phase separates into nanostructured Si/SiO2 composite" }
    ],
    tempMin: 900,
    tempMax: 1050
  },
  {
    id: "batt-030-sio2-electrochemical-lithiation",
    name: "Initial irreversible lithiation of SiO2 buffer matrix",
    reactants: ["sio2", "li"],
    products: ["li4sio4", "si"],
    enthalpyKjPerMol: -290,
    reactionType: "redox_other",
    description: "Initial cycle activation of SiO2 forming electrochemically inert lithium silicate buffer (Li4SiO4) and electrochemically active silicon nanoclusters.",
    observableEffects: [
      { type: "temperature_increase", description: "Highly exothermic first-cycle irreversible matrix lithiation" }
    ],
    tempMin: 20,
    tempMax: 60
  },
  {
    id: "batt-031-tin-lithiation-li22sn5",
    name: "Alloying of metallic tin anode to Li22Sn5 intermetallic phase",
    reactants: ["sn", "li"],
    products: ["li22sn5"],
    enthalpyKjPerMol: -380,
    reactionType: "synthesis",
    description: "Complete room-temperature electrochemical alloying of tin anode to Li22Sn5 yielding 994 mAh/g capacity.",
    observableEffects: [
      { type: "phase_change", description: "Lustrous silver tin metal swells into brittle intermetallic lithium-tin alloy phase" }
    ],
    tempMin: 20,
    tempMax: 60
  },
  {
    id: "batt-032-germanium-lithiation-li15ge4",
    name: "Electrochemical alloying of germanium to Li15Ge4",
    reactants: ["ge", "li"],
    products: ["li15ge4"],
    enthalpyKjPerMol: -395,
    reactionType: "synthesis",
    description: "Fast-diffusing germanium anode lithiation to Li15Ge4 (diffusivity 400x higher than silicon, delivering 1384 mAh/g capacity).",
    observableEffects: [
      { type: "phase_change", description: "Volume expansion of crystalline Ge into Li15Ge4 alloy" }
    ],
    tempMin: 20,
    tempMax: 50
  },
  {
    id: "batt-033-graphite-kc8-potassium-intercalation",
    name: "Chemical intercalation of potassium into graphite forming stage-1 KC8",
    reactants: ["graphite", "k"],
    products: ["kc8"],
    enthalpyKjPerMol: -115,
    reactionType: "synthesis",
    description: "Direct molten potassium intercalation into graphite under argon yielding golden-bronze stage-1 graphite intercalation compound KC8 for potassium-ion batteries.",
    observableEffects: [
      { type: "color_change", description: "Black graphite turns into shiny metallic golden-bronze KC8 compound", colorFrom: "#1E293B", colorTo: "#D97706" }
    ],
    tempMin: 65,
    tempMax: 120
  },
  {
    id: "batt-034-graphite-lic6-stage1-formation",
    name: "Stage-1 electrochemical intercalation of lithium into graphite (LiC6)",
    reactants: ["graphite", "li"],
    products: ["lic6"],
    enthalpyKjPerMol: -92,
    reactionType: "synthesis",
    description: "Full stage-1 intercalation of lithium into graphite basal planes at 0.05 V vs Li/Li+ yielding characteristic golden LiC6 with 372 mAh/g theoretical capacity.",
    observableEffects: [
      { type: "color_change", description: "Grey-black graphite transitions through blue (stage 2) to brilliant gold (stage 1 LiC6)", colorFrom: "#334155", colorTo: "#EAB308" }
    ],
    tempMin: 20,
    tempMax: 45
  },
  {
    id: "batt-035-hard-carbon-sodium-insertion",
    name: "Sodium quasi-metallic nanopore filling in hard carbon",
    reactants: ["hard_carbon", "na"],
    products: ["na_hard_carbon_inserted"],
    enthalpyKjPerMol: -68,
    reactionType: "synthesis",
    description: "Low-potential plateau (<0.1 V) pore-filling of sodium clusters inside non-graphitizable hard carbon turbostratic nanopores (delivering ~300 mAh/g).",
    observableEffects: [
      { type: "phase_change", description: "Smooth sodium storage without destructive exfoliation" }
    ],
    tempMin: 20,
    tempMax: 50
  },
  {
    id: "batt-036-tis2-intercalation-litis2",
    name: "Lithium intercalation into layered titanium disulfide (TiS2)",
    reactants: ["tis2", "li"],
    products: ["litis2"],
    enthalpyKjPerMol: -205,
    reactionType: "synthesis",
    description: "Single-phase topotactic insertion of lithium into van der Waals gaps of layered TiS2 host (Whittingham's foundational 1976 rechargeable cell).",
    observableEffects: [
      { type: "color_change", description: "Golden-amber TiS2 platelets darken into metallic purple-black LiTiS2", colorFrom: "#B45309", colorTo: "#312E81" }
    ],
    tempMin: 20,
    tempMax: 50
  },
  {
    id: "batt-037-mos2-conversion-lithium",
    name: "Multi-electron conversion reduction of molybdenum disulfide (MoS2)",
    reactants: ["mos2", "li"],
    products: ["mo", "li2s"],
    enthalpyKjPerMol: -480,
    reactionType: "redox_other",
    description: "Four-electron reduction of 2D MoS2 nanosheets into ultrafine Mo metal nanodots embedded in Li2S delivering 670 mAh/g.",
    observableEffects: [
      { type: "temperature_increase", description: "Exothermic conversion of 2D layered chalcogenide" }
    ],
    tempMin: 25,
    tempMax: 80
  },
  {
    id: "batt-038-antimony-sodiated-na3sb",
    name: "Alloying of metallic antimony (Sb) with sodium to Na3Sb",
    reactants: ["sb", "na"],
    products: ["na3sb"],
    enthalpyKjPerMol: -260,
    reactionType: "synthesis",
    description: "Electrochemical sodiation of microparticulate antimony forming hexagonal Na3Sb alloy with low overpotential and high volumetric capacity (660 mAh/g).",
    observableEffects: [
      { type: "phase_change", description: "Lustrous grey antimony converts into brittle dark grey intermetallic alloy", colorTo: "#374151" }
    ],
    tempMin: 20,
    tempMax: 60
  },
  {
    id: "batt-039-bismuth-sodiated-na3bi",
    name: "Electrochemical alloying of bismuth with sodium to Na3Bi",
    reactants: ["bi", "na"],
    products: ["na3bi"],
    enthalpyKjPerMol: -210,
    reactionType: "synthesis",
    description: "Alloying of high-density bismuth with sodium forming topological Dirac semimetal Na3Bi phase with high tap density.",
    observableEffects: [
      { type: "phase_change", description: "Volumetric expansion forming intermetallic sodium bismuthide" }
    ],
    tempMin: 20,
    tempMax: 60
  },
  {
    id: "batt-040-red-phosphorus-sodiation-na3p",
    name: "Electrochemical sodiation of red phosphorus to Na3P",
    reactants: ["p_red", "na"],
    products: ["na3p"],
    enthalpyKjPerMol: -315,
    reactionType: "synthesis",
    description: "Three-electron sodiation of phosphorus yielding cubic Na3P with ultra-high theoretical capacity of 2596 mAh/g for advanced Na-ion cells.",
    observableEffects: [
      { type: "color_change", description: "Red phosphorus converts into dark greenish-black sodium phosphide", colorFrom: "#DC2626", colorTo: "#064E3B" }
    ],
    tempMin: 25,
    tempMax: 60
  },

  // 41-55: Electrolytes, Solvents, SEI Formation & Additives
  {
    id: "batt-041-lipf6-thermal-decomposition",
    name: "Thermal dissociation of lithium hexafluorophosphate (LiPF6)",
    reactants: ["lipf6"],
    products: ["lif", "pf5"],
    enthalpyKjPerMol: 95,
    reactionType: "decomposition",
    description: "Equilibrium thermal dissociation of LiPF6 above 70 °C generating toxic Lewis acidic PF5 gas and solid LiF.",
    observableEffects: [
      { type: "gas_evolution", description: "Pungent Lewis-acidic PF5 gas fumes released", relatedChemicalId: "pf5" },
      { type: "precipitation", description: "Deposition of insoluble white LiF salt crystals", colorTo: "#FFFFFF" }
    ],
    tempMin: 70,
    tempMax: 120
  },
  {
    id: "batt-042-pf5-water-hydrolysis-hpo2f2",
    name: "Hydrolysis of phosphorus pentafluoride off-gas by trace moisture",
    reactants: ["pf5", "water"],
    products: ["hpo2f2", "hf"],
    enthalpyKjPerMol: -135,
    reactionType: "double_displacement",
    description: "Rapid parasitic moisture reaction generating corrosive hydrofluoric acid (HF) and difluorophosphoric acid (HPO2F2), triggering transition-metal dissolution.",
    observableEffects: [
      { type: "gas_evolution", description: "Corrosive etching fumes of HF and acid vapors", relatedChemicalId: "hf" }
    ],
    tempMin: 20,
    tempMax: 50
  },
  {
    id: "batt-043-ec-reduction-ledc-sei-formation",
    name: "Electrochemical reduction of ethylene carbonate (EC) to LEDC",
    reactants: ["ethylene_carbonate", "li"],
    products: ["lithium_ethylene_dicarbonate", "c2h4"],
    enthalpyKjPerMol: -320,
    reactionType: "redox_other",
    description: "Two-electron reductive ring opening of ethylene carbonate forming primary SEI passivating component lithium ethylene dicarbonate (LEDC) and ethylene gas.",
    observableEffects: [
      { type: "gas_evolution", description: "Effervescence of ethylene (C2H4) gas bubbles during initial formation cycle", relatedChemicalId: "c2h4" },
      { type: "precipitation", description: "Precipitation of compact, ionically conductive LEDC passivation film", colorTo: "#F8FAFC" }
    ],
    tempMin: 20,
    tempMax: 40
  },
  {
    id: "batt-044-vc-vinylene-carbonate-poly-sei",
    name: "Radical polymerization of vinylene carbonate (VC) additive",
    reactants: ["vinylene_carbonate"],
    products: ["poly_vinylene_carbonate"],
    enthalpyKjPerMol: -85,
    reactionType: "synthesis",
    description: "Sacrificial reductive polymerization of vinylene carbonate additive at 1.4 V vs Li/Li+ forming robust, flexible poly(VC) protective interphase.",
    observableEffects: [
      { type: "phase_change", description: "In-situ formation of thin, flexible polymeric protective surface coating" }
    ],
    tempMin: 20,
    tempMax: 50
  },
  {
    id: "batt-045-fec-decomposition-lif-sei",
    name: "Fluoroethylene carbonate (FEC) sacrificial reduction to LiF",
    reactants: ["fluoroethylene_carbonate", "li"],
    products: ["lif", "lithium_vinylene_dicarbonate", "h2"],
    enthalpyKjPerMol: -345,
    reactionType: "redox_other",
    description: "Reductive defluorination of FEC additive enriching SEI layer in protective nanocrystalline LiF to stabilize silicon and lithium metal anodes.",
    observableEffects: [
      { type: "precipitation", description: "Uniform deposition of dense, mechanically robust LiF-rich passivation layer", colorTo: "#FFFFFF" },
      { type: "gas_evolution", description: "Evolution of trace H2 gas", relatedChemicalId: "h2" }
    ],
    tempMin: 20,
    tempMax: 45
  },
  {
    id: "batt-046-libob-lithium-bis-oxalato-borate",
    name: "Synthesis of lithium bis(oxalato)borate (LiBOB) electrolyte salt",
    reactants: ["h3bo3", "oxalic_acid", "lioh"],
    products: ["libob", "water"],
    enthalpyKjPerMol: -150,
    reactionType: "synthesis",
    description: "Condensation synthesis of fluorine-free LiBOB salt known for building robust passivating films on high-voltage cathode surfaces.",
    observableEffects: [
      { type: "precipitation", description: "Crystallization of white high-purity LiBOB salt", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 60,
    tempMax: 100
  },
  {
    id: "batt-047-lidfp-difluorophosphate-synthesis",
    name: "Synthesis of lithium difluorophosphate (LiDFP) film-forming additive",
    reactants: ["lif", "pf5", "water"],
    products: ["lidfp", "hf"],
    enthalpyKjPerMol: -110,
    reactionType: "synthesis",
    description: "Preparation of commercial high-efficiency LiPO2F2 (LiDFP) additive that suppresses impedance growth and enhances low-temperature performance.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of pure white LiDFP crystalline additive", colorTo: "#FFFFFF" }
    ],
    tempMin: 25,
    tempMax: 80
  },
  {
    id: "batt-048-dmc-transesterification-emc",
    name: "Transesterification exchange of dimethyl carbonate and diethyl carbonate",
    reactants: ["dimethyl_carbonate", "diethyl_carbonate"],
    products: ["ethyl_methyl_carbonate"],
    enthalpyKjPerMol: -3.5,
    reactionType: "double_displacement",
    description: "Catalytic ester exchange in non-aqueous electrolytes balancing viscosity and dielectric permittivity in commercial EMC blends.",
    observableEffects: [
      { type: "phase_change", description: "Miscible clear colorless electrolyte solvent equilibrium" }
    ],
    solvent: "neat",
    tempMin: 20,
    tempMax: 80
  },
  {
    id: "batt-049-hf-lco-transition-metal-leaching",
    name: "Parasitic acidic leaching of cobalt from LiCoO2 cathode by trace HF",
    reactants: ["licoo2", "hf"],
    products: ["lif", "cof2", "water", "o2"],
    enthalpyKjPerMol: -260,
    reactionType: "redox_other",
    description: "Electrolyte degradation mechanism where trace HF acid leaches transition-metal cations, accelerating capacity fade and cross-contamination.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of resistive fluoride surface crust" },
      { type: "color_change", description: "Pinkish dissolved Co2+ ions cross over through separator", colorTo: "#FDA4AF" }
    ],
    tempMin: 25,
    tempMax: 60
  },
  {
    id: "batt-050-hf-lmo-manganese-disproportionation",
    name: "Hunter acid dissolution of spinel LiMn2O4 via Mn(III) disproportionation",
    reactants: ["limn2o4", "hf"],
    products: ["lif", "mnf2", "mno2", "water"],
    enthalpyKjPerMol: -215,
    reactionType: "redox_other",
    description: "Acidic attack driving Jahn-Teller active Mn3+ disproportionation into soluble Mn2+ and insoluble MnO2, driving elevated-temperature degradation.",
    observableEffects: [
      { type: "precipitation", description: "Formation of brown MnO2 residue and soluble manganese fluorides", colorTo: "#78350F" }
    ],
    tempMin: 30,
    tempMax: 55
  },
  {
    id: "batt-051-li-dendrite-corrosion-water",
    name: "Violent corrosion of lithium dendrites with trace aqueous contaminant",
    reactants: ["li", "water"],
    products: ["lioh", "h2"],
    enthalpyKjPerMol: -222,
    reactionType: "redox_other",
    description: "Highly exothermic corrosion of high-surface-area mossy lithium metal releasing combustible hydrogen gas.",
    observableEffects: [
      { type: "temperature_increase", description: "Rapid, violent thermal spike with sizzling" },
      { type: "gas_evolution", description: "Vigorous bubbling and effervescence of hydrogen gas", relatedChemicalId: "h2" }
    ],
    tempMin: 20,
    tempMax: 100
  },
  {
    id: "batt-052-co2-prepassivation-lithium-carbonate",
    name: "Controlled CO2 gas pre-passivation of lithium metal anode",
    reactants: ["li", "co2"],
    products: ["li2co3", "co"],
    enthalpyKjPerMol: -360,
    reactionType: "redox_other",
    description: "Controlled surface gas-treatment forming artificial, pinhole-free Li2CO3 protective skin preventing dendritic electrodeposition.",
    observableEffects: [
      { type: "color_change", description: "Silvery metallic lithium develops uniform matte-white passivating surface layer", colorFrom: "#E2E8F0", colorTo: "#FFFFFF" }
    ],
    tempMin: 20,
    tempMax: 100
  },
  {
    id: "batt-053-n2-nitridation-li3n-superionic-interphase",
    name: "Direct gas-phase nitridation of lithium metal to Li3N",
    reactants: ["li", "n2"],
    products: ["li3n"],
    enthalpyKjPerMol: -165,
    reactionType: "synthesis",
    description: "Room-temperature surface nitridation producing crystalline Li3N artificial SEI with superionic room-temperature conductivity (10^-3 S/cm).",
    observableEffects: [
      { type: "color_change", description: "Silvery lithium metal develops distinctive ruby-red to dark reddish-purple Li3N skin", colorFrom: "#E2E8F0", colorTo: "#881337" }
    ],
    tempMin: 20,
    tempMax: 150
  },
  {
    id: "batt-054-li-al-artificial-interphase",
    name: "Solid-state surface alloying of lithium foil with aluminium",
    reactants: ["li", "al"],
    products: ["lial"],
    enthalpyKjPerMol: -45,
    reactionType: "synthesis",
    description: "Mechanical contact alloying yielding ductile LiAl interphase layer guiding smooth, uniform lithium nucleation during fast charging.",
    observableEffects: [
      { type: "phase_change", description: "Surface transforms into matte grey intermetallic LiAl alloy layer", colorTo: "#94A3B8" }
    ],
    tempMin: 20,
    tempMax: 100
  },
  {
    id: "batt-055-li-in-solid-state-anode-formation",
    name: "Formation of Li-In reference alloy for solid-state battery testing",
    reactants: ["li", "in"],
    products: ["liin"],
    enthalpyKjPerMol: -62,
    reactionType: "synthesis",
    description: "Spontaneous room-temperature alloying of indium foil with lithium providing extremely stable 0.62 V vs Li/Li+ reference potential in solid cells.",
    observableEffects: [
      { type: "phase_change", description: "Soft indium metal alloys into stable uniform Li-In reference electrode" }
    ],
    tempMin: 20,
    tempMax: 40
  },

  // 56-70: Lithium-Sulfur Battery Reactions (Polysulfide cascades & Cathode hosts)
  {
    id: "batt-056-lis-discharge-stage1-li2s8",
    name: "First discharge stage of lithium-sulfur battery forming soluble Li2S8",
    reactants: ["s8", "li"],
    products: ["li2s8"],
    enthalpyKjPerMol: -180,
    reactionType: "synthesis",
    description: "High-voltage 2.35 V plateau cleavage of octasulfur rings forming long-chain soluble lithium octasulfide (Li2S8).",
    observableEffects: [
      { type: "color_change", description: "Clear electrolyte turns intense reddish-orange due to dissolved long-chain polysulfides", colorFrom: "#F8FAFC", colorTo: "#EA580C" }
    ],
    tempMin: 20,
    tempMax: 45
  },
  {
    id: "batt-057-lis-discharge-stage2-li2s6",
    name: "Second discharge reduction of Li2S8 to lithium hexasulfide (Li2S6)",
    reactants: ["li2s8", "li"],
    products: ["li2s6"],
    enthalpyKjPerMol: -110,
    reactionType: "redox_other",
    description: "Intermediate liquid-phase chain shortening of polysulfides at the upper discharge plateau in ether electrolytes.",
    observableEffects: [
      { type: "color_change", description: "Solution shifts to dark amber-red with high polysulfide mobility", colorTo: "#B45309" }
    ],
    tempMin: 20,
    tempMax: 45
  },
  {
    id: "batt-058-lis-discharge-stage3-li2s4",
    name: "Third discharge reduction of Li2S6 to lithium tetrasulfide (Li2S4)",
    reactants: ["li2s6", "li"],
    products: ["li2s4"],
    enthalpyKjPerMol: -125,
    reactionType: "redox_other",
    description: "Transition from upper flat plateau to lower slope forming medium-chain soluble Li2S4 species prone to the shuttle effect.",
    observableEffects: [
      { type: "color_change", description: "Electrolyte displays bright orange-yellow fluorescence under illumination", colorTo: "#F59E0B" }
    ],
    tempMin: 20,
    tempMax: 45
  },
  {
    id: "batt-059-lis-discharge-stage4-li2s2",
    name: "Fourth discharge reduction of Li2S4 to insoluble lithium disulfide (Li2S2)",
    reactants: ["li2s4", "li"],
    products: ["li2s2"],
    enthalpyKjPerMol: -160,
    reactionType: "redox_other",
    description: "Liquid-to-solid phase transition at 2.1 V plateau precipitating short-chain insoluble Li2S2 onto conductive carbon scaffold.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of microcrystalline off-white Li2S2 onto porous cathode framework", colorTo: "#FEF9C3" }
    ],
    tempMin: 20,
    tempMax: 45
  },
  {
    id: "batt-060-lis-discharge-stage5-li2s",
    name: "Final discharge reduction of Li2S2 to solid lithium sulfide (Li2S)",
    reactants: ["li2s2", "li"],
    products: ["li2s"],
    enthalpyKjPerMol: -190,
    reactionType: "redox_other",
    description: "Sluggish solid-solid conversion completing full 1675 mAh/g theoretical capacity with dense passivation by insulating Li2S.",
    observableEffects: [
      { type: "precipitation", description: "Deposition of dense insulating white Li2S nanocrystals causing terminal capacity cutoff", colorTo: "#FFFFFF" }
    ],
    tempMin: 20,
    tempMax: 45
  },
  {
    id: "batt-061-polysulfide-shuttle-corrosion-li",
    name: "Polysulfide shuttle parasitic self-discharge corrosion at lithium anode",
    reactants: ["li2s8", "li"],
    products: ["li2s"],
    enthalpyKjPerMol: -450,
    reactionType: "redox_other",
    description: "Parasitic chemical corrosion where migrating soluble polysulfides passivate the lithium anode, causing continuous self-discharge.",
    observableEffects: [
      { type: "precipitation", description: "Uncontrolled crust of dead insulating Li2S covers lithium metal surface", colorTo: "#F1F5F9" },
      { type: "color_change", description: "Loss of vibrant orange polysulfide color in the bulk electrolyte", colorFrom: "#EA580C", colorTo: "#E2E8F0" }
    ],
    tempMin: 20,
    tempMax: 50
  },
  {
    id: "batt-062-lino3-additive-anode-passivation",
    name: "Passivation of lithium anode in Li-S cells by LiNO3 additive",
    reactants: ["lino3", "li"],
    products: ["li2o", "lino2"],
    enthalpyKjPerMol: -285,
    reactionType: "redox_other",
    description: "Sacrificial reduction of LiNO3 creating dense, insoluble Li2O/LiNxOy surface barrier that suppresses polysulfide parasitic reduction.",
    observableEffects: [
      { type: "precipitation", description: "Smooth protective inorganic passivating surface film formed", colorTo: "#FFFFFF" }
    ],
    tempMin: 20,
    tempMax: 40
  },
  {
    id: "batt-063-tin2-polysulfide-chemisorption",
    name: "Sulfiphilic chemisorption of lithium polysulfides on titanium nitride (TiN)",
    reactants: ["tin", "li2s4"],
    products: ["tin_li2s4_adduct"],
    enthalpyKjPerMol: -95,
    reactionType: "synthesis",
    description: "Strong polar chemical anchoring of polysulfides on highly conductive metallic TiN host to trap sulfur intermediates in the cathode.",
    observableEffects: [
      { type: "color_change", description: "Decoloration of free polysulfide solution confirming complete surface entrapment", colorFrom: "#F59E0B", colorTo: "#F8FAFC" }
    ],
    tempMin: 20,
    tempMax: 60
  },
  {
    id: "batt-064-mno2-polysulfide-thiosulfate-anchoring",
    name: "Redox anchoring of polysulfides on MnO2 nanosheets via thiosulfate formation",
    reactants: ["mno2", "li2s4"],
    products: ["mns", "li2s2o3", "s8"],
    enthalpyKjPerMol: -140,
    reactionType: "redox_other",
    description: "Nazar-type chemical trapping converting migrating polysulfides into surface-bound polythionate/thiosulfate mediators on MnO2 hosts.",
    observableEffects: [
      { type: "phase_change", description: "In-situ formation of bound thiosulfate redox-mediating interphase" }
    ],
    tempMin: 20,
    tempMax: 50
  },
  {
    id: "batt-065-vn-catalytic-polysulfide-conversion",
    name: "Catalytic electro-reduction of Li2S4 to Li2S on vanadium nitride (VN)",
    reactants: ["vn", "li2s4", "li"],
    products: ["vn", "li2s"],
    enthalpyKjPerMol: -260,
    reactionType: "redox_other",
    description: "Electrocatalytic conversion on metallic VN speeding up the sluggish liquid-solid nucleation kinetics of Li2S.",
    observableEffects: [
      { type: "precipitation", description: "Rapid, uniform 3D deposition of Li2S without passivating electrode choke" }
    ],
    tempMin: 20,
    tempMax: 50
  },

  // 66-80: Vanadium & Aqueous Redox Flow Batteries (VRFB, Zinc-Bromine, Iron-Chromium)
  {
    id: "batt-066-vrfb-charge-positive-half-cell",
    name: "Positive electrode charging reaction in vanadium redox flow battery (VRFB)",
    reactants: ["voso4", "h2so4", "water"],
    products: ["vo2_2so4", "h2"],
    enthalpyKjPerMol: 125,
    reactionType: "redox_other",
    description: "Electrochemical oxidation of blue VO2+ (vanadyl, V4+) to yellow VO2+ (pervanadyl, V5+) at the positive carbon felt electrode (+1.00 V vs SHE).",
    observableEffects: [
      { type: "color_change", description: "Brilliant color shift from royal blue (VO2+) to golden yellow (VO2+)", colorFrom: "#1D4ED8", colorTo: "#EAB308" }
    ],
    solvent: "water",
    tempMin: 15,
    tempMax: 40
  },
  {
    id: "batt-067-vrfb-charge-negative-half-cell",
    name: "Negative electrode charging reaction in vanadium redox flow battery (VRFB)",
    reactants: ["v2_so4_3", "h2"],
    products: ["vso4", "h2so4"],
    enthalpyKjPerMol: -78,
    reactionType: "redox_other",
    description: "Electrochemical reduction of green V3+ to deep purple V2+ at the negative electrode (-0.26 V vs SHE) completing the 1.26 V open-circuit cell.",
    observableEffects: [
      { type: "color_change", description: "Color changes from emerald green (V3+) to intense violet-purple (V2+)", colorFrom: "#15803D", colorTo: "#6B21A8" }
    ],
    solvent: "water",
    tempMin: 15,
    tempMax: 40
  },
  {
    id: "batt-068-vrfb-thermal-precipitation-v2o5",
    name: "Thermal precipitation of V2O5 from over-heated V(V) positive electrolyte",
    reactants: ["vo2_2so4", "water"],
    products: ["v2o5", "h2so4"],
    enthalpyKjPerMol: 45,
    reactionType: "precipitation",
    description: "Parasitic thermal precipitation of hazardous brick-red V2O5 precipitate when positive electrolyte temperature exceeds 40 °C.",
    observableEffects: [
      { type: "precipitation", description: "Formation of dense brick-red crystalline V2O5 sludge clogging flow channels", colorTo: "#B91C1C" }
    ],
    solvent: "water",
    tempMin: 40,
    tempMax: 65
  },
  {
    id: "batt-069-zn-br2-discharge-reaction",
    name: "Discharge reaction in zinc-bromine redox flow battery",
    reactants: ["zn", "br2"],
    products: ["znbr2"],
    enthalpyKjPerMol: -328,
    reactionType: "redox_other",
    description: "Spontaneous 1.82 V discharge reaction oxidizing metallic zinc anode and reducing elemental bromine in quaternary ammonium complexed electrolyte.",
    observableEffects: [
      { type: "color_change", description: "Deep reddish-brown bromine solution fades to clear zinc bromide solution", colorFrom: "#7F1D1D", colorTo: "#F8FAFC" },
      { type: "temperature_increase", description: "Exothermic discharge power output" }
    ],
    solvent: "water",
    tempMin: 10,
    tempMax: 40
  },
  {
    id: "batt-070-zn-br2-mepbr-complexation",
    name: "Bromine sequestration by N-methyl-N-ethylpyrrolidinium bromide (MEP)",
    reactants: ["mepbr", "br2"],
    products: ["mepbr_polybromide"],
    enthalpyKjPerMol: -42,
    reactionType: "synthesis",
    description: "Complexation of hazardous volatile free Br2 into a dense, oily, water-immiscible polybromide phase to eliminate vapor pressure and crossover.",
    observableEffects: [
      { type: "phase_change", description: "Separation of heavy dark red-brown oily polybromide phase at bottom of tank", colorTo: "#450A0A" }
    ],
    solvent: "water",
    tempMin: 15,
    tempMax: 35
  },
  {
    id: "batt-071-fe-cr-flow-battery-discharge",
    name: "Discharge reaction in iron-chromium redox flow battery",
    reactants: ["fecl3", "crcl2"],
    products: ["fecl2", "crcl3"],
    enthalpyKjPerMol: -115,
    reactionType: "redox_other",
    description: "Discharge of historic NASA Iron-Chromium flow cell coupling Fe3+/Fe2+ (+0.77 V) with Cr2+/Cr3+ (-0.41 V).",
    observableEffects: [
      { type: "color_change", description: "Yellow-brown Fe3+ and blue Cr2+ turn into pale green Fe2+ and green Cr3+", colorFrom: "#B45309", colorTo: "#16A34A" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 65
  },
  {
    id: "batt-072-all-iron-flow-battery-plating",
    name: "Negative electrode plating in sustainable all-iron flow battery (IFB)",
    reactants: ["fecl2", "h2"],
    products: ["fe", "hcl"],
    enthalpyKjPerMol: 85,
    reactionType: "redox_other",
    description: "Charging reaction plating elemental iron on negative electrode (-0.44 V vs SHE) in low-cost, non-toxic all-iron flow systems.",
    observableEffects: [
      { type: "phase_change", description: "Uniform grey metallic iron layer plates onto conductive substrate", colorTo: "#64748B" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 50
  },
  {
    id: "batt-073-aq-zinc-mno2-discharge-reaction",
    name: "Discharge reaction in mild aqueous Zn-MnO2 rechargeable battery",
    reactants: ["zn", "mno2", "water", "znso4"],
    products: ["znso4_znoh2_precipitate", "mnooh"],
    enthalpyKjPerMol: -280,
    reactionType: "redox_other",
    description: "Proton and zinc-ion co-insertion discharge reaction in mild aqueous ZnSO4 electrolyte delivering safe 1.38 V output.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of basic zinc sulfate flakelets on electrode surface", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 15,
    tempMax: 40
  },
  {
    id: "batt-074-zn-air-discharge-formation-zno",
    name: "Overall discharge reaction in primary/secondary zinc-air battery",
    reactants: ["zn", "o2"],
    products: ["zno"],
    enthalpyKjPerMol: -348,
    reactionType: "synthesis",
    description: "Four-electron reduction of atmospheric O2 coupled to zinc oxidation producing zinc oxide with high theoretical energy density (1086 Wh/kg).",
    observableEffects: [
      { type: "precipitation", description: "Formation of white insoluble zinc oxide in alkaline KOH electrolyte", colorTo: "#FFFFFF" },
      { type: "temperature_increase", description: "Continuous exothermic discharge operation" }
    ],
    tempMin: 15,
    tempMax: 50
  },
  {
    id: "batt-075-al-air-discharge-aloh3-formation",
    name: "High-energy discharge of aluminium-air battery in alkaline electrolyte",
    reactants: ["al", "o2", "water"],
    products: ["al_oh3"],
    enthalpyKjPerMol: -820,
    reactionType: "synthesis",
    description: "Ultra-high theoretical energy density (8100 Wh/kg) discharge oxidizing aluminium anode to aluminium hydroxide precipitate.",
    observableEffects: [
      { type: "precipitation", description: "Heavy gelatinous white Al(OH)3 precipitate formation", colorTo: "#FFFFFF" },
      { type: "temperature_increase", description: "Substantial exothermic heat generation" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 70
  },

  // 76-90: Battery Recycling, Leaching & Hydrometallurgical Recovery
  {
    id: "batt-076-lco-acid-peroxide-leaching",
    name: "Hydrometallurgical reductive acid leaching of spent LiCoO2 cathode",
    reactants: ["licoo2", "h2so4", "h2o2"],
    products: ["liso4_aq", "coso4", "water", "o2"],
    enthalpyKjPerMol: -310,
    reactionType: "redox_other",
    description: "High-efficiency (>99%) closed-loop recycling leaching spent LCO with sulfuric acid and hydrogen peroxide reducing insoluble Co3+ to soluble Co2+.",
    observableEffects: [
      { type: "gas_evolution", description: "Continuous effervescence of O2 bubbles from catalytic peroxide reduction", relatedChemicalId: "o2" },
      { type: "color_change", description: "Black cathode mass dissolves into brilliant ruby-red cobalt sulfate solution", colorFrom: "#020617", colorTo: "#E11D48" }
    ],
    solvent: "water",
    tempMin: 60,
    tempMax: 85
  },
  {
    id: "batt-077-nmc-reductive-leaching-h2so4-glucose",
    name: "Green organic acid / glucose leaching of spent NMC black mass",
    reactants: ["linmc811o2", "h2so4", "glucose"],
    products: ["liso4_aq", "niso4", "coso4", "mnso4", "co2", "water"],
    enthalpyKjPerMol: -480,
    reactionType: "redox_other",
    description: "Sustainable hydrometallurgical recycling utilizing bio-derived glucose as a mild reducing agent for quantitative metal recovery.",
    observableEffects: [
      { type: "color_change", description: "Black slurry converts into clear dark emerald-green mixed metal sulfate pregnant leachate", colorFrom: "#020617", colorTo: "#059669" },
      { type: "gas_evolution", description: "Slow CO2 gas release during glucose oxidation" }
    ],
    solvent: "water",
    tempMin: 70,
    tempMax: 95
  },
  {
    id: "batt-078-lfp-reductive-leaching-h3po4-h2o2",
    name: "Selective phosphoric acid leaching of spent LiFePO4 cathodes",
    reactants: ["lifepo4", "h3po4", "h2o2"],
    products: ["lih2po4", "fepo4", "water"],
    enthalpyKjPerMol: -195,
    reactionType: "redox_other",
    description: "Selective leaching where lithium is extracted into solution as LiH2PO4 while iron is cleanly separated as solid FePO4 precursor.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of pure solid iron phosphate (FePO4) precursor for direct re-synthesis", colorTo: "#FBCFE8" }
    ],
    solvent: "water",
    tempMin: 50,
    tempMax: 70
  },
  {
    id: "batt-079-lithium-carbonate-precipitation-recovery",
    name: "Precipitation of battery-grade Li2CO3 from purified pregnant leach liquor",
    reactants: ["liso4_aq", "na2co3"],
    products: ["li2co3", "na2so4"],
    enthalpyKjPerMol: -28,
    reactionType: "precipitation",
    description: "Hot precipitation (80-95 °C) exploiting retrograde solubility to recover battery-grade (>99.5%) lithium carbonate from recycled solutions.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of dense, crystalline white Li2CO3 powder at elevated temperature", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 80,
    tempMax: 95
  },
  {
    id: "batt-080-cobalt-oxalate-precipitation-recovery",
    name: "Selective recovery of cobalt as cobalt(II) oxalate precipitate",
    reactants: ["coso4", "oxalic_acid"],
    products: ["co_oxalate", "h2so4"],
    enthalpyKjPerMol: -34,
    reactionType: "precipitation",
    description: "Selective hydrometallurgical separation of cobalt ions from mixed leach solutions yielding high-purity pink cobalt oxalate dihydrate.",
    observableEffects: [
      { type: "precipitation", description: "Instantaneous precipitation of delicate pale pink cobalt oxalate crystals", colorTo: "#F472B6" }
    ],
    solvent: "water",
    tempMin: 40,
    tempMax: 60
  },
  {
    id: "batt-081-nickel-oxalate-precipitation-recovery",
    name: "Precipitation of nickel oxalate from recycled battery leachate",
    reactants: ["niso4", "oxalic_acid"],
    products: ["ni_oxalate", "h2so4"],
    enthalpyKjPerMol: -38,
    reactionType: "precipitation",
    description: "Quantitative recovery of nickel as pale mint-green nickel oxalate precursor for direct thermal decomposition into battery-grade NiO.",
    observableEffects: [
      { type: "precipitation", description: "Rapid formation of pale mint-green crystalline nickel oxalate precipitate", colorTo: "#A7F3D0" }
    ],
    solvent: "water",
    tempMin: 40,
    tempMax: 60
  },
  {
    id: "batt-082-manganese-dioxide-precipitation-permanganate",
    name: "Oxidative precipitation of manganese as MnO2 from recycling leachate",
    reactants: ["mnso4", "kmno4", "water"],
    products: ["mno2", "k2so4", "h2so4"],
    enthalpyKjPerMol: -260,
    reactionType: "precipitation",
    description: "Synproportionation reaction between Mn2+ and MnO4- selectively dropping manganese out of mixed NMC leach liquors as pure MnO2.",
    observableEffects: [
      { type: "precipitation", description: "Deep purple permanganate turns into dense dark-brown amorphous MnO2 precipitate", colorFrom: "#701A75", colorTo: "#451A03" }
    ],
    solvent: "water",
    tempMin: 30,
    tempMax: 70
  },
  {
    id: "batt-083-iron-removal-jarosite-precipitation",
    name: "Removal of iron impurities from battery leachate via Jarosite precipitation",
    reactants: ["fe2_so4_3", "na2so4", "water"],
    products: ["na_jarosite", "h2so4"],
    enthalpyKjPerMol: -85,
    reactionType: "precipitation",
    description: "Selective industrial removal of iron contaminants from pregnant battery leachate at 95 °C as crystalline yellow natrojarosite.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of bright ocher-yellow crystalline jarosite sludge", colorTo: "#CA8A04" }
    ],
    solvent: "water",
    tempMin: 85,
    tempMax: 98
  },
  {
    id: "batt-084-aluminium-impurity-removal-aloh3",
    name: "pH-controlled selective precipitation of aluminium impurity as Al(OH)3",
    reactants: ["al2_so4_3", "naoh"],
    products: ["al_oh3", "na2so4"],
    enthalpyKjPerMol: -190,
    reactionType: "precipitation",
    description: "Controlled neutralization to pH 4.5-5.2 selectively removing dissolved aluminium foil contamination prior to nickel/cobalt recovery.",
    observableEffects: [
      { type: "precipitation", description: "Formation of flocculent white aluminium hydroxide precipitate", colorTo: "#F8FAFC" }
    ],
    solvent: "water",
    tempMin: 40,
    tempMax: 60
  },
  {
    id: "batt-085-copper-cementation-iron-scrap",
    name: "Cementation removal of dissolved copper using sacrificial iron powder",
    reactants: ["cuso4", "fe"],
    products: ["cu", "feso4"],
    enthalpyKjPerMol: -152,
    reactionType: "single_displacement",
    description: "Spontaneous redox cementation extracting copper foil contamination as high-purity metallic copper powder.",
    observableEffects: [
      { type: "color_change", description: "Blue copper solution decolorizes with immediate deposition of reddish copper sponge", colorFrom: "#2563EB", colorTo: "#B45309" }
    ],
    solvent: "water",
    tempMin: 25,
    tempMax: 50
  },

  // 86-100: Thermal Runaway, Gas Generation & Safety Mitigation
  {
    id: "batt-086-lco-thermal-decomposition-o2-release",
    name: "High-temperature thermal runaway oxygen release from delithiated Li0.5CoO2",
    reactants: ["li05coo2"],
    products: ["licoo2", "co3o4", "o2"],
    enthalpyKjPerMol: -120,
    reactionType: "decomposition",
    description: "Catastrophic thermal runaway trigger where charged cathode releases pure oxygen gas inside the hermetic cell above 200 °C.",
    observableEffects: [
      { type: "gas_evolution", description: "Vigorous pressurized release of hot oxygen gas accelerating cell combustion", relatedChemicalId: "o2" },
      { type: "temperature_increase", description: "Self-accelerating exothermic thermal decomposition" }
    ],
    tempMin: 180,
    tempMax: 350
  },
  {
    id: "batt-087-nmc811-thermal-oxygen-evolution",
    name: "Thermal runaway phase collapse of highly charged Ni-rich NMC-811",
    reactants: ["charged_nmc811"],
    products: ["rocksalt_nmc_phase", "o2"],
    enthalpyKjPerMol: -165,
    reactionType: "decomposition",
    description: "Layered-to-rocksalt structural collapse of delithiated Ni-rich NMC releasing volatile lattice oxygen into flammable solvent vapors at ~190 °C.",
    observableEffects: [
      { type: "temperature_increase", description: "Violent exothermic runaway spike exceeding 800 °C within milliseconds" },
      { type: "gas_evolution", description: "Pressurized oxygen release feeding venting flames", relatedChemicalId: "o2" }
    ],
    tempMin: 180,
    tempMax: 400
  },
  {
    id: "batt-088-ec-combustion-oxygen-runaway",
    name: "Combustion of ethylene carbonate vapor with runaway oxygen",
    reactants: ["ethylene_carbonate", "o2"],
    products: ["co2", "water"],
    enthalpyKjPerMol: -1160,
    reactionType: "combustion",
    description: "Internal combustion of flammable carbonate solvent with cathode-released oxygen generating intense jet flames during thermal runaway.",
    observableEffects: [
      { type: "temperature_increase", description: "Intense exothermic fire and cell venting explosion" },
      { type: "gas_evolution", description: "Eruption of pressurized combustion gases and smoke" }
    ],
    tempMin: 250,
    tempMax: 1000
  },
  {
    id: "batt-089-pvdf-binder-lithium-dehydrofluorination",
    name: "Exothermic reaction of PVDF binder with lithiated graphite anode",
    reactants: ["pvdf_repeat", "li"],
    products: ["lif", "poly_acetylene", "h2"],
    enthalpyKjPerMol: -380,
    reactionType: "redox_other",
    description: "Exothermic reaction of poly(vinylidene fluoride) binder with active lithium above 230 °C destroying electrode integrity.",
    observableEffects: [
      { type: "temperature_increase", description: "Secondary exothermic heat release during runaway progression" }
    ],
    tempMin: 220,
    tempMax: 350
  },
  {
    id: "batt-090-co-generation-incomplete-solvent-burn",
    name: "Incomplete combustion of diethyl carbonate generating toxic carbon monoxide",
    reactants: ["diethyl_carbonate", "o2"],
    products: ["co", "water"],
    enthalpyKjPerMol: -780,
    reactionType: "combustion",
    description: "Oxygen-depleted thermal venting producing lethal concentrations of toxic carbon monoxide gas during battery pack fire events.",
    observableEffects: [
      { type: "gas_evolution", description: "Release of toxic asphyxiating carbon monoxide in venting plume", relatedChemicalId: "co" }
    ],
    tempMin: 300,
    tempMax: 800
  },
  {
    id: "batt-091-hf-release-lipf6-moisture-fire",
    name: "High-temperature decomposition of LiPF6 in moisture-laden vent gas",
    reactants: ["lipf6", "water"],
    products: ["lif", "hf", "pof3"],
    enthalpyKjPerMol: -110,
    reactionType: "decomposition",
    description: "Thermal reaction during water-mist firefighting releasing toxic, corrosive hydrofluoric acid and phosphoryl fluoride.",
    observableEffects: [
      { type: "gas_evolution", description: "Acidic white smoke containing dangerous levels of HF gas", relatedChemicalId: "hf" }
    ],
    tempMin: 150,
    tempMax: 500
  },
  {
    id: "batt-092-aluminum-foil-molten-runaway",
    name: "Oxidation of melting aluminium current collector foil in battery fire",
    reactants: ["al", "o2"],
    products: ["al2o3"],
    enthalpyKjPerMol: -1675,
    reactionType: "combustion",
    description: "Extreme runaway scenario where current collector foil combusts (>1000 °C) providing massive chemical heat release.",
    observableEffects: [
      { type: "temperature_increase", description: "Dazzling white sparks and extreme thermal release" }
    ],
    tempMin: 660,
    tempMax: 1400
  },
  {
    id: "batt-093-flame-retardant-tmp-phosphate-radical-quenching",
    name: "Thermal decomposition of trimethyl phosphate (TMP) flame retardant",
    reactants: ["trimethyl_phosphate"],
    products: ["h3po4", "c2h4", "ch4"],
    enthalpyKjPerMol: 140,
    reactionType: "decomposition",
    description: "Endothermic release of radical-scavenging phosphorus radicals (PO·) that quench gaseous flame propagation in safety-enhanced electrolytes.",
    observableEffects: [
      { type: "phase_change", description: "Self-extinguishing foam layer suppresses solvent ignition" }
    ],
    tempMin: 180,
    tempMax: 300
  },
  {
    id: "batt-094-cid-current-interrupt-h2-trigger",
    name: "Gas-pressure activation of current interrupt device (CID) via gas buildup",
    reactants: ["c2h5oh_trace", "li"],
    products: ["lioc2h5", "h2"],
    enthalpyKjPerMol: -175,
    reactionType: "redox_other",
    description: "Designed benign gas generation activating hermetic mechanical CID diaphragm to permanently disconnect overcharged cylindrical cells.",
    observableEffects: [
      { type: "gas_evolution", description: "Controlled internal pressurization by clean hydrogen gas", relatedChemicalId: "h2" }
    ],
    tempMin: 25,
    tempMax: 60
  },
  {
    id: "batt-095-ptc-thermistor-polymer-expansion",
    name: "PTC thermistor current-limiting polymer trip mechanism",
    reactants: ["conductive_pe_composite"],
    products: ["insulating_expanded_pe"],
    enthalpyKjPerMol: 45,
    reactionType: "phase_change",
    description: "Reversible thermal expansion of conductive polyethylene matrix breaking percolation paths and raising resistance 10,000-fold at 120 °C.",
    observableEffects: [
      { type: "phase_change", description: "Instantaneous thermal switching shutting down overcurrent flow" }
    ],
    tempMin: 110,
    tempMax: 135
  },
  {
    id: "batt-096-redox-shuttle-dmb-overcharge-protection",
    name: "Reversible redox shuttle overcharge protection by 1,4-dimethoxybenzene (DMB)",
    reactants: ["dimethoxybenzene", "li_cathode_overcharge"],
    products: ["dimethoxybenzene_radical_cation", "li"],
    enthalpyKjPerMol: -45,
    reactionType: "redox_other",
    description: "Reversible 3.9 V redox shuttle carrying excess charge between cathode and anode, clamping cell voltage and preventing overcharge runaway.",
    observableEffects: [
      { type: "color_change", description: "Reversible dark blue radical cation coloration during active voltage clamping", colorTo: "#1E40AF" }
    ],
    tempMin: 20,
    tempMax: 55
  },
  {
    id: "batt-097-ceramic-separator-thermal-shutdown",
    name: "Ceramic alumina coated separator thermal shutdown behavior",
    reactants: ["al2o3_coated_pe_separator"],
    products: ["closed_pore_separator"],
    enthalpyKjPerMol: 38,
    reactionType: "phase_change",
    description: "Polyethylene base melts at 130 °C closing micropores while outer Al2O3 ceramic skeleton maintains dimensional stability up to 200 °C.",
    observableEffects: [
      { type: "phase_change", description: "Impedance jumps to megaohms as ion-conducting pores seal shut" }
    ],
    tempMin: 125,
    tempMax: 140
  },
  {
    id: "batt-098-solid-electrolyte-dendrite-short-circuit",
    name: "Lithium filament short-circuiting across LLZO grain boundaries",
    reactants: ["li_dendrite", "solid_electrolyte_contact"],
    products: ["lithium_metal_bridge"],
    enthalpyKjPerMol: -15,
    reactionType: "phase_change",
    description: "Creep and electro-chemo-mechanical penetration of metallic lithium filaments along garnet grain boundaries during high-rate plating.",
    observableEffects: [
      { type: "temperature_increase", description: "Sharp voltage drop accompanied by local Joule heating hotspot" }
    ],
    tempMin: 25,
    tempMax: 80
  },
  {
    id: "batt-099-na-beta-alumina-sodiation",
    name: "Sodium ion conduction across Na-beta''-alumina solid electrolyte",
    reactants: ["na_beta_alumina", "na"],
    products: ["sodiated_beta_alumina"],
    enthalpyKjPerMol: -22,
    reactionType: "synthesis",
    description: "Superionic 2D conduction of sodium ions across conduction planes of Na1+xAl11O17+x/2 in high-temperature sodium-sulfur (Na-S) grid batteries.",
    observableEffects: [
      { type: "phase_change", description: "Molten sodium wets polished ceramic electrolyte disc" }
    ],
    tempMin: 300,
    tempMax: 350
  },
  {
    id: "batt-100-na-s-molten-discharge-na2s3",
    name: "High-temperature discharge of sodium-sulfur battery forming Na2S3",
    reactants: ["na", "s8"],
    products: ["na2s3"],
    enthalpyKjPerMol: -418,
    reactionType: "synthesis",
    description: "Commercial high-temperature (300-350 °C) molten Na-S battery discharge producing molten sodium polysulfide with 100% coulombic efficiency.",
    observableEffects: [
      { type: "phase_change", description: "Molten yellow sulfur and silvery sodium react forming red molten sodium polysulfide", colorTo: "#DC2626" },
      { type: "temperature_increase", description: "Substantial high-efficiency exothermic power delivery" }
    ],
    tempMin: 300,
    tempMax: 350
  }
];
