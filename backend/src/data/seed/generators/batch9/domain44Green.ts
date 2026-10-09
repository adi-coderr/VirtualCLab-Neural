// Domain 44: Green & Sustainable Chemistry, Bio-feedstocks & Catalytic Hydrogenation (100 reactions)
import type { ReactionDefinition } from "./types.js";

export const DOMAIN_44_REACTIONS: ReactionDefinition[] = [
  // 1-20: Biodiesel, Fatty Acid Valorization & Glycerol Platform
  {
    id: "green-001-triolein-methanol-transesterification",
    name: "Base-catalyzed transesterification of triolein with methanol to biodiesel",
    reactants: ["triolein", "ch3oh"],
    products: ["methyl_oleate", "glycerol"],
    enthalpyKjPerMol: -15,
    reactionType: "double_displacement",
    description: "Standard industrial biodiesel synthesis transesterifying triglycerides with methanol under KOH/NaOMe catalysis yielding methyl oleate (FAME) and glycerol byproduct.",
    observableEffects: [
      { type: "phase_change", description: "Biphasic separation of upper golden biodiesel ester layer from dense amber glycerol byproduct", colorTo: "#EAB308" }
    ],
    solvent: "methanol",
    tempMin: 55,
    tempMax: 65,
    catalystChemicalId: "koh"
  },
  {
    id: "green-002-tripalmitin-ethanol-transesterification",
    name: "Transesterification of tripalmitin with bio-ethanol yielding ethyl palmitate",
    reactants: ["tripalmitin", "c2h5oh"],
    products: ["ethyl_palmitate", "glycerol"],
    enthalpyKjPerMol: -12,
    reactionType: "double_displacement",
    description: "100% bio-based fuel synthesis utilizing green ethanol for the catalytic transesterification of saturated palm triglycerides.",
    observableEffects: [
      { type: "phase_change", description: "Clear homogeneous reaction mixture splits upon cooling into ester phase and dense glycerol", colorTo: "#FEF08A" }
    ],
    solvent: "ethanol",
    tempMin: 65,
    tempMax: 78
  },
  {
    id: "green-003-methyl-oleate-performic-epoxidation",
    name: "Performic acid in-situ epoxidation of methyl oleate to epoxidized fatty ester",
    reactants: ["methyl_oleate", "hcooh", "h2o2"],
    products: ["epoxidized_methyl_oleate", "hcooh", "water"],
    enthalpyKjPerMol: -210,
    reactionType: "synthesis",
    description: "Electrophilic Prilezhaev epoxidation of unsaturated fatty ester providing renewable bio-plasticizer and non-toxic lubricant intermediate.",
    observableEffects: [
      { type: "temperature_increase", description: "Exothermic epoxidation requiring controlled jacket cooling" },
      { type: "color_change", description: "Yellow oil decolorizes into clear viscous oxirane-rich bio-plasticizer", colorFrom: "#FBBF24", colorTo: "#F8FAFC" }
    ],
    tempMin: 50,
    tempMax: 65
  },
  {
    id: "green-004-oleic-acid-ozonolysis-cleavage",
    name: "Oxidative ozonolysis cleavage of oleic acid to azelaic and pelargonic acids",
    reactants: ["oleic_acid", "o3", "o2"],
    products: ["azelaic_acid", "pelargonic_acid"],
    enthalpyKjPerMol: -390,
    reactionType: "decomposition",
    description: "Green oxidative cleavage of internal C9=C10 double bond in oleic acid producing bio-based dicarboxylic azelaic acid (nylon-6,9 monomer) and pelargonic acid.",
    observableEffects: [
      { type: "precipitation", description: "Crystallization of white solid azelaic acid upon phase separation and chilling", colorTo: "#FFFFFF" }
    ],
    tempMin: 20,
    tempMax: 60
  },
  {
    id: "green-005-glycerol-esterification-triacetin",
    name: "Acetylation of biodiesel-derived glycerol with acetic acid to triacetin",
    reactants: ["glycerol", "ch3cooh"],
    products: ["triacetin", "water"],
    enthalpyKjPerMol: -28,
    reactionType: "synthesis",
    description: "Upgrading surplus glycerol with bio-acetic acid yielding triacetin (glycerol triacetate), a high-value fuel antiknock additive and pharmaceutical excipient.",
    observableEffects: [
      { type: "phase_change", description: "Viscous glycerol converts into low-viscosity clear liquid with mild fruity aroma" }
    ],
    tempMin: 100,
    tempMax: 130
  },
  {
    id: "green-006-glycerol-dehydration-acrolein",
    name: "Gas-phase catalytic dehydration of glycerol to acrolein over solid acid",
    reactants: ["glycerol"],
    products: ["acrolein", "water"],
    enthalpyKjPerMol: 74,
    reactionType: "decomposition",
    description: "Heterogeneous double dehydration of bio-glycerol over supported heteropolyacid catalysts producing acrolein for acrylic acid manufacturing.",
    observableEffects: [
      { type: "gas_evolution", description: "Evolution of pungent lacrimatory acrolein vapor condensable into clear distillate", relatedChemicalId: "acrolein" }
    ],
    tempMin: 280,
    tempMax: 320
  },
  {
    id: "green-007-acrolein-oxidation-acrylic-acid",
    name: "Selective catalytic gas-phase oxidation of acrolein to acrylic acid",
    reactants: ["acrolein", "o2"],
    products: ["acrylic_acid"],
    enthalpyKjPerMol: -255,
    reactionType: "synthesis",
    description: "Second-stage oxidation over mixed Mo-V-W oxide catalyst providing 100% bio-based acrylic acid for superabsorbent polyacrylate polymers.",
    observableEffects: [
      { type: "temperature_increase", description: "Highly exothermic catalytic fixed-bed oxidation" }
    ],
    tempMin: 240,
    tempMax: 280
  },
  {
    id: "green-008-glycerol-hydrogenolysis-12-propanediol",
    name: "Selective hydrogenolysis of glycerol to 1,2-propanediol over Cu/ZnO catalyst",
    reactants: ["glycerol", "h2"],
    products: ["propanediol_12", "water"],
    enthalpyKjPerMol: -62,
    reactionType: "redox_other",
    description: "High-selectivity (>95%) catalytic hydrogenolysis converting raw glycerol into bio-propylene glycol for non-toxic antifreeze and polyester resins.",
    observableEffects: [
      { type: "phase_change", description: "Thick viscous glycerol thins into mobile water-soluble 1,2-propanediol liquid" }
    ],
    tempMin: 180,
    tempMax: 220
  },
  {
    id: "green-009-glycerol-hydrogenolysis-13-propanediol",
    name: "Selective hydrogenolysis of glycerol to 1,3-propanediol over Pt-WOx/ZrO2",
    reactants: ["glycerol", "h2"],
    products: ["propanediol_13", "water"],
    enthalpyKjPerMol: -68,
    reactionType: "redox_other",
    description: "Direct selective catalytic deoxygenation yielding 1,3-propanediol, the essential bio-monomer for Sorona (PTT) polytrimethylene terephthalate carpet fibers.",
    observableEffects: [
      { type: "phase_change", description: "Conversion of crude bio-glycerol into clear linear diol liquid" }
    ],
    tempMin: 160,
    tempMax: 200
  },
  {
    id: "green-010-glycerol-chlorination-dichlorohydrin",
    name: "Hydrochlorination of glycerol with HCl to 1,3-dichloropropan-2-ol",
    reactants: ["glycerol", "hcl"],
    products: ["dichlorohydrin_13", "water"],
    enthalpyKjPerMol: -48,
    reactionType: "double_displacement",
    description: "First step in the green Epicerol process replacing petrochemical propylene with bio-glycerol for epichlorohydrin synthesis.",
    observableEffects: [
      { type: "phase_change", description: "Dense organic chlorohydrin phase separates from aqueous HCl byproduct" }
    ],
    tempMin: 90,
    tempMax: 110,
    catalystChemicalId: "ch3cooh"
  },
  {
    id: "green-011-dichlorohydrin-dehydrochlorination-epichlorohydrin",
    name: "Alkaline dehydrochlorination of dichlorohydrin to epichlorohydrin",
    reactants: ["dichlorohydrin_13", "naoh"],
    products: ["epichlorohydrin", "nacl", "water"],
    enthalpyKjPerMol: -82,
    reactionType: "double_displacement",
    description: "Cyclization step of Epicerol technology producing bio-epichlorohydrin building block for sustainable epoxy resins.",
    observableEffects: [
      { type: "precipitation", description: "Heavy precipitation of sodium chloride salt in neutralization reactor", colorTo: "#FFFFFF" }
    ],
    tempMin: 40,
    tempMax: 60
  },
  {
    id: "green-012-glycerol-carbonate-synthesis-urea",
    name: "Catalytic carbonylation of glycerol with urea to glycerol carbonate",
    reactants: ["glycerol", "urea"],
    products: ["glycerol_carbonate", "nh3"],
    enthalpyKjPerMol: 32,
    reactionType: "synthesis",
    description: "Phosgene-free green synthesis using non-hazardous urea to capture glycerol into cyclic glycerol carbonate, a high-boiling polar green solvent.",
    observableEffects: [
      { type: "gas_evolution", description: "Continuous evolution of recyclable ammonia gas", relatedChemicalId: "nh3" }
    ],
    tempMin: 130,
    tempMax: 150
  },
  {
    id: "green-013-castor-oil-pyrolysis-undecylenic-acid",
    name: "Pyrolytic cleavage of ricinoleic acid to undecylenic acid and heptanal",
    reactants: ["ricinoleic_acid"],
    products: ["undecylenic_acid", "heptanal"],
    enthalpyKjPerMol: 115,
    reactionType: "decomposition",
    description: "High-temperature cracking of renewable castor oil yielding 10-undecylenic acid (precursor for bio-Nylon-11 / Rilsan) and enanthaldehyde.",
    observableEffects: [
      { type: "gas_evolution", description: "Vaporization and condensation of sharp-scented heptanal aldehyde distillate" }
    ],
    tempMin: 450,
    tempMax: 550
  },
  {
    id: "green-014-undecylenic-acid-hydrobromination",
    name: "Anti-Markovnikov radical hydrobromination of undecylenic acid",
    reactants: ["undecylenic_acid", "hbr"],
    products: ["bromoundecanoic_11_acid"],
    enthalpyKjPerMol: -85,
    reactionType: "synthesis",
    description: "Peroxide-catalyzed radical addition of HBr yielding terminal 11-bromoundecanoic acid for bio-polyamide 11 polymerization.",
    observableEffects: [
      { type: "precipitation", description: "Crystallization of white flakes of 11-bromoundecanoic acid upon cooling", colorTo: "#FFFFFF" }
    ],
    tempMin: 20,
    tempMax: 40
  },
  {
    id: "green-015-bromoundecanoic-amination-nylon11-monomer",
    name: "Amination of 11-bromoundecanoic acid to 11-aminoundecanoic acid",
    reactants: ["bromoundecanoic_11_acid", "nh3"],
    products: ["aminoundecanoic_11_acid", "nh4br"],
    enthalpyKjPerMol: -92,
    reactionType: "double_displacement",
    description: "Nucleophilic amination producing pure 11-aminoundecanoic acid monomer for commercial bio-Nylon 11 (Arkema Rilsan).",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of microcrystalline white amino acid zwitterionic powder", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 30,
    tempMax: 50
  },
  {
    id: "green-016-sebacic-acid-castor-cleavage",
    name: "Alkaline cleavage of ricinoleic acid with KOH to sebacic acid and 2-octanol",
    reactants: ["ricinoleic_acid", "koh", "water"],
    products: ["sebacic_acid_k_salt", "octanol_2", "h2"],
    enthalpyKjPerMol: -45,
    reactionType: "decomposition",
    description: "Industrial fusion of castor fatty acid producing renewable C10 dicarboxylic sebacic acid for bio-polyesters and engineering polyamides.",
    observableEffects: [
      { type: "gas_evolution", description: "Evolution of hydrogen gas off-gas during alkaline oxidation cleavage", relatedChemicalId: "h2" },
      { type: "phase_change", description: "Separation of upper 2-octanol fragrant bio-alcohol layer" }
    ],
    tempMin: 220,
    tempMax: 270
  },
  {
    id: "green-017-sebacic-acid-acidification-recovery",
    name: "Acidification and crystallization of pure bio-based sebacic acid",
    reactants: ["sebacic_acid_k_salt", "h2so4"],
    products: ["sebacic_acid", "k2so4"],
    enthalpyKjPerMol: -38,
    reactionType: "double_displacement",
    description: "Mineral acid neutralization precipitating pure white crystals of sebacic acid (solubility <0.1 g/100 mL at 20 °C).",
    observableEffects: [
      { type: "precipitation", description: "Massive crystallization of brilliant white shiny sebacic acid platelets", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 60
  },
  {
    id: "green-018-erucic-acid-ozonolysis-brassilic-acid",
    name: "Oxidative cleavage of rapeseed erucic acid to brassylic and pelargonic acids",
    reactants: ["erucic_acid", "o3", "o2"],
    products: ["brassylic_acid", "pelargonic_acid"],
    enthalpyKjPerMol: -385,
    reactionType: "decomposition",
    description: "Green cleavage of high-erucic mustard/rapeseed oil producing C13 brassylic acid (monomer for high-performance bio-Nylon-13,13).",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of waxy white crystalline brassylic acid", colorTo: "#FFFFFF" }
    ],
    tempMin: 25,
    tempMax: 65
  },
  {
    id: "green-019-dimer-fatty-acid-synthesis",
    name: "Thermal Diels-Alder dimerization of conjugated linoleic acid",
    reactants: ["linoleic_acid"],
    products: ["c36_dimer_acid"],
    enthalpyKjPerMol: -110,
    reactionType: "synthesis",
    description: "Non-catalytic clay-promoted thermal dimerization forming flexible C36 dimer fatty acids for high-impact polyamides and epoxy curing agents.",
    observableEffects: [
      { type: "phase_change", description: "Low-viscosity oil thickens into viscous amber non-crystallizable polybasic acid resin", colorTo: "#D97706" }
    ],
    tempMin: 220,
    tempMax: 260
  },
  {
    id: "green-020-dimer-diamine-hydrogenation",
    name: "Catalytic amination and hydrogenation of dimer acid to C36 dimer diamine",
    reactants: ["c36_dimer_acid", "nh3", "h2"],
    products: ["c36_dimer_diamine", "water"],
    enthalpyKjPerMol: -180,
    reactionType: "redox_other",
    description: "High-pressure catalytic hydrogenation of dimerized fatty nitriles producing ultra-flexible bio-diamine for specialty polymers.",
    observableEffects: [
      { type: "phase_change", description: "Formation of clear pale-yellow hydrophobic liquid diamine with mild amine odor" }
    ],
    tempMin: 180,
    tempMax: 220
  },

  // 21-40: Furanics, Carbohydrates & Levulinate Platform Chemicals
  {
    id: "green-021-fructose-dehydration-5hmf",
    name: "Acid-catalyzed triple dehydration of D-fructose to 5-hydroxymethylfurfural",
    reactants: ["fructose"],
    products: ["hmf_5", "water"],
    enthalpyKjPerMol: 58,
    reactionType: "decomposition",
    description: "Thermocatalytic dehydration of ketohexose sugars in ionic liquids or biphasic systems synthesizing central platform molecule 5-HMF.",
    observableEffects: [
      { type: "color_change", description: "Colorless sugar syrup turns golden-amber as 5-HMF chromophore accumulates", colorFrom: "#FFFFFF", colorTo: "#D97706" }
    ],
    tempMin: 100,
    tempMax: 140
  },
  {
    id: "green-022-xylose-dehydration-furfural",
    name: "Acid-catalyzed dehydration of agricultural pentose D-xylose to furfural",
    reactants: ["xylose"],
    products: ["furfural", "water"],
    enthalpyKjPerMol: 62,
    reactionType: "decomposition",
    description: "Mineral-acid catalyzed triple dehydration of agricultural residue hemicellulose pentosans into volatile, steam-distillable furfural.",
    observableEffects: [
      { type: "gas_evolution", description: "Azeotropic steam co-distillation of fragrant, amber-tinted furfural distillate", relatedChemicalId: "furfural" }
    ],
    tempMin: 160,
    tempMax: 200
  },
  {
    id: "green-023-furfural-hydrogenation-furfuryl-alcohol",
    name: "Selective vapor-phase hydrogenation of furfural to furfuryl alcohol",
    reactants: ["furfural", "h2"],
    products: ["furfuryl_alcohol"],
    enthalpyKjPerMol: -78,
    reactionType: "synthesis",
    description: "Eco-friendly Cu-based hydrogenation converting biomass furfural into furfuryl alcohol for corrosion-resistant furan foundry resins.",
    observableEffects: [
      { type: "color_change", description: "Red-brown furfural hydrogenates into clear, straw-yellow liquid with characteristic odor", colorFrom: "#9A3412", colorTo: "#FEF08A" }
    ],
    tempMin: 110,
    tempMax: 140
  },
  {
    id: "green-024-furfuryl-alcohol-thfa-hydrogenation",
    name: "Complete ring saturation of furfuryl alcohol to tetrahydrofurfuryl alcohol (THFA)",
    reactants: ["furfuryl_alcohol", "h2"],
    products: ["thfa"],
    enthalpyKjPerMol: -165,
    reactionType: "synthesis",
    description: "Total ring saturation over Ru/C catalyst synthesizing non-ozone-depleting, water-miscible green specialty solvent THFA.",
    observableEffects: [
      { type: "temperature_increase", description: "Exothermic ring hydrogenation requiring continuous reactor cooling" }
    ],
    tempMin: 100,
    tempMax: 130
  },
  {
    id: "green-025-hmf-catalytic-oxidation-fdca",
    name: "Aerobic catalytic oxidation of 5-HMF to 2,5-furandicarboxylic acid (FDCA)",
    reactants: ["hmf_5", "o2"],
    products: ["fdca", "water"],
    enthalpyKjPerMol: -490,
    reactionType: "synthesis",
    description: "Pt/C or Co-Mn-Br catalyzed aerobic oxidation producing FDCA, the 100% bio-based replacement for petroleum terephthalic acid in PEF bottles.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of pure white crystalline FDCA powder from aqueous acidic medium", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 70,
    tempMax: 120
  },
  {
    id: "green-026-hmf-rehydration-levulinic-acid",
    name: "Acid-catalyzed rehydration of 5-HMF to levulinic acid and formic acid",
    reactants: ["hmf_5", "water"],
    products: ["levulinic_acid", "hcooh"],
    enthalpyKjPerMol: -42,
    reactionType: "decomposition",
    description: "Brønsted acid catalyzed hydrolytic ring cleavage of 5-HMF yielding equimolar keto-acid levulinic acid and formic acid.",
    observableEffects: [
      { type: "color_change", description: "Reaction liquor darkens with traces of insoluble brown humin microparticles", colorTo: "#451A03" }
    ],
    solvent: "water",
    tempMin: 140,
    tempMax: 180
  },
  {
    id: "green-027-levulinic-acid-hydrogenation-gvl",
    name: "Catalytic hydrogenation of levulinic acid to gamma-valerolactone (GVL)",
    reactants: ["levulinic_acid", "h2"],
    products: ["gamma_valerolactone", "water"],
    enthalpyKjPerMol: -55,
    reactionType: "synthesis",
    description: "Hydrogenation and intramolecular lactonization over Ru/C yielding gamma-valerolactone (GVL), a non-toxic renewable polar aprotic solvent.",
    observableEffects: [
      { type: "phase_change", description: "Crystalline levulinic acid converts into clear mobile aromatic lactone liquid" }
    ],
    tempMin: 130,
    tempMax: 170
  },
  {
    id: "green-028-gvl-ring-opening-pentanoic-acid",
    name: "Ring-opening hydrogenolysis of gamma-valerolactone to pentanoic acid",
    reactants: ["gamma_valerolactone", "h2"],
    products: ["valeric_acid"],
    enthalpyKjPerMol: -48,
    reactionType: "redox_other",
    description: "Dual bifunctional metal-acid catalyzed cleavage of GVL producing valeric acid (valerate biofuels and plasticizer esters).",
    observableEffects: [
      { type: "phase_change", description: "Formation of pungent bio-valeric acid organic layer" }
    ],
    tempMin: 220,
    tempMax: 260
  },
  {
    id: "green-029-gvl-decarboxylation-butene",
    name: "Catalytic decarboxylation of gamma-valerolactone to 1-butene and CO2",
    reactants: ["gamma_valerolactone"],
    products: ["c4h8_1butene", "co2"],
    enthalpyKjPerMol: 95,
    reactionType: "decomposition",
    description: "Zeolite-catalyzed high-temperature cleavage producing bio-butene olefins for sustainable synthetic aviation fuels.",
    observableEffects: [
      { type: "gas_evolution", description: "Continuous stream of gaseous 1-butene and carbon dioxide off-gas", relatedChemicalId: "c4h8_1butene" }
    ],
    tempMin: 280,
    tempMax: 350
  },
  {
    id: "green-030-glucose-catalytic-hydrogenation-sorbitol",
    name: "Industrial catalytic hydrogenation of D-glucose to D-sorbitol",
    reactants: ["glucose", "h2"],
    products: ["sorbitol"],
    enthalpyKjPerMol: -65,
    reactionType: "synthesis",
    description: "High-pressure Raney nickel or ruthenium catalyzed reduction of glucose aldehyde group producing crystalline D-sorbitol.",
    observableEffects: [
      { type: "color_change", description: "Golden corn syrup clears into colorless sweet sorbitol solution", colorFrom: "#FDE68A", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 110,
    tempMax: 140
  },
  {
    id: "green-031-sorbitol-double-dehydration-isosorbide",
    name: "Acid-catalyzed double dehydration of D-sorbitol to isosorbide",
    reactants: ["sorbitol"],
    products: ["isosorbide", "water"],
    enthalpyKjPerMol: 38,
    reactionType: "decomposition",
    description: "Sequential bicyclic etherification yielding rigid bio-diol isosorbide for high-Tg optical polycarbonate resins and BPA-free coatings.",
    observableEffects: [
      { type: "precipitation", description: "Crystallization of pure white hygroscopic isosorbide crystals", colorTo: "#FFFFFF" }
    ],
    tempMin: 120,
    tempMax: 150
  },
  {
    id: "green-032-glucose-isomerization-fructose",
    name: "Chemo-enzymatic isomerization of D-glucose to D-fructose",
    reactants: ["glucose"],
    products: ["fructose"],
    enthalpyKjPerMol: 3.5,
    reactionType: "unclassified",
    description: "Immobilized glucose isomerase or Lewis acidic Sn-Beta zeolite catalyzed aldose-to-ketose isomerization providing enriched feed for 5-HMF.",
    observableEffects: [
      { type: "phase_change", description: "Equilibrium shifts to high-fructose bio-syrup" }
    ],
    solvent: "water",
    tempMin: 55,
    tempMax: 90
  },
  {
    id: "green-033-cellobiose-hydrolysis-glucose",
    name: "Enzymatic / solid acid hydrolysis of cellobiose to D-glucose",
    reactants: ["cellobiose", "water"],
    products: ["glucose"],
    enthalpyKjPerMol: -15,
    reactionType: "decomposition",
    description: "Complete cleavage of beta-1,4-glucosidic bond by beta-glucosidase producing fermentable glucose monomer without byproduct degradation.",
    observableEffects: [
      { type: "phase_change", description: "Complete solubilization into clear, fermentable monosaccharide syrup" }
    ],
    solvent: "water",
    tempMin: 45,
    tempMax: 60
  },
  {
    id: "green-034-gluconic-acid-aerobic-oxidation",
    name: "Mild aerobic bio-catalytic oxidation of glucose to D-gluconic acid",
    reactants: ["glucose", "o2"],
    products: ["gluconic_acid"],
    enthalpyKjPerMol: -195,
    reactionType: "synthesis",
    description: "Glucose oxidase or supported gold nanoparticle catalyzed selective C1 oxidation yielding non-toxic biodegradable chelating agent gluconic acid.",
    observableEffects: [
      { type: "temperature_increase", description: "Mild exothermic enzymatic heat evolution" }
    ],
    solvent: "water",
    tempMin: 30,
    tempMax: 50
  },
  {
    id: "green-035-glucaric-acid-catalytic-oxidation",
    name: "Selective catalytic oxidation of glucose to D-glucaric acid (aldaric acid)",
    reactants: ["glucose", "o2"],
    products: ["glucaric_acid", "water"],
    enthalpyKjPerMol: -410,
    reactionType: "synthesis",
    description: "Terminal C1 and C6 selective oxidation producing glucaric acid, a top-12 DOE bio-based platform chemical for nylon and detergent builders.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of mono-potassium D-glucarate upon controlled neutralization", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 60,
    tempMax: 90
  },
  {
    id: "green-036-itaconic-acid-fermentation-recovery",
    name: "Aspergillus terreus fermentation crystallization of itaconic acid",
    reactants: ["glucose", "o2"],
    products: ["itaconic_acid", "co2", "water"],
    enthalpyKjPerMol: -620,
    reactionType: "decomposition",
    description: "Bio-fermentative synthesis of unsaturated dicarboxylic itaconic acid, an eco-friendly replacement for acrylic acid and maleic anhydride.",
    observableEffects: [
      { type: "precipitation", description: "Direct cooling crystallization of brilliant white itaconic acid crystals", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 35,
    tempMax: 40
  },
  {
    id: "green-037-itaconic-acid-decarboxylation-methacrylic",
    name: "Catalytic decarboxylation of itaconic acid to bio-methacrylic acid",
    reactants: ["itaconic_acid"],
    products: ["methacrylic_acid", "co2"],
    enthalpyKjPerMol: 42,
    reactionType: "decomposition",
    description: "Subcritical water decarboxylation synthesizing bio-methacrylic acid (MAA) for 100% renewable PMMA (Plexiglas) polymers.",
    observableEffects: [
      { type: "gas_evolution", description: "Vigorous evolution of carbon dioxide gas", relatedChemicalId: "co2" }
    ],
    solvent: "water",
    tempMin: 220,
    tempMax: 260
  },
  {
    id: "green-038-levulinic-acid-esterification-ethyl-levulinate",
    name: "Esterification of levulinic acid with bio-ethanol to ethyl levulinate",
    reactants: ["levulinic_acid", "c2h5oh"],
    products: ["ethyl_levulinate", "water"],
    enthalpyKjPerMol: -8.5,
    reactionType: "synthesis",
    description: "Solid acid catalyzed esterification producing ethyl levulinate, a green fragrance compound and high-cetane oxygenated biodiesel blendstock.",
    observableEffects: [
      { type: "phase_change", description: "Formation of clear fragrant ester liquid with sweet caramel-ester aroma" }
    ],
    tempMin: 75,
    tempMax: 95
  },
  {
    id: "green-039-furfural-oxidation-maleic-anhydride",
    name: "Gas-phase selective catalytic oxidation of furfural to maleic anhydride",
    reactants: ["furfural", "o2"],
    products: ["maleic_anhydride", "co2", "water"],
    enthalpyKjPerMol: -850,
    reactionType: "synthesis",
    description: "Vanadyl pyrophosphate (VPO) catalyzed aerobic oxidation replacing benzene/butane with furfural for commercial maleic anhydride synthesis.",
    observableEffects: [
      { type: "precipitation", description: "Sublimation and crystallization of pure white maleic anhydride needles", colorTo: "#FFFFFF" }
    ],
    tempMin: 300,
    tempMax: 350
  },
  {
    id: "green-040-furan-decarbonylation-furfural",
    name: "Catalytic vapor-phase decarbonylation of furfural to furan",
    reactants: ["furfural"],
    products: ["furan", "co"],
    enthalpyKjPerMol: 52,
    reactionType: "decomposition",
    description: "Pd/Al2O3 promoted extrusion of carbon monoxide producing pure furan as precursor for bio-tetrahydrofuran (THF).",
    observableEffects: [
      { type: "gas_evolution", description: "Release of carbon monoxide off-gas with low-boiling furan distillate (bp 31 °C)", relatedChemicalId: "co" }
    ],
    tempMin: 200,
    tempMax: 240
  },

  // 41-60: Lignin Valorization, Bio-phenols & Aromatic Biorefinery
  {
    id: "green-041-vanillin-aerobic-oxidation-vanillic-acid",
    name: "Catalytic aerobic oxidation of lignin-derived vanillin to vanillic acid",
    reactants: ["vanillin", "o2"],
    products: ["vanillic_acid"],
    enthalpyKjPerMol: -260,
    reactionType: "synthesis",
    description: "Heterogeneous Au-Pd/TiO2 catalyzed green oxidation converting pulp-mill lignin vanillin into vanillic acid monomer for bio-polyesters.",
    observableEffects: [
      { type: "precipitation", description: "Crystallization of pure white needle-like crystals of vanillic acid", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 60,
    tempMax: 90
  },
  {
    id: "green-042-vanillin-decarboxylation-guaiacol",
    name: "Catalytic gas-phase decarboxylation of vanillic acid to guaiacol",
    reactants: ["vanillic_acid"],
    products: ["guaiacol", "co2"],
    enthalpyKjPerMol: 45,
    reactionType: "decomposition",
    description: "Thermal decarboxylation producing pure bio-guaiacol (2-methoxyphenol) replacing petrochemical phenols in resins and flavors.",
    observableEffects: [
      { type: "gas_evolution", description: "Effervescence of carbon dioxide leaving smoky aromatic guaiacol oil", relatedChemicalId: "co2" }
    ],
    tempMin: 200,
    tempMax: 240
  },
  {
    id: "green-043-syringaldehyde-oxidation-syringic-acid",
    name: "Aerobic oxidation of hardwood lignin syringaldehyde to syringic acid",
    reactants: ["syringaldehyde", "o2"],
    products: ["syringic_acid"],
    enthalpyKjPerMol: -255,
    reactionType: "synthesis",
    description: "Selective bio-refinery oxidation of 3,5-dimethoxy-4-hydroxybenzaldehyde yielding antioxidant syringic acid.",
    observableEffects: [
      { type: "precipitation", description: "Formation of pale-cream crystalline syringic acid precipitate", colorTo: "#FEF9C3" }
    ],
    tempMin: 60,
    tempMax: 90
  },
  {
    id: "green-044-ferulic-acid-decarboxylation-vinylguaiacol",
    name: "Bio-catalytic decarboxylation of ferulic acid to 4-vinylguaiacol",
    reactants: ["ferulic_acid"],
    products: ["vinylguaiacol_4", "co2"],
    enthalpyKjPerMol: 38,
    reactionType: "decomposition",
    description: "Phenolic acid decarboxylase (PAD) catalyzed conversion of bran-derived ferulic acid into 4-vinylguaiacol, a clove/spicy aroma chemical and reactive styrene monomer.",
    observableEffects: [
      { type: "gas_evolution", description: "Continuous evolution of CO2 gas with accumulation of spicy fragrant oil", relatedChemicalId: "co2" }
    ],
    solvent: "water",
    tempMin: 35,
    tempMax: 45
  },
  {
    id: "green-045-eugenol-catalytic-isomerization-isoeugenol",
    name: "Base-catalyzed isomerization of natural eugenol to isoeugenol",
    reactants: ["eugenol"],
    products: ["isoeugenol"],
    enthalpyKjPerMol: -18,
    reactionType: "unclassified",
    description: "KOH-catalyzed double-bond conjugation of clove oil eugenol to trans-isoeugenol, the key intermediate for semi-synthetic vanillin.",
    observableEffects: [
      { type: "color_change", description: "Clear oil deepens to golden yellow with rich floral carnation fragrance", colorFrom: "#FEF08A", colorTo: "#EAB308" }
    ],
    tempMin: 180,
    tempMax: 210,
    catalystChemicalId: "koh"
  },
  {
    id: "green-046-isoeugenol-oxidative-cleavage-vanillin",
    name: "Mild catalytic oxidative cleavage of isoeugenol to bio-vanillin",
    reactants: ["isoeugenol", "o2"],
    products: ["vanillin", "ch3cho"],
    enthalpyKjPerMol: -285,
    reactionType: "decomposition",
    description: "Transition-metal catalyzed green aerobic cleavage of conjugated alkene yielding natural-grade vanillin and acetaldehyde byproduct.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of sweet-scented ivory vanillin crystals upon chilling", colorTo: "#FEF9C3" }
    ],
    tempMin: 50,
    tempMax: 80
  },
  {
    id: "green-047-lignin-model-guaiacol-demethylation-catechol",
    name: "Hydrothermal catalytic demethylation of guaiacol to catechol",
    reactants: ["guaiacol", "water"],
    products: ["catechol", "ch3oh"],
    enthalpyKjPerMol: 24,
    reactionType: "double_displacement",
    description: "Subcritical water ether cleavage producing catechol and methanol as a route to bio-based polyphenols.",
    observableEffects: [
      { type: "phase_change", description: "Separation into water-soluble catechol crystals upon cooling" }
    ],
    solvent: "water",
    tempMin: 250,
    tempMax: 300
  },
  {
    id: "green-048-catechol-o-methylation-veratrole",
    name: "Atom-efficient green methylation of catechol with dimethyl carbonate",
    reactants: ["catechol", "dimethyl_carbonate"],
    products: ["veratrole", "ch3oh", "co2"],
    enthalpyKjPerMol: -32,
    reactionType: "synthesis",
    description: "Non-toxic phosgene/halide-free alkylation using DMC as green methylating agent synthesizing 1,2-dimethoxybenzene (veratrole).",
    observableEffects: [
      { type: "gas_evolution", description: "Release of carbon dioxide off-gas", relatedChemicalId: "co2" }
    ],
    tempMin: 140,
    tempMax: 180,
    catalystChemicalId: "k2co3"
  },
  {
    id: "green-049-lignin-hydrodeoxygenation-cyclohexane",
    name: "Complete catalytic hydrodeoxygenation of phenol to cyclohexane",
    reactants: ["phenol", "h2"],
    products: ["cyclohexane", "water"],
    enthalpyKjPerMol: -215,
    reactionType: "redox_other",
    description: "Total deoxygenation over bifunctional Ni-Re/zeolite catalysts converting lignin-derived monophenols into drop-in naphthenic aviation fuels.",
    observableEffects: [
      { type: "phase_change", description: "Aromatic solid dissolves and hydrogenates into low-density clear hydrocarbon fuel layer" }
    ],
    tempMin: 220,
    tempMax: 280
  },
  {
    id: "green-050-cresol-selective-hydrodeoxygenation-toluene",
    name: "Direct selective hydrodeoxygenation of p-cresol to bio-toluene",
    reactants: ["p_cresol", "h2"],
    products: ["toluene", "water"],
    enthalpyKjPerMol: -88,
    reactionType: "redox_other",
    description: "Mo2C or Ru/TiO2 promoted direct C-O cleavage preserving aromatic ring yielding 100% bio-derived BTX toluene.",
    observableEffects: [
      { type: "phase_change", description: "Phenolic oil converts into mobile immiscible toluene aromatic top layer" }
    ],
    tempMin: 250,
    tempMax: 320
  },
  {
    id: "green-051-coniferyl-alcohol-dehydrogenative-polymerization",
    name: "Enzymatic peroxidase polymerization of coniferyl alcohol to synthetic lignin",
    reactants: ["coniferyl_alcohol", "h2o2"],
    products: ["dehydrogenation_polymer_dhp", "water"],
    enthalpyKjPerMol: -145,
    reactionType: "synthesis",
    description: "Biomimetic in-vitro synthesis of synthetic lignin (DHP) using horseradish peroxidase to study carbon sequestration mechanisms.",
    observableEffects: [
      { type: "precipitation", description: "Formation of insoluble amorphous light-brown lignin polymer flakes", colorTo: "#A16207" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 30
  },
  {
    id: "green-052-lignosulfonate-kraft-desulfonation",
    name: "Hydrothermal desulfonation of paper mill lignosulfonate to pure lignin",
    reactants: ["lignosulfonate_model", "naoh"],
    products: ["kraft_lignin_phenolate", "na2so3"],
    enthalpyKjPerMol: -52,
    reactionType: "double_displacement",
    description: "Valorization of industrial black liquor recovering sulfur-free aromatic biopolymers for polyurethane polyols.",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of purified dark brown Kraft lignin upon acidification to pH 2", colorTo: "#3B1B06" }
    ],
    solvent: "water",
    tempMin: 160,
    tempMax: 200
  },
  {
    id: "green-053-resorcinol-condensation-formaldehyde",
    name: "Green water-based sol-gel polycondensation of resorcinol and formaldehyde",
    reactants: ["resorcinol", "formaldehyde"],
    products: ["resorcinol_formaldehyde_gel", "water"],
    enthalpyKjPerMol: -78,
    reactionType: "synthesis",
    description: "Aqueous crosslinking forming dark-red monolithic hydrogel precursor for high-surface-area carbon aerogels and supercapacitors.",
    observableEffects: [
      { type: "color_change", description: "Colorless solution turns deep wine-red and solidifies into rigid monolithic hydrogel", colorFrom: "#F8FAFC", colorTo: "#881337" }
    ],
    solvent: "water",
    tempMin: 50,
    tempMax: 85,
    catalystChemicalId: "na2co3"
  },
  {
    id: "green-054-tannic-acid-iron-crosslinking",
    name: "Metal-phenolic network crosslinking of bio-derived tannic acid with Fe(III)",
    reactants: ["tannic_acid", "fecl3"],
    products: ["fe_tannate_hydrogel", "hcl"],
    enthalpyKjPerMol: -65,
    reactionType: "synthesis",
    description: "Rapid, reversible coordination of natural plant polyphenols with ferric ions creating multifunctional self-healing underwater adhesive hydrogels.",
    observableEffects: [
      { type: "color_change", description: "Instantaneous shift to intense blue-black colloidal coordination complex", colorTo: "#0F172A" },
      { type: "phase_change", description: "Sol-to-gel transition within seconds" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 35
  },
  {
    id: "green-055-curcumin-borate-complexation-rosocyanine",
    name: "Complexation of turmeric curcumin with boric acid yielding rosocyanine",
    reactants: ["curcumin", "h3bo3", "oxalic_acid"],
    products: ["rosocyanine_complex", "water"],
    enthalpyKjPerMol: -42,
    reactionType: "synthesis",
    description: "Spectrophotometric green analytical complexation reaction yielding deep crimson-red rosocyanine complex for trace boron quantification.",
    observableEffects: [
      { type: "color_change", description: "Vibrant yellow curcumin converts into brilliant ruby-red rosocyanine pigment", colorFrom: "#EAB308", colorTo: "#BE123C" }
    ],
    solvent: "ethanol",
    tempMin: 20,
    tempMax: 60
  },

  // 56-80: CO2 Utilization, Hydrogen Energy, Power-to-X & Green Inorganic Syntheses
  {
    id: "green-056-co2-catalytic-hydrogenation-methanol",
    name: "Direct catalytic hydrogenation of captured CO2 to green methanol",
    reactants: ["co2", "h2"],
    products: ["ch3oh", "water"],
    enthalpyKjPerMol: -49.5,
    reactionType: "synthesis",
    description: "Commercial Cu/ZnO/Al2O3 catalyzed Power-to-Liquid reaction sequestering point-source CO2 and green H2 into drop-in renewable methanol.",
    observableEffects: [
      { type: "temperature_increase", description: "Exothermic high-pressure catalytic synthesis" },
      { type: "phase_change", description: "Gaseous CO2 and H2 condense into clear aqueous methanol product stream" }
    ],
    tempMin: 220,
    tempMax: 260
  },
  {
    id: "green-057-reverse-water-gas-shift-rwgs",
    name: "Reverse water-gas shift (RWGS) reaction converting CO2 to synthesis gas CO",
    reactants: ["co2", "h2"],
    products: ["co", "water"],
    enthalpyKjPerMol: 41.2,
    reactionType: "redox_other",
    description: "Endothermic catalytic conversion over Pt/CeO2 producing renewable carbon monoxide building block for Fischer-Tropsch sustainable aviation fuels.",
    observableEffects: [
      { type: "temperature_increase", description: "High-temperature equilibrium conversion (>600 °C)" }
    ],
    tempMin: 600,
    tempMax: 850
  },
  {
    id: "green-058-sabatier-methanation-power-to-gas",
    name: "Sabatier catalytic methanation of CO2 for renewable Power-to-Gas storage",
    reactants: ["co2", "h2"],
    products: ["ch4", "water"],
    enthalpyKjPerMol: -165,
    reactionType: "synthesis",
    description: "Highly exothermic Ni-catalyzed methanation transforming captured CO2 and electrolytic hydrogen into pipeline-ready synthetic natural gas (SNG).",
    observableEffects: [
      { type: "temperature_increase", description: "Strong thermal release requiring multi-stage intercooled fixed beds" }
    ],
    tempMin: 300,
    tempMax: 400
  },
  {
    id: "green-059-dry-reforming-of-methane-drm",
    name: "Dry reforming of biogas methane with carbon dioxide (DRM)",
    reactants: ["ch4", "co2"],
    products: ["co", "h2"],
    enthalpyKjPerMol: 247,
    reactionType: "redox_other",
    description: "Catalytic conversion of two principal greenhouse gases over Ni-MgO catalysts into equimolar 1:1 H2/CO synthesis gas.",
    observableEffects: [
      { type: "temperature_increase", description: "Intensely endothermic high-temperature reaction" }
    ],
    tempMin: 750,
    tempMax: 900
  },
  {
    id: "green-060-co2-ethylene-oxide-ethylene-carbonate",
    name: "Atom-economic insertion of CO2 into ethylene oxide yielding ethylene carbonate",
    reactants: ["ethylene_oxide", "co2"],
    products: ["ethylene_carbonate"],
    enthalpyKjPerMol: -140,
    reactionType: "synthesis",
    description: "100% atom-economic cycloaddition catalyzed by quaternary ammonium halides fixing CO2 into battery electrolyte solvent ethylene carbonate.",
    observableEffects: [
      { type: "precipitation", description: "Gas-liquid reaction solidifies into white crystalline ethylene carbonate (mp 36 °C)", colorTo: "#FFFFFF" }
    ],
    tempMin: 100,
    tempMax: 150
  },
  {
    id: "green-061-co2-propylene-oxide-propylene-carbonate",
    name: "Catalytic cycloaddition of CO2 with propylene oxide to propylene carbonate",
    reactants: ["propylene_oxide", "co2"],
    products: ["propylene_carbonate"],
    enthalpyKjPerMol: -135,
    reactionType: "synthesis",
    description: "Industrial non-volatile carbon-capture process synthesizing high-boiling non-toxic polar green solvent propylene carbonate.",
    observableEffects: [
      { type: "phase_change", description: "Volatile epoxide liquid absorbs CO2 gas forming high-boiling clear viscous liquid" }
    ],
    tempMin: 120,
    tempMax: 160
  },
  {
    id: "green-062-electrochemical-co2-reduction-formic-acid",
    name: "Electrocatalytic reduction of CO2 to formic acid on tin/bismuth gas-diffusion cathode",
    reactants: ["co2", "water"],
    products: ["hcooh", "o2"],
    enthalpyKjPerMol: 270,
    reactionType: "redox_other",
    description: "Ambient-temperature direct electrochemical conversion of CO2 into pure liquid formic acid at >90% Faradaic efficiency in flow cells.",
    observableEffects: [
      { type: "gas_evolution", description: "Oxygen gas bubble evolution at anode with accumulation of pure liquid formic acid", relatedChemicalId: "o2" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 40
  },
  {
    id: "green-063-electrochemical-co2-reduction-ethylene",
    name: "Electrochemical C-C coupling reduction of CO2 to bio-ethylene on copper",
    reactants: ["co2", "water"],
    products: ["c2h4", "o2"],
    enthalpyKjPerMol: 1410,
    reactionType: "redox_other",
    description: "Multi-electron reduction of CO2 on nanostructured copper gas-diffusion electrodes synthesizing green ethylene for carbon-neutral polymers.",
    observableEffects: [
      { type: "gas_evolution", description: "Copious evolution of combustible ethylene gas mixed with unreacted CO2", relatedChemicalId: "c2h4" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 45
  },
  {
    id: "green-064-pem-water-electrolysis-green-hydrogen",
    name: "Proton exchange membrane (PEM) water electrolysis generating green hydrogen",
    reactants: ["water"],
    products: ["h2", "o2"],
    enthalpyKjPerMol: 286,
    reactionType: "decomposition",
    description: "Zero-carbon water splitting powered by renewable wind/solar producing high-pressure pure H2 (>99.999%) and breathable oxygen.",
    observableEffects: [
      { type: "gas_evolution", description: "Vigorous continuous evolution of pure H2 at cathode and pure O2 at anode", relatedChemicalId: "h2" }
    ],
    solvent: "water",
    tempMin: 50,
    tempMax: 80
  },
  {
    id: "green-065-alkaline-water-electrolysis-her-oer",
    name: "Commercial alkaline water electrolysis in 30 wt% KOH electrolyte",
    reactants: ["water"],
    products: ["h2", "o2"],
    enthalpyKjPerMol: 286,
    reactionType: "decomposition",
    description: "Earth-abundant Raney-nickel catalyzed water dissociation operating at low capital cost for gigawatt-scale hydrogen production.",
    observableEffects: [
      { type: "gas_evolution", description: "Rapid effervescence of stoichiometric 2:1 hydrogen and oxygen gases", relatedChemicalId: "h2" }
    ],
    solvent: "water",
    tempMin: 60,
    tempMax: 90
  },
  {
    id: "green-066-haber-bosch-green-ammonia",
    name: "Low-carbon Haber-Bosch ammonia synthesis using green hydrogen and N2",
    reactants: ["n2", "h2"],
    products: ["nh3"],
    enthalpyKjPerMol: -92.4,
    reactionType: "synthesis",
    description: "Catalytic synthesis of green ammonia fuel and zero-carbon fertilizer over wüstite-based promoted iron catalyst.",
    observableEffects: [
      { type: "temperature_increase", description: "Exothermic high-pressure catalytic synthesis" },
      { type: "phase_change", description: "Condensation of liquid anhydrous ammonia in chilling separators" }
    ],
    tempMin: 400,
    tempMax: 480
  },
  {
    id: "green-067-ammonia-cracking-hydrogen-release",
    name: "Catalytic cracking of green ammonia for on-demand hydrogen release",
    reactants: ["nh3"],
    products: ["n2", "h2"],
    enthalpyKjPerMol: 92.4,
    reactionType: "decomposition",
    description: "Endothermic cracking over Ru/Al2O3 or Ni/Al2O3 enabling long-distance transport of dense liquid ammonia as high-density hydrogen vector.",
    observableEffects: [
      { type: "gas_evolution", description: "Decomposition into 75% H2 and 25% N2 fuel stream for proton-exchange fuel cells", relatedChemicalId: "h2" }
    ],
    tempMin: 500,
    tempMax: 650
  },
  {
    id: "green-068-urea-synthesis-green-ammonia-co2",
    name: "Dual-sequestration industrial synthesis of urea from green NH3 and captured CO2",
    reactants: ["nh3", "co2"],
    products: ["urea", "water"],
    enthalpyKjPerMol: -105,
    reactionType: "synthesis",
    description: "Biazzi/Stamicarbon process combining two waste/byproduct gases under high pressure into solid non-hazardous nitrogen fertilizer.",
    observableEffects: [
      { type: "precipitation", description: "Prilling crystallization of dense white spherical urea granules", colorTo: "#FFFFFF" }
    ],
    tempMin: 180,
    tempMax: 200
  },
  {
    id: "green-069-bioethanol-steam-reforming",
    name: "Catalytic steam reforming of bio-ethanol for decentralized green H2",
    reactants: ["c2h5oh", "water"],
    products: ["co2", "h2"],
    enthalpyKjPerMol: 174,
    reactionType: "redox_other",
    description: "Cobalt or rhodium catalyzed complete reforming of fermentation ethanol generating 6 moles of H2 per mole of bio-ethanol.",
    observableEffects: [
      { type: "gas_evolution", description: "Copious generation of hydrogen-rich reformate gas", relatedChemicalId: "h2" }
    ],
    tempMin: 550,
    tempMax: 700
  },
  {
    id: "green-070-glycerol-steam-reforming",
    name: "Catalytic steam reforming of crude biodiesel glycerol to green syngas",
    reactants: ["glycerol", "water"],
    products: ["co2", "h2"],
    enthalpyKjPerMol: 251,
    reactionType: "redox_other",
    description: "High-yield thermodynamic conversion of surplus glycerol generating 7 moles of renewable hydrogen per mole of glycerol.",
    observableEffects: [
      { type: "gas_evolution", description: "Vigorous continuous evolution of renewable hydrogen gas", relatedChemicalId: "h2" }
    ],
    tempMin: 600,
    tempMax: 750
  },
  {
    id: "green-071-calcium-looping-co2-capture-calcination",
    name: "Solar-thermal calcination of CaCO3 in calcium looping carbon capture",
    reactants: ["caco3"],
    products: ["cao", "co2"],
    enthalpyKjPerMol: 178,
    reactionType: "decomposition",
    description: "High-temperature regenerator stage of reversible Calcium Looping (CaL) releasing pure, pipeline-ready CO2 for geological sequestration.",
    observableEffects: [
      { type: "gas_evolution", description: "Release of 100% pure CO2 gas stream from white limestone body", relatedChemicalId: "co2" }
    ],
    tempMin: 850,
    tempMax: 950
  },
  {
    id: "green-072-calcium-looping-carbonation-capture",
    name: "Fluidized-bed carbonation capture of flue-gas CO2 by calcium oxide (CaO)",
    reactants: ["cao", "co2"],
    products: ["caco3"],
    enthalpyKjPerMol: -178,
    reactionType: "synthesis",
    description: "Fast exothermic capture of dilute CO2 from industrial cement/steel flue gases at 650 °C forming solid calcium carbonate.",
    observableEffects: [
      { type: "temperature_increase", description: "Exothermic heat recovery integrated into high-efficiency steam turbines" }
    ],
    tempMin: 600,
    tempMax: 680
  },
  {
    id: "green-073-olivine-mineral-carbonation-co2",
    name: "Permanent mineral carbonation of natural olivine (forsterite) with CO2",
    reactants: ["mg2sio4", "co2"],
    products: ["mgco3", "sio2"],
    enthalpyKjPerMol: -90,
    reactionType: "double_displacement",
    description: "Thermodynamically spontaneous geological mineralization permanently locking away anthropogenic CO2 as inert solid magnesite rock for millennia.",
    observableEffects: [
      { type: "precipitation", description: "Conversion of green olivine minerals into solid white magnesite and silica matrix", colorFrom: "#65A30D", colorTo: "#F8FAFC" }
    ],
    tempMin: 150,
    tempMax: 200
  },
  {
    id: "green-074-serpentine-mineral-carbonation-co2",
    name: "Aqueous mineral carbonation of heat-activated serpentine with CO2",
    reactants: ["mg3si2o5_oh4", "co2"],
    products: ["mgco3", "sio2", "water"],
    enthalpyKjPerMol: -64,
    reactionType: "double_displacement",
    description: "Accelerated ex-situ carbon mineralization of ultramafic mine tailings generating stable solid carbonates and building materials.",
    observableEffects: [
      { type: "precipitation", description: "Formation of dense carbonate mineral precipitate locking 0.5 tons CO2 per ton mineral", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 120,
    tempMax: 180
  },
  {
    id: "green-075-wollastonite-mineral-carbonation-co2",
    name: "Rapid carbonation of calcium silicate (wollastonite) for green concrete",
    reactants: ["casio3", "co2"],
    products: ["caco3", "sio2"],
    enthalpyKjPerMol: -87,
    reactionType: "double_displacement",
    description: "CO2 curing of calcium silicate cements permanently trapping CO2 while simultaneously accelerating structural compressive strength.",
    observableEffects: [
      { type: "phase_change", description: "Slurry hardens rapidly into high-strength permanent carbon-cured stone" }
    ],
    tempMin: 40,
    tempMax: 90
  },

  // 76-100: Bio-based Polymers, Circular Recycling & Green Catalytic Processes
  {
    id: "green-076-lactic-acid-dimerization-lactide",
    name: "Thermal oligomerization and catalytic cyclization of L-lactic acid to L-lactide",
    reactants: ["lactic_acid"],
    products: ["l_lactide", "water"],
    enthalpyKjPerMol: 22,
    reactionType: "synthesis",
    description: "Two-stage depolymerization-cyclization over Sn(II) catalysts generating pure optical-grade L-lactide cyclic dimer.",
    observableEffects: [
      { type: "precipitation", description: "Distillation and crystallization of brilliant white crystalline L-lactide needles", colorTo: "#FFFFFF" }
    ],
    tempMin: 180,
    tempMax: 220
  },
  {
    id: "green-077-lactide-ring-opening-polymerization-pla",
    name: "Ring-opening polymerization (ROP) of L-lactide to poly(lactic acid) (PLA)",
    reactants: ["l_lactide"],
    products: ["polylactic_acid_repeat"],
    enthalpyKjPerMol: -28,
    reactionType: "synthesis",
    description: "Solvent-free bulk coordination-insertion polymerization catalyzed by stannous octoate synthesizing high-molecular-weight biodegradable PLA plastic.",
    observableEffects: [
      { type: "phase_change", description: "Low-viscosity molten lactide thickens into clear, tough high-molecular-weight polymer melt", colorTo: "#F8FAFC" }
    ],
    tempMin: 160,
    tempMax: 190
  },
  {
    id: "green-078-pla-chemical-hydrolysis-recycling",
    name: "Circular chemical recycling: complete hydrothermal depolymerization of PLA",
    reactants: ["polylactic_acid_repeat", "water"],
    products: ["lactic_acid"],
    enthalpyKjPerMol: 28,
    reactionType: "decomposition",
    description: "Complete closed-loop chemical recycling converting post-consumer PLA plastic waste back to monomeric lactic acid at 99% recovery.",
    observableEffects: [
      { type: "phase_change", description: "Solid plastic dissolves completely into clear concentrated lactic acid solution" }
    ],
    solvent: "water",
    tempMin: 120,
    tempMax: 160
  },
  {
    id: "green-079-pet-glycolysis-recycling-bhet",
    name: "Catalytic glycolysis chemical recycling of PET bottle waste to BHET",
    reactants: ["pet_repeat", "ethylene_glycol"],
    products: ["bhet_monomer"],
    enthalpyKjPerMol: 18,
    reactionType: "decomposition",
    description: "Zinc-acetate or ionic-liquid catalyzed glycolysis depolymerizing post-consumer PET bottles into pure crystalline bis(2-hydroxyethyl) terephthalate (BHET).",
    observableEffects: [
      { type: "precipitation", description: "Precipitation of pure white crystalline BHET monomer upon chilling hot reaction mixture", colorTo: "#FFFFFF" }
    ],
    solvent: "ethylene_glycol",
    tempMin: 180,
    tempMax: 200
  },
  {
    id: "green-080-pet-methanolysis-dmt-recycling",
    name: "Supercritical methanolysis chemical depolymerization of PET waste to DMT",
    reactants: ["pet_repeat", "ch3oh"],
    products: ["dimethyl_terephthalate", "ethylene_glycol"],
    enthalpyKjPerMol: -12,
    reactionType: "double_displacement",
    description: "High-purity chemical upcycling breaking colored PET waste down to virgin-grade dimethyl terephthalate (DMT) crystals and ethylene glycol.",
    observableEffects: [
      { type: "precipitation", description: "Direct crystallization of sparkling white DMT flakes", colorTo: "#FFFFFF" }
    ],
    tempMin: 180,
    tempMax: 220
  },
  {
    id: "green-081-bio-succinic-acid-synthesis",
    name: "Anaerobic fermentation synthesis of bio-succinic acid from D-glucose",
    reactants: ["glucose", "co2"],
    products: ["succinic_acid"],
    enthalpyKjPerMol: -285,
    reactionType: "synthesis",
    description: "CO2-fixing bacterial fermentation (Actinobacillus succinogenes) capturing carbon into 4-carbon dicarboxylic succinic acid.",
    observableEffects: [
      { type: "precipitation", description: "Cooling crystallization of pure white crystalline succinic acid", colorTo: "#FFFFFF" }
    ],
    solvent: "water",
    tempMin: 35,
    tempMax: 40
  },
  {
    id: "green-082-succinic-acid-hydrogenation-bdo",
    name: "Catalytic aqueous hydrogenation of bio-succinic acid to 1,4-butanediol (BDO)",
    reactants: ["succinic_acid", "h2"],
    products: ["butanediol_14", "water"],
    enthalpyKjPerMol: -115,
    reactionType: "synthesis",
    description: "Ru-Re/C catalyzed complete four-electron reduction providing bio-based 1,4-butanediol for bio-PBS and Spandex polyurethane fibers.",
    observableEffects: [
      { type: "phase_change", description: "Solid dicarboxylic acid dissolves and hydrogenates into clear viscous linear diol liquid" }
    ],
    solvent: "water",
    tempMin: 160,
    tempMax: 200
  },
  {
    id: "green-083-succinic-acid-hydrogenation-thf",
    name: "Dehydrative hydrogenation of bio-succinic acid to bio-tetrahydrofuran (THF)",
    reactants: ["succinic_acid", "h2"],
    products: ["thf", "water"],
    enthalpyKjPerMol: -148,
    reactionType: "synthesis",
    description: "Bifunctional metallic-acid catalytic conversion synthesizing 100% bio-based THF green solvent and poly-THF polytetramethylene ether glycol.",
    observableEffects: [
      { type: "phase_change", description: "Azeotropic distillation of low-boiling bio-THF solvent (bp 66 °C)" }
    ],
    tempMin: 180,
    tempMax: 220
  },
  {
    id: "green-084-pbs-bio-polyester-condensation",
    name: "Polycondensation of bio-succinic acid and bio-1,4-butanediol to PBS",
    reactants: ["succinic_acid", "butanediol_14"],
    products: ["polybutylene_succinate_repeat", "water"],
    enthalpyKjPerMol: -32,
    reactionType: "synthesis",
    description: "Titanium-catalyzed melt esterification producing 100% bio-based, compostable Poly(butylene succinate) (PBS) thermoplastic.",
    observableEffects: [
      { type: "phase_change", description: "Viscous molten condensation produces tough, flexible translucent white thermoplastic pellets", colorTo: "#F8FAFC" }
    ],
    tempMin: 180,
    tempMax: 230
  },
  {
    id: "green-085-bio-ethylene-ethanol-dehydration",
    name: "Industrial vapor-phase catalytic dehydration of bio-ethanol to bio-ethylene",
    reactants: ["c2h5oh"],
    products: ["c2h4", "water"],
    enthalpyKjPerMol: 45,
    reactionType: "decomposition",
    description: "Braskem I'm green process passing sugarcane bio-ethanol over gamma-alumina catalysts producing drop-in bio-ethylene for bio-polyethylene.",
    observableEffects: [
      { type: "gas_evolution", description: "High-volume generation of gaseous ethylene off-gas", relatedChemicalId: "c2h4" }
    ],
    tempMin: 350,
    tempMax: 450
  },
  {
    id: "green-086-photocatalytic-tio2-dye-degradation-rhodamine",
    name: "Solar photocatalytic degradation of toxic Rhodamine B dye over TiO2 (Degussa P25)",
    reactants: ["rhodamine_b", "o2"],
    products: ["co2", "water", "hno3", "hcl"],
    enthalpyKjPerMol: -4120,
    reactionType: "decomposition",
    description: "Advanced oxidation process (AOP) utilizing UV/solar excited TiO2 electron-hole pairs generating hydroxyl radicals (·OH) for total mineralization.",
    observableEffects: [
      { type: "color_change", description: "Intense fluorescent pink solution completely bleaches into crystal-clear mineralized water", colorFrom: "#EC4899", colorTo: "#F8FAFC" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 40
  },
  {
    id: "green-087-fenton-oxidation-phenol-mineralization",
    name: "Classical Fenton advanced oxidation of toxic industrial phenol wastewater",
    reactants: ["phenol", "h2o2"],
    products: ["co2", "water"],
    enthalpyKjPerMol: -3050,
    reactionType: "decomposition",
    description: "Homogeneous Fe2+/H2O2 catalytic generation of aggressive hydroxyl radicals breaking recalcitrant aromatic rings down to CO2 and H2O.",
    observableEffects: [
      { type: "temperature_increase", description: "Rapid exothermic catalytic reaction" },
      { type: "color_change", description: "Solution turns briefly dark brown before clearing into colorless mineralized water", colorFrom: "#451A03", colorTo: "#F8FAFC" }
    ],
    solvent: "water",
    tempMin: 25,
    tempMax: 50,
    catalystChemicalId: "feso4"
  },
  {
    id: "green-088-peroxone-water-treatment-atrazine",
    name: "Peroxone (O3/H2O2) advanced oxidation destruction of pesticide atrazine",
    reactants: ["atrazine", "o3", "h2o2"],
    products: ["co2", "water", "hno3", "hcl"],
    enthalpyKjPerMol: -2890,
    reactionType: "decomposition",
    description: "Synergistic ozone-peroxide radical chain reaction destroying persistent micropollutants and endocrine disruptors in municipal drinking water.",
    observableEffects: [
      { type: "gas_evolution", description: "Trace oxygen microbubbles released during accelerated ozone decay" }
    ],
    solvent: "water",
    tempMin: 15,
    tempMax: 30
  },
  {
    id: "green-089-sodium-percarbonate-green-bleach-dissolution",
    name: "Eco-friendly dissolution and hydrogen peroxide release from sodium percarbonate",
    reactants: ["sodium_percarbonate"],
    products: ["na2co3", "h2o2"],
    enthalpyKjPerMol: 28,
    reactionType: "decomposition",
    description: "Chlorine-free 'solid oxygen bleach' releasing hydrogen peroxide and non-toxic sodium carbonate in laundry wastewater.",
    observableEffects: [
      { type: "gas_evolution", description: "Gentle effervescence of active oxygen microbubbles", relatedChemicalId: "o2" }
    ],
    solvent: "water",
    tempMin: 30,
    tempMax: 60
  },
  {
    id: "green-090-chitosan-glutaraldehyde-crosslinking-adsorbent",
    name: "Green crosslinking of crab-shell bio-waste chitosan with glutaraldehyde",
    reactants: ["chitosan_monomer", "glutaraldehyde"],
    products: ["crosslinked_chitosan_hydrogel", "water"],
    enthalpyKjPerMol: -48,
    reactionType: "synthesis",
    description: "Schiff-base condensation fabricating porous bio-sorbent beads for heavy metal (Cu2+, Pb2+, Cr6+) extraction from industrial effluents.",
    observableEffects: [
      { type: "color_change", description: "Pale yellow chitosan solution gels into insoluble bright orange-brown porous hydrogel beads", colorFrom: "#FEF08A", colorTo: "#EA580C" }
    ],
    solvent: "water",
    tempMin: 25,
    tempMax: 50
  },
  {
    id: "green-091-alginate-calcium-crosslinking-bead-formation",
    name: "Instantaneous ionic crosslinking of seaweed sodium alginate with Ca2+",
    reactants: ["sodium_alginate_repeat", "cacl2"],
    products: ["calcium_alginate_hydrogel", "nacl"],
    enthalpyKjPerMol: -35,
    reactionType: "double_displacement",
    description: "'Egg-box' coordination of divalent calcium cations by guluronate blocks forming biocompatible, edible hydrogel beads for cell/enzyme encapsulation.",
    observableEffects: [
      { type: "phase_change", description: "Instantaneous sol-gel phase change: liquid alginate droplets firm into elastic spherical hydrogel beads" }
    ],
    solvent: "water",
    tempMin: 20,
    tempMax: 35
  },
  {
    id: "green-092-diels-alder-myrcene-itaconic-anhydride",
    name: "Atom-economic solvent-free Diels-Alder reaction of bio-myrcene with maleic anhydride",
    reactants: ["myrcene", "maleic_anhydride"],
    products: ["myrcene_maleic_adduct"],
    enthalpyKjPerMol: -115,
    reactionType: "synthesis",
    description: "100% atom-economic thermal cycloaddition linking terpene from hops/bay leaves with cyclic anhydride yielding bio-based epoxy hardeners.",
    observableEffects: [
      { type: "temperature_increase", description: "Exothermic [4+2] cycloaddition raising reactor temperature" },
      { type: "phase_change", description: "Viscous clear addition adduct solidifies on cooling", colorTo: "#F8FAFC" }
    ],
    tempMin: 60,
    tempMax: 100
  },
  {
    id: "green-093-limonene-epoxidation-bio-monomer",
    name: "Selective mono-epoxidation of citrus waste D-limonene with green peracetic acid",
    reactants: ["limonene", "ch3coooh"],
    products: ["limonene_monoxide", "ch3cooh"],
    enthalpyKjPerMol: -185,
    reactionType: "synthesis",
    description: "Chemoselective electrophilic epoxidation of endocyclic double bond of citrus peel oil producing renewable monomer for bio-polycarbonates.",
    observableEffects: [
      { type: "color_change", description: "Citrus-scented yellow oil converts into clear mono-epoxide with mild minty aroma", colorFrom: "#FDE047", colorTo: "#F8FAFC" }
    ],
    tempMin: 25,
    tempMax: 45
  },
  {
    id: "green-094-limonene-co2-polycarbonate-copolymerization",
    name: "Alternating catalytic copolymerization of limonene oxide with CO2",
    reactants: ["limonene_monoxide", "co2"],
    products: ["poly_limonene_carbonate"],
    enthalpyKjPerMol: -92,
    reactionType: "synthesis",
    description: "Zinc-beta-diiminate catalyzed living ring-opening copolymerization fixing CO2 into a fully bio-derived, transparent high-Tg (130 °C) polycarbonate.",
    observableEffects: [
      { type: "phase_change", description: "Volatile liquid monomer and pressurized CO2 polymerize into tough, crystal-clear optical bio-plastic", colorTo: "#FFFFFF" }
    ],
    tempMin: 50,
    tempMax: 80
  },
  {
    id: "green-095-glycerol-direct-carboxylation-co2",
    name: "Direct catalytic carboxylation of bio-glycerol with CO2 to glycerol carbonate",
    reactants: ["glycerol", "co2"],
    products: ["glycerol_carbonate", "water"],
    enthalpyKjPerMol: -18,
    reactionType: "synthesis",
    description: "Thermodynamic challenge overcome by CeO2-catalyzed dehydration coupling fixing CO2 into cyclic glycerol carbonate.",
    observableEffects: [
      { type: "phase_change", description: "High-pressure uptake of CO2 into viscous glycerol substrate" }
    ],
    tempMin: 140,
    tempMax: 180
  },
  {
    id: "green-096-polyhydroxybutyrate-phb-enzymatic-degradation",
    name: "Enzymatic depolymerization of bacterial polyhydroxybutyrate (PHB) bioplastic",
    reactants: ["phb_repeat", "water"],
    products: ["hydroxybutyric_3_acid"],
    enthalpyKjPerMol: 24,
    reactionType: "decomposition",
    description: "PHB depolymerase catalyzed natural environmental biodegradation converting microbially accumulated polyester back into chiral 3-hydroxybutyric acid.",
    observableEffects: [
      { type: "phase_change", description: "Opaque solid bioplastic film completely disintegrates in aqueous buffer" }
    ],
    solvent: "water",
    tempMin: 30,
    tempMax: 45
  },
  {
    id: "green-097-polycaprolactone-hydrolysis-caproic",
    name: "Enzymatic hydrolysis of biodegradable polycaprolactone (PCL) by Lipase PS",
    reactants: ["pcl_repeat", "water"],
    products: ["hydroxycaproic_6_acid"],
    enthalpyKjPerMol: 21,
    reactionType: "decomposition",
    description: "Complete enzymatic surface erosion of aliphatic polyester suture material into non-cytotoxic 6-hydroxyhexanoic acid.",
    observableEffects: [
      { type: "phase_change", description: "Gradual mass loss and total dissolution of solid polyester fibers" }
    ],
    solvent: "water",
    tempMin: 35,
    tempMax: 50
  },
  {
    id: "green-098-deep-eutectic-solvent-choline-urea-synthesis",
    name: "100% atom-economic green synthesis of 'Reline' Deep Eutectic Solvent (DES)",
    reactants: ["choline_chloride", "urea"],
    products: ["reline_deep_eutectic_solvent"],
    enthalpyKjPerMol: -15,
    reactionType: "synthesis",
    description: "Hydrogen-bond complexation of solid choline chloride with solid urea (1:2 molar ratio) creating a biodegradable, non-flammable liquid eutectic solvent (mp 12 °C).",
    observableEffects: [
      { type: "phase_change", description: "Two white solid powders mix and liquefy spontaneously into a clear viscous eutectic ionic liquid", colorFrom: "#FFFFFF", colorTo: "#F8FAFC" }
    ],
    tempMin: 70,
    tempMax: 90
  },
  {
    id: "green-099-chcl-glycerol-deep-eutectic-solvent",
    name: "Synthesis of bio-based Deep Eutectic Solvent 'Glyceline' (ChCl/Glycerol 1:2)",
    reactants: ["choline_chloride", "glycerol"],
    products: ["glyceline_des"],
    enthalpyKjPerMol: -12,
    reactionType: "synthesis",
    description: "Complexation of food-grade choline chloride with biodiesel glycerol creating versatile green solvent for biomass extraction and metal electrodeposition.",
    observableEffects: [
      { type: "phase_change", description: "Solid choline salt dissolves completely into glycerol forming water-like clear eutectic liquid" }
    ],
    tempMin: 60,
    tempMax: 80
  },
  {
    id: "green-100-cellulose-nanocrystal-cnc-hydrolysis",
    name: "Controlled sulfuric acid nanocrystal liberation of wood pulp cellulose (CNC)",
    reactants: ["cellulose_amorphous_repeat", "water"],
    products: ["cellulose_nanocrystals", "glucose_trace"],
    enthalpyKjPerMol: -34,
    reactionType: "decomposition",
    description: "Selective 64 wt% H2SO4 cleavage of disordered amorphous cellulose domains releasing high-strength colloidal cellulose nanocrystals with chiral nematic iridescence.",
    observableEffects: [
      { type: "color_change", description: "White pulp converts into iridescent birefringent colloidal suspension displaying rainbow colors under polarized light", colorTo: "#38BDF8" },
      { type: "precipitation", description: "Separation of crystalline nanorods with diamond-like tensile strength" }
    ],
    solvent: "water",
    tempMin: 45,
    tempMax: 55
  }
];
