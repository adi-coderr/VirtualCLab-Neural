import { generateMoleculeStructure } from "../src/chemistry-engine/moleculeStructureGenerator.js";

const res = generateMoleculeStructure('ti-so4-2', 'Ti(SO4)2', undefined, 'Titanium(IV) sulfate', '[Ti+4].[O-]S(=O)(=O)[O-].[O-]S(=O)(=O)[O-]');
console.log('Ti(SO4)2 atoms:', res.atoms.length);
console.log('Ti(SO4)2 bonds:', res.bonds.length);
for (let i = 0; i < res.bonds.length; i++) {
  const b = res.bonds[i]!;
  console.log(`Bond ${i}: ${res.atoms[b.atomIndex1]?.element}[${b.atomIndex1}] - ${res.atoms[b.atomIndex2]?.element}[${b.atomIndex2}] (${b.type}, len=${b.length})`);
}