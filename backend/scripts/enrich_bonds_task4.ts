import { processBatch } from "./enrichBondsWorker.ts";

console.log("=== INITIATING TASK 4 OF 5: ENRICH BONDS (CHEMICALS 60,001 TO END / 63,500+) ===");
const res = processBatch(4, 60000, 80000);
console.log("TASK 4 RESULT SUMMARY:", res);
