import { processBatch } from "./enrichBondsWorker.ts";

console.log("=== INITIATING TASK 2 OF 5: ENRICH BONDS (CHEMICALS 20,001 TO 40,000) ===");
const res = processBatch(2, 20000, 40000);
console.log("TASK 2 RESULT SUMMARY:", res);
