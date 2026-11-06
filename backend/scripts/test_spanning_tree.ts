import { parseFormula } from "../src/chemistry-engine/formulaParser.js";
import { generateMoleculeStructure } from "../src/chemistry-engine/moleculeStructureGenerator.js";

const testList = [
  { id: "ag2co3", formula: "Ag2CO3", name: "Silver(I) carbonate", smiles: "[Ag+].[Ag+].[O-]C(=O)[O-]" },
  { id: "na2co3", formula: "Na2CO3", name: "Sodium carbonate", smiles: "[Na+].[Na+].[O-]C(=O)[O-]" },
  { id: "na3po4", formula: "Na3PO4", name: "Trisodium phosphate", smiles: "[Na+].[Na+].[Na+].[O-]P(=O)([O-])[O-]" },
  { id: "al-no3-3", formula: "Al(NO3)3", name: "Aluminium nitrate", smiles: "[Al+3].[O-][N+](=O)[O-].[O-][N+](=O)[O-].[O-][N+](=O)[O-]" },
  { id: "al2-so4-3", formula: "Al2(SO4)3", name: "Aluminium sulfate", smiles: "[Al+3].[Al+3].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]" },
  { id: "ca3po42", formula: "Ca3(PO4)2", name: "Calcium phosphate", smiles: "[Ca+2].[Ca+2].[Ca+2].[O-]P(=O)([O-])[O-].[O-]P(=O)([O-])[O-]" },
  { id: "fe2-so4-3", formula: "Fe2(SO4)3", name: "Iron(III) sulfate", smiles: "[Fe+3].[Fe+3].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]" },
  { id: "ti-so4-2", formula: "Ti(SO4)2", name: "Titanium(IV) sulfate", smiles: "[Ti+4].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]" },
  { id: "kcr-so4-2", formula: "KCr(SO4)2", name: "Potassium chrome alum", smiles: "[K+].[Cr+3].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]" },
  { id: "co-h2o-6-cl2", formula: "[Co(H2O)6]Cl2", name: "Hexaaquacobalt(II) chloride", smiles: "[Cl-].[Cl-].[Co+2].O.O.O.O.O.O" },
  { id: "fe-scn-3", formula: "Fe(SCN)3", name: "Iron(III) thiocyanate", smiles: "[Fe+3].[S-]C#N.[S-]C#N.[S-]C#N" },
  { id: "cuso4-5h2o", formula: "CuSO4(H2O)5", name: "Copper(II) sulfate pentahydrate", smiles: "[Cu+2].[O-]S(=O)(=O)[O-].O.O.O.O.O" },
];

console.log("Testing current structures of representative 12:");
for (const t of testList) {
  let comp = {};
  try {
    if (t.formula) comp = parseFormula(t.formula).composition;
  } catch {}

  const struct = generateMoleculeStructure(t.id, t.formula, comp, t.name, t.smiles);
  console.log(`[${t.id}] ${t.formula}: atoms=${struct.atoms.length}, bonds=${struct.bonds.length}`);
}