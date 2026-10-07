import { chemrxnService } from "../../services/chemrxnService.js";
import { logger } from "../../utils/logger.js";

async function main() {
  console.log("=================================================");
  console.log("   INDEXING CHEMRXN PATENT CHEMICAL REACTIONS   ");
  console.log("=================================================\n");

  const filesPerYear = process.argv.includes("--full") ? 3 : 1;
  const res = chemrxnService.ensureInitialSeed(filesPerYear);

  const stats = chemrxnService.getStats();
  console.log("\n=================================================");
  console.log(`Successfully Indexed: ${stats.totalIndexed.toLocaleString()} patent reactions`);
  console.log(`Years Covered:        ${stats.minYear} to ${stats.maxYear} (${stats.yearsCovered} years)`);
  console.log(`Average Yield:        ${stats.avgYield ? `${stats.avgYield}%` : "N/A"}`);
  console.log(`High Yield (>80%):    ${stats.highYieldCount.toLocaleString()}`);
  console.log(`States/Appearance:    ${stats.stateRecordedCount.toLocaleString()}`);
  console.log("=================================================\n");
}

main().catch((err) => {
  logger.error("Failed to seed ChemRxn", { error: err });
  process.exit(1);
});
