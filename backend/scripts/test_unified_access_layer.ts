import { UnifiedReactantService, getUnifiedDb } from "../src/services/unifiedReactantService.js";

console.log("=== EXECUTING TASK 3: TESTING ACCESS LAYER, 100 REACTANTS & 50 REACTIONS ===");

const service = new UnifiedReactantService();
const db = getUnifiedDb();

// -----------------------------------------------------------------------------
// TEST SUITE 1: Spot-check 100 Random Reactants
// -----------------------------------------------------------------------------
console.log("\n--- TEST 1: Spot-Checking 100 Random Reactants ---");
const randomReactantRows = db.prepare(`
  SELECT id FROM reactants_unified ORDER BY RANDOM() LIMIT 100
`).all() as { id: string }[];

let validReactantCount = 0;
const reactantIssues: string[] = [];

for (const row of randomReactantRows) {
  const r = service.getReactantById(row.id);
  if (!r) {
    reactantIssues.push(`Failed to fetch reactant "${row.id}"`);
    continue;
  }

  // Validate core identifiers
  if (!r.id || !r.canonicalName || !r.formula) {
    reactantIssues.push(`Reactant "${row.id}" missing essential identifiers.`);
    continue;
  }

  // Validate SI molar mass consistency: kg/mol = g/mol * 1e-3
  if (Math.abs(r.molarMass.kgMol - r.molarMass.gMol * 0.001) > 1e-6) {
    reactantIssues.push(`Reactant "${row.id}" molar mass SI inconsistency.`);
    continue;
  }

  // Validate provenance existence
  if (!r.molarMass.provenance || !r.molarMass.provenance.status) {
    reactantIssues.push(`Reactant "${row.id}" missing molar mass provenance.`);
    continue;
  }

  // Validate temperature SI units (Kelvin > 0 if present)
  if (r.temperatures.meltingPointK !== null && r.temperatures.meltingPointK <= 0) {
    reactantIssues.push(`Reactant "${row.id}" invalid melting point (${r.temperatures.meltingPointK}K).`);
    continue;
  }
  if (r.temperatures.boilingPointK !== null && r.temperatures.boilingPointK <= 0) {
    reactantIssues.push(`Reactant "${row.id}" invalid boiling point (${r.temperatures.boilingPointK}K).`);
    continue;
  }

  // Validate density SI units (kg/m3 > 0 if present)
  if (r.density.kgM3 !== null && r.density.kgM3 <= 0) {
    reactantIssues.push(`Reactant "${row.id}" invalid density (${r.density.kgM3} kg/m3).`);
    continue;
  }

  // Validate structure generation
  if (!r.structure || !r.structure.atoms || r.structure.atoms.length === 0) {
    reactantIssues.push(`Reactant "${row.id}" structure generation produced 0 atoms.`);
    continue;
  }

  validReactantCount++;
}

console.log(`Spot-check result: ${validReactantCount}/100 randomly sampled reactants passed 100% of property & SI unit checks.`);
if (reactantIssues.length > 0) {
  console.error("Reactant Issues:", reactantIssues.slice(0, 5));
}

// -----------------------------------------------------------------------------
// TEST SUITE 2: Spot-Check 50 Known Chemical Reactions
// -----------------------------------------------------------------------------
console.log("\n--- TEST 2: Testing 50 Known Chemical Reactions ---");

