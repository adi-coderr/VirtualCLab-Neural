// Curated general laboratory chemicals
import type { SeedChemical } from "./chemicals.js";

export const CHEMICALS_CURATED: SeedChemical[] = [
  {
    "id": "cro3",
    "commonName": "Chromium trioxide",
    "iupacName": "Chromium(VI) oxide",
    "formula": "CrO3",
    "casNumber": "1333-82-0",
    "physicalState": "solid",
    "density": 2.7,
    "meltingPointC": 197,
    "boilingPointC": 250,
    "solubilityNotes": "Highly soluble in water (166 g/100 mL at 20 °C) forming chromic acid; violently oxidizing.",
    "chemicalClass": "oxide",
    "isAcid": true,
    "acidBaseStrength": "strong",
    "substanceColor": "#8B0000",
    "aliases": [
      "chromiumtrioxide",
      "chromium-trioxide",
      "chromicanhydride",
      "chromium(vi)oxide"
    ],
    "hazardCodes": [
      "TOXIC",
      "OXIDIZING",
      "CORROSIVE",
      "HEALTH_HAZARD",
      "ENVIRONMENTAL_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Dark purplish-red flakes; chromic acid anhydride used in Jones reagent and decorative chrome plating."
  },
  {
    "id": "kcr-so4-2",
    "commonName": "Potassium chrome alum",
    "iupacName": "Potassium chromium(III) bis(sulfate)",
    "formula": "KCr(SO4)2",
    "casNumber": "10141-00-1",
    "physicalState": "solid",
    "density": 1.83,
    "meltingPointC": 89,
    "solubilityNotes": "Soluble in water (24 g/100 mL at 20 °C); magnificent deep purple octahedral crystals.",
    "chemicalClass": "salt",
    "substanceColor": "#4B0082",
    "aliases": [
      "chromealum",
      "potassiumchromealum",
      "potassiumchromiumsulfate"
    ],
    "hazardCodes": [
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Double sulfate salt KCr(SO4)2·12H2O; prized in crystallography for growing large deep-violet crystals."
  },
  {
    "id": "namno4",
    "commonName": "Sodium permanganate",
    "iupacName": "Sodium manganate(VII)",
    "formula": "NaMnO4",
    "casNumber": "10101-50-5",
    "physicalState": "solid",
    "density": 1.97,
    "meltingPointC": 170,
    "solubilityNotes": "Extremely soluble in water (approx 90 g/100 mL at 20 °C); much more soluble than KMnO4.",
    "chemicalClass": "salt",
    "substanceColor": "#800080",
    "aliases": [
      "sodiumpermanganate",
      "sodium-permanganate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "TOXIC",
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Dark purple deliquescent solid; chosen over KMnO4 when high permanganate concentrations are needed in solution."
  },
  {
    "id": "k2mno4",
    "commonName": "Potassium manganate",
    "iupacName": "Dipotassium manganate(VI)",
    "formula": "K2MnO4",
    "casNumber": "10294-64-1",
    "physicalState": "solid",
    "density": 2.78,
    "meltingPointC": 190,
    "solubilityNotes": "Soluble in alkaline water; disproportionates in neutral/acidic water into KMnO4 (purple) and MnO2 (brown).",
    "chemicalClass": "salt",
    "substanceColor": "#006400",
    "aliases": [
      "potassiummanganate",
      "potassium-manganate",
      "potassiummanganate(vi)"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Dark green crystals containing Mn(VI); intermediate in the chemical synthesis of KMnO4."
  },
  {
    "id": "na2mno4",
    "commonName": "Sodium manganate",
    "iupacName": "Disodium manganate(VI)",
    "formula": "Na2MnO4",
    "casNumber": "9055-92-1",
    "physicalState": "solid",
    "density": 2.5,
    "meltingPointC": 170,
    "solubilityNotes": "Soluble in alkaline solutions, dark emerald green color.",
    "chemicalClass": "salt",
    "substanceColor": "#006400",
    "aliases": [
      "sodiummanganate",
      "sodium-manganate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Green solid; stable only under strongly alkaline conditions."
  },
  {
    "id": "fe-nh4-2-so4-2",
    "commonName": "Ammonium iron(II) sulfate",
    "iupacName": "Diammonium iron(II) bis(sulfate)",
    "formula": "(NH4)2Fe(SO4)2",
    "casNumber": "10045-89-3",
    "physicalState": "solid",
    "density": 1.86,
    "meltingPointC": 100,
    "solubilityNotes": "Soluble in water (26.9 g/100 mL at 20 °C); light blue-green crystals.",
    "chemicalClass": "salt",
    "substanceColor": "#AFEEEE",
    "aliases": [
      "mohr'ssalt",
      "mohrsalt",
      "ferrousammoniumsulfate",
      "ammoniumiron(ii)sulfate"
    ],
    "hazardCodes": [
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Mohr's salt hexahydrate; standard primary analytical titrant for Fe(II) because it resists aerial oxidation."
  },
  {
    "id": "nh4fe-so4-2",
    "commonName": "Ammonium iron(III) sulfate",
    "iupacName": "Ammonium iron(III) bis(sulfate)",
    "formula": "NH4Fe(SO4)2",
    "casNumber": "10138-04-2",
    "physicalState": "solid",
    "density": 1.71,
    "meltingPointC": 37,
    "solubilityNotes": "Soluble in water (124 g/100 mL at 25 °C); pale violet dodecahydrate crystals.",
    "chemicalClass": "salt",
    "substanceColor": "#D8BFD8",
    "aliases": [
      "ferricammoniumsulfate",
      "ironalum",
      "ammoniumferricsulfate"
    ],
    "hazardCodes": [
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Ferric ammonium alum; classic indicator for Volhard argentometric titrations (forming blood-red Fe(SCN)2+)."
  },
  {
    "id": "ca-clo-2",
    "commonName": "Calcium hypochlorite",
    "iupacName": "Calcium hypochlorite",
    "formula": "Ca(ClO)2",
    "casNumber": "7778-54-3",
    "physicalState": "solid",
    "density": 2.35,
    "meltingPointC": 100,
    "solubilityNotes": "Soluble in water (21 g/100 mL at 25 °C); white solid with strong chlorine odor.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "calciumhypochlorite",
      "bleachingpowder",
      "chlorinatedlime"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "CORROSIVE",
      "TOXIC",
      "ENVIRONMENTAL_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Bleaching powder; solid pool sanitizing tablets and water disinfectant."
  },
  {
    "id": "naclo2",
    "commonName": "Sodium chlorite",
    "iupacName": "Sodium chlorite",
    "formula": "NaClO2",
    "casNumber": "7758-19-2",
    "physicalState": "solid",
    "density": 2.47,
    "meltingPointC": 180,
    "solubilityNotes": "Soluble in water (39 g/100 mL at 17 °C).",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumchlorite",
      "sodium-chlorite"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "TOXIC",
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "White crystalline solid; industrial generator of chlorine dioxide (ClO2) for paper pulp bleaching."
  },
  {
    "id": "naclo3",
    "commonName": "Sodium chlorate",
    "iupacName": "Sodium chlorate",
    "formula": "NaClO3",
    "casNumber": "7775-09-9",
    "physicalState": "solid",
    "density": 2.49,
    "meltingPointC": 248,
    "boilingPointC": 300,
    "solubilityNotes": "Extremely soluble in water (101 g/100 mL at 20 °C); hygroscopic.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumchlorate",
      "sodium-chlorate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "TOXIC",
      "ENVIRONMENTAL_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Powerful oxidizer and herbicide; precursor in chemical oxygen generators (oxygen candles)."
  },
  {
    "id": "nabro3",
    "commonName": "Sodium bromate",
    "iupacName": "Sodium bromate",
    "formula": "NaBrO3",
    "casNumber": "7789-38-0",
    "physicalState": "solid",
    "density": 3.34,
    "meltingPointC": 381,
    "solubilityNotes": "Soluble in water (36.4 g/100 mL at 20 °C).",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumbromate",
      "sodium-bromate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "TOXIC"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Strong oxidizer; used in cold-wave hair perms and gold extraction."
  },
  {
    "id": "kbro3",
    "commonName": "Potassium bromate",
    "iupacName": "Potassium bromate",
    "formula": "KBrO3",
    "casNumber": "7758-01-2",
    "physicalState": "solid",
    "density": 3.27,
    "meltingPointC": 350,
    "boilingPointC": 370,
    "solubilityNotes": "Soluble in water (6.9 g/100 mL at 20 °C); analytical redox standard in bromatometry.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "potassiumbromate",
      "potassium-bromate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "TOXIC",
      "HEALTH_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Primary analytical oxidant and essential reagent in the famous Belousov-Zhabotinsky oscillating reaction."
  },
  {
    "id": "naio3",
    "commonName": "Sodium iodate",
    "iupacName": "Sodium iodate",
    "formula": "NaIO3",
    "casNumber": "7681-55-2",
    "physicalState": "solid",
    "density": 4.28,
    "meltingPointC": 560,
    "solubilityNotes": "Soluble in water (9.0 g/100 mL at 20 °C).",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumiodate",
      "sodium-iodate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "White crystalline powder; used in iodized salt and antiseptic formulations."
  },
  {
    "id": "kio3",
    "commonName": "Potassium iodate",
    "iupacName": "Potassium iodate",
    "formula": "KIO3",
    "casNumber": "7758-05-6",
    "physicalState": "solid",
    "density": 3.93,
    "meltingPointC": 560,
    "solubilityNotes": "Soluble in water (9.16 g/100 mL at 25 °C); primary standard in iodometric titrations.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "potassiumiodate",
      "potassium-iodate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Redox primary standard; key component of the Briggs-Rauscher oscillating iodine clock reaction."
  },
  {
    "id": "naio4",
    "commonName": "Sodium periodate",
    "iupacName": "Sodium metaperiodate",
    "formula": "NaIO4",
    "casNumber": "7790-28-5",
    "physicalState": "solid",
    "density": 3.86,
    "meltingPointC": 300,
    "solubilityNotes": "Soluble in water (14.4 g/100 mL at 25 °C).",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumperiodate",
      "sodium-periodate",
      "sodiummetaperiodate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "CORROSIVE",
      "ENVIRONMENTAL_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Specific glycol-cleaving oxidant in organic chemistry (Malaprade reaction)."
  },
  {
    "id": "kio4",
    "commonName": "Potassium periodate",
    "iupacName": "Potassium metaperiodate",
    "formula": "KIO4",
    "casNumber": "7790-21-8",
    "physicalState": "solid",
    "density": 3.62,
    "meltingPointC": 582,
    "solubilityNotes": "Sparingly soluble in cold water (0.42 g/100 mL at 20 °C), soluble in hot water.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "potassiumperiodate",
      "potassium-periodate",
      "potassiummetaperiodate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Potassium salt of periodic acid; selective 1,2-diol oxidizer."
  },
  {
    "id": "na2s2o3",
    "commonName": "Sodium thiosulfate",
    "iupacName": "Disodium thiosulfate",
    "formula": "Na2S2O3",
    "casNumber": "7772-98-7",
    "physicalState": "solid",
    "density": 1.67,
    "meltingPointC": 48,
    "boilingPointC": 100,
    "solubilityNotes": "Very soluble in water (70 g/100 mL at 20 °C); dissolves silver halides forming [Ag(S2O3)2]3-.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumthiosulfate",
      "sodium-thiosulfate",
      "hypo",
      "antichlor"
    ],
    "hazardCodes": [
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Photographer's 'hypo'; standard titrant in iodometry and antidote for cyanide poisoning."
  },
  {
    "id": "na2s2o4",
    "commonName": "Sodium dithionite",
    "iupacName": "Disodium dithionite",
    "formula": "Na2S2O4",
    "casNumber": "7775-14-6",
    "physicalState": "solid",
    "density": 2.19,
    "meltingPointC": 52,
    "solubilityNotes": "Soluble in water (18.2 g/100 mL at 20 °C); prone to slow spontaneous oxidation.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumdithionite",
      "sodium-dithionite",
      "sodiumhydrosulfite"
    ],
    "hazardCodes": [
      "FLAMMABLE",
      "TOXIC",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Sodium hydrosulfite; powerful water-soluble reducing agent for vat dyeing (indigo) and pulp bleaching."
  },
  {
    "id": "na2s2o5",
    "commonName": "Sodium metabisulfite",
    "iupacName": "Disodium disulfite",
    "formula": "Na2S2O5",
    "casNumber": "7681-57-4",
    "physicalState": "solid",
    "density": 1.48,
    "meltingPointC": 150,
    "solubilityNotes": "Freely soluble in water (65.9 g/100 mL at 20 °C); releases SO2 with acid.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiummetabisulfite",
      "sodium-metabisulfite",
      "sodiumpyrosulfite",
      "smbs"
    ],
    "hazardCodes": [
      "TOXIC",
      "CORROSIVE",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Antioxidant and preservative (E223); widely used in food, brewing, and gold precipitation."
  },
  {
    "id": "nahso3",
    "commonName": "Sodium bisulfite",
    "iupacName": "Sodium hydrogen sulfite",
    "formula": "NaHSO3",
    "casNumber": "7631-90-5",
    "physicalState": "solid",
    "density": 1.48,
    "meltingPointC": 150,
    "solubilityNotes": "Freely soluble in water (approx 42 g/100 mL at 20 °C); smells faintly of SO2.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumbisulfite",
      "sodium-bisulfite",
      "sodiumhydrogensulfite"
    ],
    "hazardCodes": [
      "TOXIC",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Forms crystalline bisulfite addition adducts with aldehydes and methyl ketones."
  },
  {
    "id": "nahso4",
    "commonName": "Sodium bisulfate",
    "iupacName": "Sodium hydrogen sulfate",
    "formula": "NaHSO4",
    "casNumber": "7681-38-1",
    "physicalState": "solid",
    "density": 2.44,
    "meltingPointC": 315,
    "solubilityNotes": "Very soluble in water (50 g/100 mL at 20 °C); aqueous solutions are strongly acidic (pH ~1).",
    "chemicalClass": "salt",
    "isAcid": true,
    "acidBaseStrength": "strong",
    "pKa": 1.99,
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumbisulfate",
      "sodium-bisulfate",
      "sodiumhydrogensulfate",
      "dryacid"
    ],
    "hazardCodes": [
      "CORROSIVE",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Dry acid; used as swimming pool pH decreaser and metal finishing pickling salt."
  },
  {
    "id": "khso4",
    "commonName": "Potassium bisulfate",
    "iupacName": "Potassium hydrogen sulfate",
    "formula": "KHSO4",
    "casNumber": "7646-93-7",
    "physicalState": "solid",
    "density": 2.24,
    "meltingPointC": 197,
    "solubilityNotes": "Soluble in water (49 g/100 mL at 20 °C); acidic in solution.",
    "chemicalClass": "salt",
    "isAcid": true,
    "acidBaseStrength": "strong",
    "pKa": 1.99,
    "substanceColor": "#FFFFFF",
    "aliases": [
      "potassiumbisulfate",
      "potassium-bisulfate",
      "potassiumhydrogensulfate"
    ],
    "hazardCodes": [
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Acid salt used in analytical fusion decompositions of refractory oxides and ores."
  },
  {
    "id": "nahs",
    "commonName": "Sodium hydrosulfide",
    "iupacName": "Sodium hydrogen sulfide",
    "formula": "NaHS",
    "casNumber": "16721-80-5",
    "physicalState": "solid",
    "density": 1.79,
    "meltingPointC": 52,
    "solubilityNotes": "Extremely soluble in water (50 g/100 mL at 20 °C); smells of H2S.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFE0",
    "aliases": [
      "sodiumhydrosulfide",
      "sodium-hydrosulfide",
      "sodiumhydrogensulfide",
      "nash"
    ],
    "hazardCodes": [
      "CORROSIVE",
      "TOXIC",
      "ENVIRONMENTAL_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Yellowish deliquescent flakes; unhairing agent in tanneries and ore flotation depressant."
  },
  {
    "id": "nah2po2",
    "commonName": "Sodium hypophosphite",
    "iupacName": "Sodium phosphinate",
    "formula": "NaH2PO2",
    "casNumber": "7681-53-0",
    "physicalState": "solid",
    "density": 1.77,
    "meltingPointC": 90,
    "solubilityNotes": "Extremely soluble in water (100 g/100 mL at 20 °C); deliquescent.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumhypophosphite",
      "sodiumphosphinate"
    ],
    "hazardCodes": [
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Powerful reducing agent used industrially for electroless nickel plating onto metals and plastics."
  },
  {
    "id": "lialh4",
    "commonName": "Lithium aluminium hydride",
    "iupacName": "Lithium tetrahydridoaluminate",
    "formula": "LiAlH4",
    "casNumber": "16853-85-3",
    "physicalState": "solid",
    "density": 0.917,
    "meltingPointC": 125,
    "solubilityNotes": "Insoluble in water (reacts violently releasing H2); soluble in dry THF and diethyl ether.",
    "chemicalClass": "hydride",
    "substanceColor": "#D3D3D3",
    "aliases": [
      "lithiumaluminiumhydride",
      "lithiumaluminumhydride",
      "lah",
      "lithiumaluminohydride"
    ],
    "hazardCodes": [
      "FLAMMABLE",
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "LAH; powerful organic reducing agent that converts esters, carboxylic acids, and amides to primary alcohols and amines."
  },
  {
    "id": "nabh4",
    "commonName": "Sodium borohydride",
    "iupacName": "Sodium tetrahydridoborate",
    "formula": "NaBH4",
    "casNumber": "16940-66-2",
    "physicalState": "solid",
    "density": 1.07,
    "meltingPointC": 400,
    "solubilityNotes": "Soluble in water (55 g/100 mL at 25 °C, slowly decomposes) and methanol; relatively stable selective reductant.",
    "chemicalClass": "hydride",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumborohydride",
      "sodiumtetrahydridoborate"
    ],
    "hazardCodes": [
      "FLAMMABLE",
      "TOXIC",
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Mild, selective reducing agent that reduces aldehydes and ketones to alcohols without attacking esters or acids."
  },
  {
    "id": "nah",
    "commonName": "Sodium hydride",
    "iupacName": "Sodium hydride",
    "formula": "NaH",
    "casNumber": "7646-69-7",
    "physicalState": "solid",
    "density": 1.39,
    "meltingPointC": 638,
    "solubilityNotes": "Reacts violently with water releasing flammable H2 gas and NaOH; supplied as 60% dispersion in mineral oil.",
    "chemicalClass": "hydride",
    "isBase": true,
    "acidBaseStrength": "strong",
    "substanceColor": "#C0C0C0",
    "aliases": [
      "sodiumhydride",
    ],
    "hazardCodes": [
      "FLAMMABLE",
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Superbase in organic synthesis; deprotonates alcohols, phenols, and carbon acids to generate nucleophiles."
  },
  {
    "id": "kh",
    "commonName": "Potassium hydride",
    "iupacName": "Potassium hydride",
    "formula": "KH",
    "casNumber": "7693-26-7",
    "physicalState": "solid",
    "density": 1.43,
    "meltingPointC": 300,
    "solubilityNotes": "Reacts violently and pyrophorically with moisture; handled in mineral oil.",
    "chemicalClass": "hydride",
    "isBase": true,
    "acidBaseStrength": "strong",
    "substanceColor": "#B0C4DE",
    "aliases": [
      "potassiumhydride",
    ],
    "hazardCodes": [
      "FLAMMABLE",
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Extremely strong base, significantly more reactive than NaH."
  },
  {
    "id": "cah2",
    "commonName": "Calcium hydride",
    "iupacName": "Calcium hydride",
    "formula": "CaH2",
    "casNumber": "7789-78-8",
    "physicalState": "solid",
    "density": 1.7,
    "meltingPointC": 816,
    "solubilityNotes": "Reacts cleanly with water (CaH2 + 2H2O -> Ca(OH)2 + 2H2); popular laboratory solvent drying agent.",
    "chemicalClass": "hydride",
    "substanceColor": "#DCDCDC",
    "aliases": [
      "calciumhydride",
      "hydrolith"
    ],
    "hazardCodes": [
      "FLAMMABLE",
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Hydrolith; widely used desiccant for basic organic solvents such as pyridine and amines."
  },
  {
    "id": "nan3",
    "commonName": "Sodium azide",
    "iupacName": "Sodium azide",
    "formula": "NaN3",
    "casNumber": "26628-22-8",
    "physicalState": "solid",
    "density": 1.85,
    "meltingPointC": 275,
    "solubilityNotes": "Soluble in water (41 g/100 mL at 17 °C); rapidly generates N2 on rapid thermal initiation.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumazide",
    ],
    "hazardCodes": [
      "TOXIC",
      "HEALTH_HAZARD",
      "ENVIRONMENTAL_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Gas generant in automobile airbags; potent antimicrobial preservative in biological buffers."
  },
  {
    "id": "nanh2",
    "commonName": "Sodium amide",
    "iupacName": "Sodium azanide",
    "formula": "NaNH2",
    "casNumber": "7782-92-5",
    "physicalState": "solid",
    "density": 1.39,
    "meltingPointC": 210,
    "boilingPointC": 400,
    "solubilityNotes": "Reacts violently with water releasing ammonia and caustic soda.",
    "chemicalClass": "base",
    "isBase": true,
    "acidBaseStrength": "strong",
    "substanceColor": "#E0E0E0",
    "aliases": [
      "sodiumamide",
      "sodamide",
      "sodiumazanide"
    ],
    "hazardCodes": [
      "FLAMMABLE",
      "CORROSIVE",
      "TOXIC"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Sodamide; superbase (pKa of NH3 is 38) used to deprotonate terminal alkynes and in indigo synthesis."
  },
  {
    "id": "nh2oh-hcl",
    "commonName": "Hydroxylamine hydrochloride",
    "iupacName": "Hydroxylammonium chloride",
    "formula": "NH4ClO",
    "casNumber": "5470-11-1",
    "physicalState": "solid",
    "density": 1.67,
    "meltingPointC": 151,
    "solubilityNotes": "Very soluble in water (83 g/100 mL at 20 °C); hygroscopic white needles.",
    "chemicalClass": "salt",
    "isAcid": true,
    "acidBaseStrength": "weak",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "hydroxylaminehydrochloride",
      "hydroxylammoniumchloride"
    ],
    "hazardCodes": [
      "TOXIC",
      "CORROSIVE",
      "HEALTH_HAZARD",
      "ENVIRONMENTAL_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Stable salt form of hydroxylamine; converts ketones and aldehydes into oximes."
  },
  {
    "id": "na2b4o7",
    "commonName": "Sodium tetraborate",
    "iupacName": "Disodium tetraborate",
    "formula": "Na2B4O7",
    "casNumber": "1330-43-4",
    "physicalState": "solid",
    "density": 2.37,
    "meltingPointC": 743,
    "boilingPointC": 1575,
    "solubilityNotes": "Soluble in water (3.1 g/100 mL at 20 °C, 65 g/100 mL at 100 °C).",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "borax",
      "sodiumtetraborate",
      "sodiumborate",
      "disodiumtetraborate"
    ],
    "hazardCodes": [
      "HEALTH_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Borax (decahydrate Na2B4O7·10H2O); flux in metallurgy, slime polymer cross-linker, and borax bead test reagent."
  },
  {
    "id": "na3c6h5o7",
    "commonName": "Sodium citrate",
    "iupacName": "Trisodium 2-hydroxypropane-1,2,3-tricarboxylate",
    "formula": "Na3C6H5O7",
    "casNumber": "68-04-2",
    "physicalState": "solid",
    "density": 1.7,
    "solubilityNotes": "Freely soluble in water (72 g/100 mL at 25 °C); buffering agent.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumcitrate",
      "trisodiumcitrate"
    ],
    "hazardCodes": [
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Trisodium citrate; clinical blood anticoagulant and buffer in food and biochemistry."
  },
  {
    "id": "can",
    "commonName": "Ceric ammonium nitrate",
    "iupacName": "Diammonium cerium(IV) hexanitrate",
    "formula": "(NH4)2Ce(NO3)6",
    "casNumber": "16774-21-3",
    "physicalState": "solid",
    "density": 2.49,
    "meltingPointC": 107,
    "solubilityNotes": "Very soluble in water (141 g/100 mL at 25 °C); intense bright orange crystals.",
    "chemicalClass": "salt",
    "substanceColor": "#FF4500",
    "aliases": [
      "cericammoniumnitrate",
      "ammoniumcerium(iv)nitrate",
      "can"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "CORROSIVE",
      "IRRITANT",
      "ENVIRONMENTAL_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "CAN oxidant; one-electron oxidant in organic synthesis and standard spot test for alcohols."
  },
  {
    "id": "knh2",
    "commonName": "Potassium amide",
    "iupacName": "Potassium azanide",
    "formula": "KNH2",
    "casNumber": "17242-52-3",
    "physicalState": "solid",
    "density": 1.62,
    "meltingPointC": 338,
    "solubilityNotes": "Reacts vigorously with water releasing ammonia and KOH.",
    "chemicalClass": "base",
    "isBase": true,
    "acidBaseStrength": "strong",
    "substanceColor": "#F5F5DC",
    "aliases": [
      "potassiumamide",
      "potassamide"
    ],
    "hazardCodes": [
      "FLAMMABLE",
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Potassamide superbase used in liquid ammonia organic chemistry."
  },
  {
    "id": "lih",
    "commonName": "Lithium hydride",
    "iupacName": "Lithium hydride",
    "formula": "LiH",
    "casNumber": "7580-67-8",
    "physicalState": "solid",
    "density": 0.78,
    "meltingPointC": 689,
    "solubilityNotes": "Reacts with water releasing hydrogen gas and lithium hydroxide.",
    "chemicalClass": "hydride",
    "isBase": true,
    "acidBaseStrength": "strong",
    "substanceColor": "#E6E6FA",
    "aliases": [
      "lithiumhydride",
    ],
    "hazardCodes": [
      "FLAMMABLE",
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Lightest metal hydride; high hydrogen content reducing agent and heat storage material."
  },
  {
    "id": "crpo4",
    "commonName": "Chromium(III) phosphate",
    "iupacName": "Chromium(III) phosphate",
    "formula": "CrPO4",
    "casNumber": "7789-04-0",
    "physicalState": "solid",
    "density": 2.42,
    "meltingPointC": 1500,
    "solubilityNotes": "Insoluble in water and dilute acids; dissolves in concentrated mineral acids.",
    "chemicalClass": "salt",
    "substanceColor": "#2E8B57",
    "aliases": [
      "chromiumphosphate",
      "chromicphosphate",
      "chromium(iii)phosphate"
    ],
    "hazardCodes": [
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Green amorphous or crystalline pigment with high thermal resistance and corrosion inhibitor properties."
  },
  {
    "id": "nh4pf6",
    "commonName": "Ammonium hexafluorophosphate",
    "iupacName": "Ammonium hexafluorophosphate(1-)",
    "formula": "NH4PF6",
    "casNumber": "16941-11-0",
    "physicalState": "solid",
    "density": 2.18,
    "meltingPointC": 198,
    "solubilityNotes": "Soluble in water, acetone, and methanol; common source of non-coordinating PF6- anion.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "ammoniumhexafluorophosphate"
    ],
    "hazardCodes": [
      "CORROSIVE",
      "TOXIC"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Inorganic salt providing inert, weakly coordinating PF6- counterion for organometallic cation precipitation."
  },
  {
    "id": "kpf6",
    "commonName": "Potassium hexafluorophosphate",
    "iupacName": "Potassium hexafluorophosphate(1-)",
    "formula": "KPF6",
    "casNumber": "17084-13-8",
    "physicalState": "solid",
    "density": 2.75,
    "meltingPointC": 575,
    "solubilityNotes": "Soluble in water (8.3 g/100 mL at 20 °C); standard electrolyte salt.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "potassiumhexafluorophosphate"
    ],
    "hazardCodes": [
      "CORROSIVE",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "White crystalline powder used in non-aqueous electrochemistry and ionic liquids."
  },
  {
    "id": "lipf6",
    "commonName": "Lithium hexafluorophosphate",
    "iupacName": "Lithium hexafluorophosphate(1-)",
    "formula": "LiPF6",
    "casNumber": "21324-40-3",
    "physicalState": "solid",
    "density": 1.5,
    "meltingPointC": 200,
    "solubilityNotes": "Highly soluble in organic carbonate solvents (EC/DMC/EMC) for lithium-ion battery electrolytes.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "lithiumhexafluorophosphate"
    ],
    "hazardCodes": [
      "TOXIC",
      "CORROSIVE",
      "HEALTH_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Premier commercial electrolyte salt used in rechargeable lithium-ion batteries."
  },
  {
    "id": "coo",
    "commonName": "Cobalt(II) oxide",
    "iupacName": "Cobalt(II) oxide",
    "formula": "CoO",
    "casNumber": "1307-96-6",
    "physicalState": "solid",
    "density": 6.44,
    "meltingPointC": 1933,
    "solubilityNotes": "Insoluble in water; dissolves in hot mineral acids.",
    "chemicalClass": "oxide",
    "substanceColor": "#556B2F",
    "aliases": [
      "cobaltoxide",
      "cobalt(ii)oxide",
      "cobaltousoxide"
    ],
    "hazardCodes": [
      "TOXIC",
      "HEALTH_HAZARD",
      "ENVIRONMENTAL_HAZARD"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Olive-green to black powder; primary pigment for cobalt blue ceramics and enamels."
  },
  {
    "id": "gd-no3-3",
    "commonName": "Gadolinium(III) nitrate",
    "iupacName": "Gadolinium(III) nitrate",
    "formula": "Gd(NO3)3",
    "casNumber": "10168-88-4",
    "physicalState": "solid",
    "density": 2.4,
    "meltingPointC": 91,
    "solubilityNotes": "Freely soluble in water; deliquescent hexahydrate crystals.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "gadoliniumnitrate",
      "gadolinium(iii)nitrate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Soluble neutron poison used in nuclear reactor safety shutdown systems."
  },
  {
    "id": "eu-no3-3",
    "commonName": "Europium(III) nitrate",
    "iupacName": "Europium(III) nitrate",
    "formula": "Eu(NO3)3",
    "casNumber": "10138-01-9",
    "physicalState": "solid",
    "density": 2.4,
    "meltingPointC": 85,
    "solubilityNotes": "Freely soluble in water; exhibits brilliant red luminescence under UV excitation.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "europiumnitrate",
      "europium(iii)nitrate"
    ],
    "hazardCodes": [
      "OXIDIZING",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Precursor for red phosphor materials in lighting and anti-counterfeiting security inks."
  },
  {
    "id": "nabf4",
    "commonName": "Sodium tetrafluoroborate",
    "iupacName": "Sodium tetrafluoroborate(1-)",
    "formula": "NaBF4",
    "casNumber": "13755-29-8",
    "physicalState": "solid",
    "density": 2.47,
    "meltingPointC": 384,
    "solubilityNotes": "Very soluble in water (108 g/100 mL at 25 °C); soluble in free alcohols.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "sodiumtetrafluoroborate",
      "sodiumfluoroborate"
    ],
    "hazardCodes": [
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Non-coordinating fluoroborate source; catalyst in organic synthesis and sand casting flux."
  },
  {
    "id": "kbf4",
    "commonName": "Potassium tetrafluoroborate",
    "iupacName": "Potassium tetrafluoroborate(1-)",
    "formula": "KBF4",
    "casNumber": "14075-53-7",
    "physicalState": "solid",
    "density": 2.5,
    "meltingPointC": 530,
    "solubilityNotes": "Sparingly soluble in cold water (0.44 g/100 mL at 20 °C); soluble in hot water.",
    "chemicalClass": "salt",
    "substanceColor": "#FFFFFF",
    "aliases": [
      "potassiumtetrafluoroborate",
      "potassiumfluoroborate"
    ],
    "hazardCodes": [
      "CORROSIVE",
      "IRRITANT"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Grain-refining additive in aluminum metallurgy and electrochemical fluxes."
  },
  {
    "id": "hbf4",
    "commonName": "Fluoroboric acid",
    "iupacName": "Tetrafluoroboric acid",
    "formula": "HBF4",
    "casNumber": "16872-11-0",
    "physicalState": "liquid",
    "density": 1.4,
    "meltingPointC": -90,
    "boilingPointC": 130,
    "solubilityNotes": "Miscible in water (commercial 48–50% aqueous solution).",
    "chemicalClass": "acid",
    "isAcid": true,
    "acidBaseStrength": "strong",
    "substanceColor": "#F8F8FF",
    "aliases": [
      "fluoroboricacid",
      "tetrafluoroboricacid",
      "hydrofluoroboricacid"
    ],
    "hazardCodes": [
      "CORROSIVE"
    ],
    "source": "General chemistry reference knowledge (textbook/handbook level, e.g. CRC Handbook / PubChem conventions). Recommend cross-referencing a live database such as PubChem before production/clinical use.",
    "notes": "Strong non-oxidizing acid (pKa ~ -0.4); generates stable diazonium tetrafluoroborate salts for the Schiemann reaction."
  }
];
