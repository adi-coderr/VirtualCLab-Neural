import { parseFormula } from "../src/chemistry-engine/formulaParser.js";
import fs from "node:fs";

// Read moleculeStructureGenerator.ts and add a console log before relaxGeometry to see initial distance
const smiles = "FC1(C(=C(C(C1(F)F)(F)F)C1=C(OC2=C1C=CC(=C2)OC)C2=CC=C(C=C2)C(C)(C)C)C2=C(OC1=C2C=CC(=C1)OC)C1=CC=C(C=C1)C(C)(C)C)F";

// Let's inspect coords before relaxGeometry by viewing the flow