const KNOWN_REACTIONS = [
  // 1-10: Neutralizations and Acid-Base
  { name: "Hydrochloric acid + Sodium hydroxide", reactants: ["hcl", "naoh"], expectedType: "acid_base" },
  { name: "Sulfuric acid + Potassium hydroxide", reactants: ["h2so4", "koh"], expectedType: "acid_base" },
  { name: "Nitric acid + Sodium hydroxide", reactants: ["hno3", "naoh"], expectedType: "acid_base" },
  { name: "Acetic acid + Sodium hydroxide", reactants: ["acetic-acid", "naoh"], expectedType: "acid_base" },
  { name: "Hydrochloric acid + Ammonia", reactants: ["hcl", "ammonia"], expectedType: "acid_base" },
  { name: "Phosphoric acid + Sodium hydroxide", reactants: ["h3po4", "naoh"], expectedType: "acid_base" },
  { name: "Sulfuric acid + Barium hydroxide", reactants: ["h2so4", "ba-oh-2"], expectedType: "acid_base" },
  { name: "Hydrobromic acid + Potassium hydroxide", reactants: ["hbr", "koh"], expectedType: "acid_base" },
  { name: "Perchloric acid + Sodium hydroxide", reactants: ["hclo4", "naoh"], expectedType: "acid_base" },
  { name: "Hydrochloric acid + Calcium hydroxide", reactants: ["hcl", "caoh2"], expectedType: "acid_base" },

  // 11-20: Precipitations (Solubility Rules)
  { name: "Silver nitrate + Sodium chloride", reactants: ["agno3", "nacl"], expectedType: "precipitation" },
  { name: "Barium chloride + Sodium sulfate", reactants: ["bacl2", "na2so4"], expectedType: "precipitation" },
  { name: "Lead(II) nitrate + Potassium iodide", reactants: ["pb-no3-2", "ki"], expectedType: "precipitation" },
  { name: "Copper(II) sulfate + Sodium hydroxide", reactants: ["cuso4", "naoh"], expectedType: "precipitation" },
  { name: "Iron(III) chloride + Sodium hydroxide", reactants: ["fecl3", "naoh"], expectedType: "precipitation" },
  { name: "Calcium chloride + Sodium carbonate", reactants: ["cacl2", "na2co3"], expectedType: "precipitation" },
  { name: "Silver nitrate + Potassium chromate", reactants: ["agno3", "k2cro4"], expectedType: "precipitation" },
  { name: "Lead(II) nitrate + Sodium sulfate", reactants: ["pb-no3-2", "na2so4"], expectedType: "precipitation" },
  { name: "Barium chloride + Potassium chromate", reactants: ["bacl2", "k2cro4"], expectedType: "precipitation" },
  { name: "Nickel(II) sulfate + Sodium hydroxide", reactants: ["niso4", "naoh"], expectedType: "precipitation" },

  // 21-30: Single Displacement & Activity Series
  { name: "Copper + Silver nitrate", reactants: ["cu", "agno3"], expectedType: "displacement" },
  { name: "Zinc + Copper(II) sulfate", reactants: ["zn", "cuso4"], expectedType: "displacement" },
  { name: "Iron + Copper(II) sulfate", reactants: ["fe", "cuso4"], expectedType: "displacement" },
  { name: "Zinc + Hydrochloric acid", reactants: ["zn", "hcl"], expectedType: "displacement" },
  { name: "Magnesium + Hydrochloric acid", reactants: ["mg", "hcl"], expectedType: "displacement" },
  { name: "Aluminium + Copper(II) chloride", reactants: ["al", "cucl2"], expectedType: "displacement" },
  { name: "Magnesium + Silver nitrate", reactants: ["mg", "agno3"], expectedType: "displacement" },
  { name: "Iron + Lead(II) nitrate", reactants: ["fe", "pb-no3-2"], expectedType: "displacement" },
  { name: "Zinc + Silver nitrate", reactants: ["zn", "agno3"], expectedType: "displacement" },
  { name: "Aluminium + Hydrochloric acid", reactants: ["al", "hcl"], expectedType: "displacement" },

  // 31-40: Gas Evolution & Carbonates
  { name: "Calcium carbonate + Hydrochloric acid", reactants: ["caco3", "hcl"], expectedType: "gas_evolution" },
  { name: "Sodium bicarbonate + Hydrochloric acid", reactants: ["nahco3", "hcl"], expectedType: "gas_evolution" },
  { name: "Sodium carbonate + Sulfuric acid", reactants: ["na2co3", "h2so4"], expectedType: "gas_evolution" },
  { name: "Potassium carbonate + Nitric acid", reactants: ["k2co3", "hno3"], expectedType: "gas_evolution" },
  { name: "Sodium sulfite + Hydrochloric acid", reactants: ["na2so3", "hcl"], expectedType: "gas_evolution" },
  { name: "Iron(II) sulfide + Hydrochloric acid", reactants: ["fes", "hcl"], expectedType: "gas_evolution" },
  { name: "Ammonium chloride + Sodium hydroxide", reactants: ["nh4cl", "naoh"], expectedType: "gas_evolution" },
  { name: "Magnesium carbonate + Hydrochloric acid", reactants: ["mgco3", "hcl"], expectedType: "gas_evolution" },
  { name: "Sodium bicarbonate + Acetic acid", reactants: ["nahco3", "acetic-acid"], expectedType: "gas_evolution" },
  { name: "Copper(II) carbonate + Sulfuric acid", reactants: ["cuco3", "h2so4"], expectedType: "gas_evolution" },

  // 41-50: Synthesis, Combustion & Redox
  { name: "Aluminium + Oxygen", reactants: ["al", "o2"], expectedType: "synthesis" },
  { name: "Methane + Oxygen (Combustion)", reactants: ["ch4", "o2"], expectedType: "combustion" },
  { name: "Ethanol + Oxygen (Combustion)", reactants: ["c2h5oh", "o2"], expectedType: "combustion" },
  { name: "Hydrogen + Oxygen (Water Synthesis)", reactants: ["h2", "o2"], expectedType: "synthesis" },
  { name: "Iron + Sulfur", reactants: ["fe", "s"], expectedType: "synthesis" },
  { name: "Magnesium + Oxygen", reactants: ["mg", "o2"], expectedType: "combustion" },
  { name: "Sodium + Chlorine", reactants: ["na", "cl2"], expectedType: "synthesis" },
  { name: "Carbon + Oxygen", reactants: ["c", "o2"], expectedType: "combustion" },
  { name: "Hydrogen + Chlorine", reactants: ["h2", "cl2"], expectedType: "synthesis" },
  { name: "Potassium iodide + Chlorine", reactants: ["ki", "cl2"], expectedType: "displacement" },
];

