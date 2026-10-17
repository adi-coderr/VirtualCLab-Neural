import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDb } from "../../src/data/db.js";
import { seedDatabase } from "../../src/data/seed/index.js";
import { SimulationService } from "../../src/services/simulationService.js";
import { localMlModelService } from "../../src/services/localMlModelService.js";
import { aiReactionPredictor } from "../../src/services/aiReactionPredictor.js";

describe("Strict Reaction Resolution Priority Pipeline", () => {
  const db = getDb();
  seedDatabase(db);
  const simulationService = new SimulationService(db);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Priority 1: Local Verified Database", () => {
    it("returns final output directly from local database without calling ML model or API", async () => {
      const mlSpy = vi.spyOn(localMlModelService, "predict");
      const aiSpy = vi.spyOn(aiReactionPredictor, "predict");
      const recheckSpy = vi.spyOn(aiReactionPredictor, "recheckAndEnrich");

      // Cu + AgNO3 is in the verified curated database
      const result = await simulationService.simulateWithAi([
        { chemicalId: "cu", amount: 10, unit: "g" },
        { chemicalId: "agno3", amount: 50, unit: "mL", concentrationMolar: 1.0 },
      ]);

      expect(result.resolution.status).toBe("REACTION");
      expect(result.resolution.confidenceTier).toBe("SUPPORTED");
      expect(result.resolution.isAiPredicted).toBeFalsy();
      expect(result.resolution.balancedEquation).toContain("Cu");
      expect(result.resolution.balancedEquation).toContain("Ag");

      // Verify ML model and API were NEVER called
      expect(mlSpy).not.toHaveBeenCalled();
      expect(aiSpy).not.toHaveBeenCalled();
      expect(recheckSpy).not.toHaveBeenCalled();
    });

    it("predictAny returns curated database source directly for database reaction", async () => {
      const mlSpy = vi.spyOn(localMlModelService, "predict");
      const aiSpy = vi.spyOn(aiReactionPredictor, "predict");

      const result = await simulationService.predictAny("cu + agno3");
      expect(result.source).toBe("curated_database");
      expect(result.simulationResult.resolution.confidenceTier).toBe("SUPPORTED");
      expect(mlSpy).not.toHaveBeenCalled();
      expect(aiSpy).not.toHaveBeenCalled();
    });
  });

  describe("Priority 2: Local ML Model with Integrated API Recheck & Fallback", () => {
    it("if ML output is available and API recheck succeeds, enriches with additional internet data", async () => {
      // Mock valid ML prediction for novel reactants not in DB
      vi.spyOn(localMlModelService, "predict").mockResolvedValueOnce({
        input: "C7H6O3.C4H6O3",
        modelName: "ReactionT5v2",
        rawOutput: "CC(=O)Oc1ccccc1C(=O)O",
        cleanedOutput: "CC(=O)Oc1ccccc1C(=O)O",
        predictedEquation: "C7H6O3 + C4H6O3 -> C9H8O4 + C2H4O2",
        predictedProducts: ["C9H8O4", "C2H4O2"],
        productAnalyses: [
          {
            smiles: "CC(=O)Oc1ccccc1C(=O)O",
            name: "Aspirin",
            formula: "C9H8O4",
            molarMass: 180.16,
            physicalState: "solid",
            appearance: "white crystalline solid",
            chemicalClass: "aromatic_ester",
            functionalGroups: ["ester", "carboxylic_acid"],
          },
          {
            smiles: "CC(=O)O",
            name: "Acetic acid",
            formula: "C2H4O2",
            molarMass: 60.05,
            physicalState: "liquid",
            appearance: "clear liquid",
            chemicalClass: "carboxylic_acid",
            functionalGroups: ["carboxylic_acid"],
          },
        ],
        reactionType: "esterification",
        atomEconomyPercent: 75.0,
        expectedByproducts: ["Acetic acid"],
        mechanismNotes: "Acid-catalyzed nucleophilic acyl substitution",
        latencyMs: 120,
        trainingDataset: "USPTO-1.8M",
        device: "mps",
        beamsUsed: 4,
        timestamp: new Date().toISOString(),
      });

      // Mock API recheck enriching the reaction
      vi.spyOn(aiReactionPredictor, "recheckAndEnrich").mockResolvedValueOnce({
        status: "REACTION",
        confidenceTier: "PREDICTED",
        confidenceScore: 0.98,
        reactionType: "synthesis",
        balancedEquation: "C7H6O3 + C4H6O3 -> C9H8O4 + C2H4O2",
        reactants: [
          { chemicalId: "c7h6o3", formula: "C7H6O3", commonName: "Salicylic acid", coefficient: 1, isRegistered: true },
          { chemicalId: "c4h6o3", formula: "C4H6O3", commonName: "Acetic anhydride", coefficient: 1, isRegistered: true },
        ],
        products: [
          { chemicalId: "c9h8o4", formula: "C9H8O4", commonName: "Aspirin (Acetylsalicylic acid)", coefficient: 1, isRegistered: true },
          { chemicalId: "c2h4o2", formula: "C2H4O2", commonName: "Acetic acid", coefficient: 1, isRegistered: true },
        ],
        observableEffects: [
          { type: "precipitation", description: "White needle-like crystals of aspirin precipitate out upon cooling." },
        ],
        energyClassification: "exothermic",
        enthalpyKjPerMol: -28.4,
        explanation: "Acid-catalyzed nucleophilic acyl substitution verified from literature: anhydride reacts with phenolic OH.",
        ruleApplied: "ai_predicted:groq",
        warnings: [],
        aiProvider: "ReactionT5v2 Neural Model + Groq (Llama 3.3) (Verified & Enriched)",
        isAiPredicted: true,
      });

      const result = await simulationService.predictAny("C7H6O3 + C4H6O3", {}, {
        apiKey: "gsk_test_mock_key",
        provider: "groq",
      });

      expect(result.source).toBe("ai_predicted");
      expect(result.simulationResult.resolution.status).toBe("REACTION");
      expect(result.simulationResult.resolution.aiProvider).toContain("Verified & Enriched");
      expect(result.simulationResult.resolution.explanation).toContain("Acid-catalyzed nucleophilic acyl substitution");
      expect(result.simulationResult.resolution.products[0].commonName).toContain("Aspirin");
      expect(result.simulationResult.resolution.calorimetry).toBeDefined();
      expect(result.simulationResult.resolution.observableEffects.some((e) => e.type === "temperature_increase")).toBe(true);
    });

    it("if ML output is available but API is unable to recheck (e.g. error/no key), ML output is treated as final output", async () => {
      // Mock valid ML prediction
      vi.spyOn(localMlModelService, "predict").mockResolvedValueOnce({
        input: "C7H6O3.C4H6O3",
        modelName: "ReactionT5v2",
        rawOutput: "CC(=O)Oc1ccccc1C(=O)O",
        cleanedOutput: "CC(=O)Oc1ccccc1C(=O)O",
        predictedEquation: "C7H6O3 + C4H6O3 -> C9H8O4 + C2H4O2",
        predictedProducts: ["C9H8O4", "C2H4O2"],
        productAnalyses: [
          {
            smiles: "CC(=O)Oc1ccccc1C(=O)O",
            name: "Aspirin",
            formula: "C9H8O4",
            molarMass: 180.16,
            physicalState: "solid",
            appearance: "white crystalline solid",
            chemicalClass: "aromatic_ester",
            functionalGroups: ["ester"],
          },
          {
            smiles: "CC(=O)O",
            name: "Acetic acid",
            formula: "C2H4O2",
            molarMass: 60.05,
            physicalState: "liquid",
            appearance: "clear liquid",
            chemicalClass: "carboxylic_acid",
            functionalGroups: ["carboxylic_acid"],
          },
        ],
        reactionType: "synthesis",
        atomEconomyPercent: 75.0,
        expectedByproducts: ["Acetic acid"],
        mechanismNotes: "Direct forward synthesis of aspirin",
        latencyMs: 95,
        trainingDataset: "USPTO-1.8M",
        device: "mps",
        beamsUsed: 4,
        timestamp: new Date().toISOString(),
      });

      // API recheck fails (e.g. network error / timeout)
      vi.spyOn(aiReactionPredictor, "recheckAndEnrich").mockRejectedValueOnce(
        new Error("Groq API rate limit or network unreachable")
      );

      const result = await simulationService.predictAny("C7H6O3 + C4H6O3", {}, {
        apiKey: "gsk_test_key",
        provider: "groq",
      });

      expect(result.source).toBe("ai_predicted");
      expect(result.simulationResult.resolution.status).toBe("REACTION");
      // ML model prediction is treated directly as final output!
      expect(result.simulationResult.resolution.aiProvider).toBe("ReactionT5v2 Neural Model");
      expect(result.simulationResult.resolution.isAiPredicted).toBe(true);
      expect(result.simulationResult.resolution.balancedEquation).toContain("C9H8O4");
    });
  });

  describe("Priority 3: ML Model Unable to Predict -> API Generates Output", () => {
    it("if ML model fails or is unable to predict, sends input to API to generate output as final output", async () => {
      // Mock ML model failing / unable to recognize
      vi.spyOn(localMlModelService, "predict").mockRejectedValueOnce(
        new Error("ML model service unavailable")
      );

      // Mock API generating the full reaction from scratch
      const aiPredictSpy = vi.spyOn(aiReactionPredictor, "predict").mockResolvedValueOnce({
        status: "REACTION",
        confidenceTier: "PREDICTED",
        confidenceScore: 0.95,
        reactionType: "redox_other",
        balancedEquation: "2KMnO4 + 3H2SO4 + 5H2O2 -> K2SO4 + 2MnSO4 + 8H2O + 5O2",
        reactants: [
          { chemicalId: "kmno4", formula: "KMnO4", commonName: "Potassium permanganate", coefficient: 2, isRegistered: false },
          { chemicalId: "h2so4", formula: "H2SO4", commonName: "Sulfuric acid", coefficient: 3, isRegistered: false },
          { chemicalId: "h2o2", formula: "H2O2", commonName: "Hydrogen peroxide", coefficient: 5, isRegistered: false },
        ],
        products: [
          { chemicalId: "k2so4", formula: "K2SO4", commonName: "Potassium sulfate", coefficient: 1, isRegistered: false },
          { chemicalId: "mnso4", formula: "MnSO4", commonName: "Manganese(II) sulfate", coefficient: 2, isRegistered: false },
          { chemicalId: "water", formula: "H2O", commonName: "Water", coefficient: 8, isRegistered: false },
          { chemicalId: "o2", formula: "O2", commonName: "Oxygen", coefficient: 5, isRegistered: false },
        ],
        observableEffects: [
          { type: "color_change", description: "Purple solution turns completely colorless", colorFrom: "#800080", colorTo: "#FFFFFF" },
          { type: "gas_evolution", description: "Vigorous oxygen gas evolution" },
        ],
        energyClassification: "exothermic",
        enthalpyKjPerMol: -840,
        explanation: "Permanganate oxidizes hydrogen peroxide to oxygen gas while manganese is reduced to Mn2+.",
        ruleApplied: "ai_predicted:groq",
        warnings: [],
        aiProvider: "Groq (Llama 3.3)",
        isAiPredicted: true,
      });

      const result = await simulationService.predictAny("KMnO4 + H2O2 + H2SO4", {}, {
        apiKey: "gsk_test_key",
        provider: "groq",
      });

      expect(aiPredictSpy).toHaveBeenCalled();
      expect(result.source).toBe("ai_predicted");
      expect(result.simulationResult.resolution.status).toBe("REACTION");
      expect(result.simulationResult.resolution.aiProvider).toBe("Groq (Llama 3.3)");
      expect(result.simulationResult.resolution.balancedEquation).toContain("2MnSO4");
      expect(result.simulationResult.resolution.calorimetry).toBeDefined();
      expect(result.simulationResult.resolution.observableEffects.some((e) => e.type === "temperature_increase")).toBe(true);
    });
  });
});
