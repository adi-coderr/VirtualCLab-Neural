import { processBatch } from "./enrichBondsWorker.ts";

console.log("=== INITIATING TASK 1 OF 5: ENRICH BONDS (CHEMICALS 1 TO 20,000) ===");
const res = processBatch(1, 0, 20000);
console.log("TASK 1 RESULT SUMMARY:", res);
