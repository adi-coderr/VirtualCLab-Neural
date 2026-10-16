import { processBatch } from "./enrichBondsWorker.ts";

console.log("=== INITIATING TASK 3 OF 5: ENRICH BONDS (CHEMICALS 40,001 TO 60,000) ===");
const res = processBatch(3, 40000, 60000);
console.log("TASK 3 RESULT SUMMARY:", res);