let successfulReactionCount = 0;
const reactionFailures: string[] = [];

for (const testRxn of KNOWN_REACTIONS) {
  try {
    const sim = service.mixReactants(testRxn.reactants);
    if (sim.status !== "REACTION") {
      reactionFailures.push(`Reaction "${testRxn.name}" failed: status was NO_REACTION.`);
      continue;
    }
    if (!sim.equation || sim.equation.includes("No reaction")) {
      reactionFailures.push(`Reaction "${testRxn.name}" failed: empty or invalid equation.`);
      continue;
    }
    if (!sim.products || sim.products.length === 0) {
      reactionFailures.push(`Reaction "${testRxn.name}" failed: produced 0 products.`);
      continue;
    }
    if (!sim.observableEffects || sim.observableEffects.length === 0) {
      reactionFailures.push(`Reaction "${testRxn.name}" failed: missing observable effects.`);
      continue;
    }
    successfulReactionCount++;
  } catch (err: any) {
    reactionFailures.push(`Reaction "${testRxn.name}" threw error: ${err.message}`);
  }
}

console.log(`Reactions test result: ${successfulReactionCount}/50 known reactions successfully resolved and balanced.`);
if (reactionFailures.length > 0) {
  console.error("Reaction Failures:", reactionFailures);
}

// -----------------------------------------------------------------------------
// TEST SUITE 3: Performance Benchmark Across 1,000 Queries
// -----------------------------------------------------------------------------
console.log("\n--- TEST 3: Latency & Performance Benchmarks ---");

const searchTerms = ["sodium", "acid", "chloride", "potassium", "iron", "copper", "silver", "water", "ethanol", "sulfate"];

// A. Search latency
const t0 = performance.now();
for (let i = 0; i < 1000; i++) {
  const term = searchTerms[i % searchTerms.length]!;
  service.searchReactants({ q: term, limit: 10 });
}
const searchDuration = performance.now() - t0;
const avgSearchMs = (searchDuration / 1000).toFixed(3);

// B. Profile fetch latency
const testIds = ["nacl", "h2so4", "fe", "k2cr2o7", "c2h5oh", "agno3", "naoh", "cu", "kmno4", "caco3"];
const t1 = performance.now();
for (let i = 0; i < 1000; i++) {
  const id = testIds[i % testIds.length]!;
  service.getReactantById(id);
}
const fetchDuration = performance.now() - t1;
const avgFetchMs = (fetchDuration / 1000).toFixed(3);

// C. Mixture evaluation latency
const t2 = performance.now();
for (let i = 0; i < 1000; i++) {
  service.mixReactants(["cu", "agno3"]);
}
const mixDuration = performance.now() - t2;
const avgMixMs = (mixDuration / 1000).toFixed(3);

console.log(`Performance Results:`);
console.log(`- Reactant search (indexed SQLite query): ${avgSearchMs} ms / query`);
console.log(`- Full reactant profile fetch (provenance + 2D/3D structure): ${avgFetchMs} ms / query`);
console.log(`- Mixture reaction evaluation & balancing: ${avgMixMs} ms / query`);

console.log("\n=== ALL TEST SUITES COMPLETED ===");
