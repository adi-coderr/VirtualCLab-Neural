import { SimulationService } from "../src/services/simulationService.js";
import { getDb } from "../src/data/db.js";

async function auditAll20() {
  const db = getDb();
  const service = new SimulationService(db);

  const hackathonRows = db
    .prepare("SELECT * FROM reactions WHERE id LIKE 'hackathon%' ORDER BY id")
    .all() as any[];

  console.log(`Found ${hackathonRows.length} hackathon showcase rows in chemlab.db\n`);

  let passed = 0;
  let failed = 0;

  for (const row of hackathonRows) {
    const reactants = db
      .prepare("SELECT chemical_id, coefficient FROM reaction_reactants WHERE reaction_id = ?")
      .all(row.id) as { chemical_id: string; coefficient: number }[];

    const inputs = reactants.map((r) => ({
      chemicalId: r.chemical_id,
      amount: 25 * (r.coefficient || 1),
      unit: "g" as const,
    }));

    try {
      // 1. Test by direct reactants
      const simRes = await service.simulateWithAi(inputs);
      const res = simRes.resolution;

      const hasCond = !!(res.conditionsDescription || res.specialConditions?.description);
      const hasAfter = !!(res.afterEffect || res.specialConditions?.afterEffect);
      const isRxn = res.status === "REACTION";

      // 2. Test by name / equation search
      const predictRes = await service.predictAny(row.name);
      const pRes = predictRes.simulationResult.resolution;
      const predictPass = pRes.status === "REACTION" && !!(pRes.conditionsDescription || pRes.specialConditions?.description);

      if (isRxn && hasCond && hasAfter && predictPass) {
        passed++;
        console.log(`✓ [${row.name}]`);
        console.log(`    Simulate Equation: ${res.balancedEquation} (ΔH = ${res.enthalpyKjPerMol} kJ/mol)`);
        console.log(`    PredictAny Source: ${predictRes.source}`);
        console.log(`    Conditions:        ${res.conditionsDescription?.slice(0, 70)}...`);
        console.log(`    After-Effect:      ${res.afterEffect?.slice(0, 70)}...\n`);
      } else {
        failed++;
        console.error(`✗ [${row.name}] FAILED:`);
        console.error(`    isRxn: ${isRxn}, hasCond: ${hasCond}, hasAfter: ${hasAfter}, predictPass: ${predictPass}`);
        console.error(`    simulate status: ${res.status}, predict status: ${pRes.status}\n`);
      }
    } catch (err: any) {
      failed++;
      console.error(`✗ [${row.name}] EXCEPTION: ${err.message}\n`);
    }
  }

  console.log("=========================================");
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED out of ${hackathonRows.length}`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

auditAll20().catch((err) => {
  console.error("Fatal audit error:", err);
  process.exit(1);
});
