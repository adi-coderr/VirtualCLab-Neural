import type Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { getDb } from "../data/db.js";
import { ChemicalRepository } from "../data/repositories/chemicalRepository.js";
import { ReactionRepository } from "../data/repositories/reactionRepository.js";
import { resolveReaction, generateProcessBreakdown, type ChemicalLookupPort } from "../chemistry-engine/reactionResolver.js";
import { computeStoichiometry } from "../chemistry-engine/stoichiometry.js";
import { computeCalorimetry } from "../chemistry-engine/calorimetry.js";
import { parseFormula } from "../chemistry-engine/formulaParser.js";
import { computeMolarMass } from "../chemistry-engine/molarMass.js";
import { aiReactionPredictor, type PredictReactionOptions } from "./aiReactionPredictor.js";
import { localMlModelService, type LocalModelPredictResponse } from "./localMlModelService.js";
import {
  auditReactionChemistry,
  normalizeFormulaCasing,
  isSaturatedAlkane,
  extractSpeciesComposition,
  checkInertAlkaneMixture,
  type ReactionAuditReport,
} from "../chemistry-engine/reactionAudit.js";
import { estimateFormulaAndComposition } from "../chemistry-engine/molecularAnalysis.js";
import { HttpError } from "../utils/errors.js";
import type {
  CalorimetryResult,
  Chemical,
  ReactionConditions,
  ReactionInputSpecies,
  ReactionResolution,
  StoichiometryLine,
  ObservableEffect,
  ResolvedSpecies,
  ReactionType,
  PhysicalState,
} from "../chemistry-engine/types.js";
import { logger } from "../utils/logger.js";

const prisma = new PrismaClient();

export interface MlProductAnalysis {
  smiles: string;
  name: string;
  formula: string;
  molarMass: number;
  physicalState: "solid" | "liquid" | "gas" | "aqueous";
  appearance: string;
  chemicalClass: string;
  functionalGroups: string[];
  safetyNotes?: string;
}

export interface MlPredictionData {
  modelName: string;
  rawOutput: string;
  cleanedOutput: string;
  predictedEquation: string;
  predictedProducts: string[];
  productAnalyses?: MlProductAnalysis[];
  reactionType?: string;
  atomEconomyPercent?: number;
  expectedByproducts?: string[];
  mechanismNotes?: string;
  latencyMs: number;
  trainingDataset: string;
  device?: string;
  beamsUsed?: number;
}

export interface SimulationResult {
  resolution: ReactionResolution;
  stoichiometry?: StoichiometryLine[];
  limitingReagentChemicalId?: string;
  calorimetry?: CalorimetryResult;
  mlPrediction?: MlPredictionData;
}

function isReactionEcho(reactants: string[], products: string[]): boolean {
  if (products.length === 0) return true;
  const normalize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const rSet = new Set(reactants.map(normalize).filter(Boolean));
  const pSet = new Set(products.map(normalize).filter(Boolean));
  if (rSet.size > 0 && rSet.size === pSet.size && [...rSet].every((r) => pSet.has(r))) {
    return true;
  }
  return false;
}

export class SimulationService {
  private readonly chemicalRepo: ChemicalRepository;
  private readonly reactionRepo: ReactionRepository;
  private readonly lookup: ChemicalLookupPort;

  constructor(db?: Database.Database) {
    const database = db ?? getDb();
    this.chemicalRepo = new ChemicalRepository(database);
    this.reactionRepo = new ReactionRepository(database);
    this.lookup = {
      getById: (id) => this.chemicalRepo.getById(id),
      findByComposition: (composition, charge) => this.chemicalRepo.findByComposition(composition, charge),
      findCuratedReactionsByReactantSet: (ids) => this.reactionRepo.findByReactantSet(ids),
    };
  }

  private resolveChemicalsOrThrow(inputs: ReactionInputSpecies[]): Chemical[] {
    const chemicals: Chemical[] = [];
    const missing: string[] = [];
    for (const input of inputs) {
      let chem = this.chemicalRepo.getById(input.chemicalId);
      if (!chem && input.formula) {
        try {
          const parsed = parseFormula(input.formula);
          chem = {
            id: input.chemicalId.toLowerCase(),
            formula: input.formula,
            commonName: input.formula,
            composition: parsed.composition,
            charge: parsed.charge ?? 0,
            chemicalClass: "other",
            physicalState: "liquid",
            molarMass: computeMolarMass(parsed.composition),
            density: 1.0,
            isAcid: false,
            isBase: false,
            acidBaseStrength: "none",
            aliases: [],
            hazards: [],
            provenance: {
              source: "ai_predictor",
              confidence: "medium",
              dataVersion: "1.0",
            },
          };
        } catch {
          // not a valid formula
        }
      }
      if (chem) chemicals.push(chem);
      else missing.push(input.chemicalId);
    }
    if (missing.length > 0) {
      throw HttpError.badRequest(
        "UNKNOWN_CHEMICAL",
        `Unknown chemical id(s): ${missing.join(", ")}. Search /api/chemicals/search to find valid ids.`,
        { missing }
      );
    }
    return chemicals;
  }

  private resolveSpecies(token: string): ResolvedSpecies {
    const clean = token.trim();
    const lower = clean.toLowerCase();
    const byId = this.chemicalRepo.getById(lower);
    if (byId) {
      return {
        chemicalId: byId.id,
        formula: byId.formula,
        commonName: byId.commonName,
        coefficient: 1,
        isRegistered: true,
      };
    }
    const searchRes = this.chemicalRepo.search(clean, 1, 0).items[0];
    if (searchRes) {
      return {
        chemicalId: searchRes.id,
        formula: searchRes.formula,
        commonName: searchRes.commonName,
        coefficient: 1,
        isRegistered: true,
      };
    }
    // Check if formula parser can parse it after formula casing normalization (e.g. c2h6 -> C2H6, c4h6 -> C4H6)
    const norm = normalizeFormulaCasing(clean);
    try {
      const parsed = parseFormula(norm);
      if (Object.keys(parsed.composition).length > 0) {
        return {
          chemicalId: lower.replace(/[^a-z0-9]/g, "_"),
          formula: norm,
          commonName: clean,
          coefficient: 1,
          isRegistered: false,
        };
      }
    } catch {}
    const est = estimateFormulaAndComposition(clean);
    return {
      chemicalId: lower.replace(/[^a-z0-9]/g, "_"),
      formula: est.formula || clean,
      commonName: clean,
      coefficient: 1,
      isRegistered: false,
    };
  }

  private getMolarMass(chemicalId: string, formula?: string): number {
    const registered = this.chemicalRepo.getById(chemicalId);
    if (registered?.molarMass) return registered.molarMass;
    const candidateFormula = formula || (chemicalId && !chemicalId.includes(" ") ? chemicalId : undefined);
    if (candidateFormula) {
      try {
        const parsed = parseFormula(candidateFormula);
        return computeMolarMass(parsed.composition);
      } catch {
        return 50.0;
      }
    }
    return 50.0;
  }

  /**
   * Builds a full ReactionResolution from a ReactionT5v2 Neural Model prediction.
   * Also registers any novel chemical species in SQLite chemlab.db so substance chips and 3D viewer work cleanly.
   */
  private buildResolutionFromMl(
    mlRes: LocalModelPredictResponse,
    reactants: ResolvedSpecies[],
    conditions: ReactionConditions = {},
    auditedProducts?: ResolvedSpecies[],
    auditedEquation?: string
  ): ReactionResolution {
    const db = getDb();

    const rawProducts = auditedProducts && auditedProducts.length > 0
      ? auditedProducts
      : (mlRes.productAnalyses && mlRes.productAnalyses.length > 0
        ? mlRes.productAnalyses
        : mlRes.predictedProducts.map((p) => ({
            formula: p,
            name: p,
            smiles: p,
            molarMass: 100,
            physicalState: "liquid" as const,
            appearance: "clear liquid",
            chemicalClass: "organic_compound",
            functionalGroups: [],
          })));

    const products: ResolvedSpecies[] = rawProducts.map((p, idx) => {
      const chemId = p.formula ? p.formula.toLowerCase().replace(/[^a-z0-9]/g, "_") : `prod_${idx}`;
      const formula = p.formula || (p as any).smiles || "Unknown";
      const name = (p as any).commonName || (p as any).name || formula;
      const molarMass = (p as any).molarMass || this.getMolarMass(chemId, formula);
      const state = ((p as any).physicalState || "liquid") as PhysicalState;
      const smiles = (p as any).smiles || undefined;
      const coefficient = (p as any).coefficient || 1;

      try {
        db.prepare(
          `INSERT OR IGNORE INTO chemicals (
            id, common_name, formula, molar_mass, physical_state,
            chemical_class, smiles, source, confidence, data_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          chemId,
          name,
          formula,
          molarMass,
          state,
          (p as any).chemicalClass || "organic_compound",
          smiles || null,
          "ml_reaction_t5v2",
          "high",
          "1.0"
        );
      } catch {
        // Ignore sqlite insert errors
      }

      const existingChem = this.chemicalRepo.getById(chemId) || this.chemicalRepo.getByFormula(formula);
      const subColor = (p as any).substanceColor || existingChem?.substanceColor || undefined;

      return {
        chemicalId: chemId,
        formula,
        commonName: name,
        coefficient,
        isRegistered: true,
        substanceColor: subColor,
      };
    });

    const rColors = reactants
      .map((r) => this.chemicalRepo.getById(r.chemicalId)?.substanceColor || this.chemicalRepo.getByFormula(r.formula)?.substanceColor)
      .filter((c): c is string => Boolean(c) && c !== "#FFFFFF" && c !== "#CFE8F3");
    const defaultColorFrom = rColors[0] || "#F5F5F5";

    const observableEffects: ObservableEffect[] = [];
    for (const p of mlRes.productAnalyses || []) {
      const chemId = p.formula ? p.formula.toLowerCase().replace(/[^a-z0-9]/g, "_") : undefined;
      const matchedProd = products.find((prod) => prod.formula === p.formula || prod.chemicalId === chemId);
      const prodColor = (matchedProd as any)?.substanceColor;

      if (p.physicalState === "gas") {
        observableEffects.push({
          type: "gas_evolution",
          description: `Vigorous effervescence and gas evolution observed (${p.name || p.formula}).`,
          relatedChemicalId: chemId,
        });
      } else if (p.physicalState === "solid") {
        observableEffects.push({
          type: "precipitation",
          description: `Formation of precipitate: ${p.appearance || p.name || p.formula}.`,
          relatedChemicalId: chemId,
          colorFrom: defaultColorFrom,
          colorTo: prodColor || "#FFFFFF",
        });
      } else if (p.appearance && p.appearance !== "clear liquid") {
        observableEffects.push({
          type: "color_change",
          description: `Solution appearance changes: ${p.appearance}.`,
          relatedChemicalId: chemId,
          colorFrom: defaultColorFrom,
          colorTo: prodColor,
        });
      }
    }

    const coloredProd = products.find((prod) => {
      const c = (prod as any).substanceColor;
      return c && c !== "#FFFFFF" && c !== "#CFE8F3";
    });
    if (coloredProd && !observableEffects.some((e) => e.colorTo)) {
      observableEffects.unshift({
        type: "color_change",
        description: `Solution undergoes a distinct color transformation yielding ${coloredProd.commonName}.`,
        relatedChemicalId: coloredProd.chemicalId,
        colorFrom: defaultColorFrom,
        colorTo: (coloredProd as any).substanceColor,
      });
    }

    if (observableEffects.length === 0) {
      observableEffects.push({
        type: "phase_change",
        description: `Chemical transformation completed yielding ${products.map((p) => p.commonName).join(", ")}.`,
      });
    }

    let mappedType: ReactionType = "synthesis";
    const rt = (mlRes.reactionType || "").toLowerCase();
    if (rt.includes("substitution") || rt.includes("displacement") || rt.includes("coupling")) {
      mappedType = "single_displacement";
    } else if (rt.includes("elimination") || rt.includes("decomposition") || rt.includes("cracking")) {
      mappedType = "decomposition";
    } else if (rt.includes("redox") || rt.includes("oxidation") || rt.includes("reduction")) {
      mappedType = "redox_other";
    } else if (rt.includes("condensation") || rt.includes("addition") || rt.includes("synthesis")) {
      mappedType = "synthesis";
    }

    const balancedEquation =
      auditedEquation ||
      mlRes.predictedEquation ||
      `${reactants.map((r) => `${r.coefficient > 1 ? `${r.coefficient} ` : ""}${r.formula}`).join(" + ")} -> ${products.map((p) => `${p.coefficient > 1 ? `${p.coefficient} ` : ""}${p.formula}`).join(" + ")}`;

    const resolution: ReactionResolution = {
      status: "REACTION",
      confidenceTier: "PREDICTED",
      confidenceScore: 0.94,
      reactionType: mappedType,
      balancedEquation,
      reactants,
      products,
      observableEffects,
      energyClassification: "exothermic",
      enthalpyKjPerMol: -45.0,
      explanation:
        mlRes.mechanismNotes ||
        `Reaction predicted by ReactionT5v2 Neural Model (trained on 1.8M USPTO reactions) yielding ${products
          .map((p) => p.commonName)
          .join(", ")}.`,
      ruleApplied: "ml_neural_reactiont5v2",
      safetyNotes:
        mlRes.productAnalyses?.map((p) => p.safetyNotes).filter(Boolean).join(" ") ||
        "Handle organic synthesized products in a ventilated fume hood.",
      warnings: [],
      isAiPredicted: true,
      aiProvider: "ReactionT5v2 Neural Model",
    };

    resolution.processBreakdown = generateProcessBreakdown(resolution);
    return resolution;
  }

  private computeStoichiometryForResolution(
    resolution: ReactionResolution,
    inputs: ReactionInputSpecies[],
    conditions: ReactionConditions = {}
  ): { stoichiometry?: StoichiometryLine[]; calorimetry?: CalorimetryResult } {
    const stoichReactants = resolution.reactants.map((r) => ({
      chemicalId: r.chemicalId,
      formula: r.formula,
      commonName: r.commonName,
      coefficient: r.coefficient || 1,
      molarMass: this.getMolarMass(r.chemicalId, r.formula),
    }));

    const stoichProducts = resolution.products.map((p) => ({
      chemicalId: p.chemicalId,
      formula: p.formula,
      commonName: p.commonName,
      coefficient: p.coefficient || 1,
      molarMass: this.getMolarMass(p.chemicalId, p.formula),
      isByproduct: p.isByproduct,
    }));

    let stoichiometry: StoichiometryLine[] | undefined;
    let calorimetry: CalorimetryResult | undefined;
    try {
      const stoich = computeStoichiometry(stoichReactants, stoichProducts, inputs);
      stoichiometry = stoich.lines;
      if (resolution.enthalpyKjPerMol !== undefined && stoich.extentMoles > 0) {
        try {
          calorimetry = computeCalorimetry({
            inputs,
            extentMoles: stoich.extentMoles,
            enthalpyKjPerMol: resolution.enthalpyKjPerMol,
            initialTemperatureC: conditions.temperatureC ?? 25.0,
            molarMassLookup: (id) => this.getMolarMass(id),
          });
        } catch {
          // Calorimetry optional
        }
      }
    } catch {
      // Stoichiometry optional
    }

    return { stoichiometry, calorimetry };
  }

  /**
   * Synchronous core simulation using local chemical engine and curated database.
   */
  simulate(inputs: ReactionInputSpecies[], conditions: ReactionConditions = {}): SimulationResult {
    const chemicals = this.resolveChemicalsOrThrow(inputs);

    const resolution = resolveReaction(chemicals, conditions, this.lookup);
    logger.info("Reaction simulated", {
      reactants: chemicals.map((c) => c.id),
      status: resolution.status,
      tier: resolution.confidenceTier,
    });

    if (resolution.status !== "REACTION") {
      return { resolution };
    }

    const stoichReactants = resolution.reactants.map((r) => ({
      chemicalId: r.chemicalId,
      formula: r.formula,
      commonName: r.commonName,
      coefficient: r.coefficient,
      molarMass: this.getMolarMass(r.chemicalId, r.formula),
    }));

    const stoichProducts = resolution.products
      .filter((p) => p.isRegistered)
      .map((p) => ({
        chemicalId: p.chemicalId,
        formula: p.formula,
        commonName: p.commonName,
        coefficient: p.coefficient,
        molarMass: this.getMolarMass(p.chemicalId, p.formula),
        isByproduct: p.isByproduct,
      }));

    try {
      const stoich = computeStoichiometry(stoichReactants, stoichProducts, inputs);

      let calorimetry: CalorimetryResult | undefined;
      let augmentedResolution = resolution;

      if (resolution.enthalpyKjPerMol !== undefined && stoich.extentMoles > 0) {
        calorimetry = computeCalorimetry({
          inputs,
          extentMoles: stoich.extentMoles,
          enthalpyKjPerMol: resolution.enthalpyKjPerMol,
          initialTemperatureC: conditions.temperatureC ?? 25.0,
          molarMassLookup: (id) => this.getMolarMass(id),
        });

        const augmentedEffects = resolution.observableEffects.map((effect) => {
          if (effect.type === "temperature_decrease" || effect.type === "temperature_increase") {
            const isDecrease = calorimetry!.temperatureDeltaC < 0;
            const changeLabel = isDecrease
              ? `Temperature decreased by ${Math.abs(calorimetry!.temperatureDeltaC).toFixed(1)} °C (from ${calorimetry!.initialTemperatureC.toFixed(1)} °C to ${calorimetry!.finalTemperatureC.toFixed(1)} °C).`
              : calorimetry!.temperatureDeltaC > 0
                ? `Temperature increased by ${calorimetry!.temperatureDeltaC.toFixed(1)} °C (from ${calorimetry!.initialTemperatureC.toFixed(1)} °C to ${calorimetry!.finalTemperatureC.toFixed(1)} °C).`
                : `No significant temperature change (${calorimetry!.initialTemperatureC.toFixed(1)} °C).`;

            return {
              ...effect,
              temperatureDeltaC: calorimetry!.temperatureDeltaC,
              initialTemperatureC: calorimetry!.initialTemperatureC,
              finalTemperatureC: calorimetry!.finalTemperatureC,
              description: `${changeLabel} ${effect.description}`,
            };
          }
          return effect;
        });

        augmentedResolution = {
          ...resolution,
          observableEffects: augmentedEffects,
          calorimetry,
        };

        if (!augmentedResolution.processBreakdown) {
          augmentedResolution.processBreakdown = generateProcessBreakdown(augmentedResolution);
        }
      }

      return {
        resolution: augmentedResolution,
        stoichiometry: stoich.lines,
        limitingReagentChemicalId: stoich.limitingReagentChemicalId,
        calorimetry,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown stoichiometry error";
      return {
        resolution: { ...resolution, warnings: [...resolution.warnings, `Stoichiometry not computed: ${message}`] },
      };
    }
  }

  /**
   * 3-tier reaction resolution pipeline:
   * 1. Search local curated database and deterministic rule engine.
   * 2. If not found in database, send to local ReactionT5v2 Neural Model.
   * 3. If ML model cannot recognize or provide output, fall back to Groq AI API.
   * All outputs are unified into the main result.
   */
  async simulateWithAi(
    inputs: ReactionInputSpecies[],
    conditions: ReactionConditions = {},
    options?: PredictReactionOptions
  ): Promise<SimulationResult> {
    // 1. Search local curated database and deterministic rule engine
    const localResult = this.simulate(inputs, conditions);
    if (localResult.resolution.status !== "UNSUPPORTED") {
      logger.info("Tier 1: Reaction resolved via local database/engine", {
        reactants: inputs.map((i) => i.chemicalId),
        status: localResult.resolution.status,
        equation: localResult.resolution.balancedEquation,
      });
      return localResult;
    }

    if (process.env.NODE_ENV === "test" && !options?.apiKey) {
      return localResult;
    }

    const chemicals = this.resolveChemicalsOrThrow(inputs);

    // Chemical Plausibility check: Saturated alkanes (e.g. C2H6 + C3H8) are chemically inert
    const inertAlkaneRes = checkInertAlkaneMixture(
      chemicals.map((c) => ({ formula: c.formula, chemicalId: c.id, commonName: c.commonName }))
    );
    if (inertAlkaneRes) {
      logger.info("Reactants identified as inert alkane mixture under standard conditions", {
        reactants: inputs.map((i) => i.chemicalId),
      });
      return {
        resolution: inertAlkaneRes,
      };
    }

    // 2. Query Local Neural ML Model (ReactionT5v2) unless an external provider was requested
    if (!options?.provider || options.provider === "groq") {
      try {
        const mlTokens = chemicals.map((chem) => chem.smiles || chem.formula || chem.commonName || chem.id);
        const mlInput = mlTokens.join(".");

        if (mlInput.trim()) {
          const mlPromise = localMlModelService.predict({ input: mlInput, numBeams: 3, maxLength: 128 });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("ML timeout")), 4500)
          );
          const mlRes = await Promise.race([mlPromise, timeoutPromise]);

          const hasValidProducts = !!(mlRes && mlRes.predictedProducts && mlRes.predictedProducts.length > 0);
          const isEcho = isReactionEcho(mlTokens, mlRes?.predictedProducts || []);

          const resolvedReactants: ResolvedSpecies[] = chemicals.map((chem) => ({
            chemicalId: chem.id,
            formula: chem.formula,
            commonName: chem.commonName,
            coefficient: 1,
            isRegistered: true,
          }));

          const candidateProducts: ResolvedSpecies[] = (mlRes?.predictedProducts || []).map((p, idx) => {
            const profile = mlRes?.productAnalyses?.[idx];
            return {
              chemicalId: (profile?.formula || p).toLowerCase().replace(/[^a-z0-9]/g, "_"),
              formula: profile?.formula || p,
              commonName: profile?.name || p,
              coefficient: 1,
              isRegistered: true,
            };
          });

          const audit: ReactionAuditReport = hasValidProducts && !isEcho
            ? auditReactionChemistry(resolvedReactants, candidateProducts)
            : { passed: false, isInertAlkanes: false, failureReason: "No valid products or echo detected." };

          if (audit.passed) {
            logger.info("Tier 2: Reaction validated and resolved via ReactionT5v2 Neural Model", {
              input: mlInput,
              equation: audit.balancedEquation || mlRes.predictedEquation,
              latencyMs: mlRes.latencyMs,
            });

            const mlResolution = this.buildResolutionFromMl(
              mlRes,
              audit.balancedReactants || resolvedReactants,
              conditions,
              audit.balancedProducts,
              audit.balancedEquation
            );
            const { stoichiometry, calorimetry } = this.computeStoichiometryForResolution(
              mlResolution,
              inputs,
              conditions
            );

            return {
              resolution: mlResolution,
              stoichiometry,
              calorimetry,
            };
          } else {
            logger.info("ML model prediction rejected by chemical audit, cascading to Groq AI", {
              input: mlInput,
              reason: audit.failureReason,
              cleanedOutput: mlRes?.cleanedOutput,
            });
          }
        }
      } catch (err: any) {
        logger.info("Local ML model skipped or failed, falling back to Groq AI", { error: err.message });
      }
    }

    // 3. Fallback to Groq AI API if ML model could not recognize and provide valid output
    let result = localResult;
    if (result.resolution.status === "UNSUPPORTED") {
      if (process.env.NODE_ENV === "test" && !options?.apiKey) {
        return result;
      }
      try {
        const reactantDetails = inputs.map((input) => {
          const chem = this.chemicalRepo.getById(input.chemicalId);
          const name = chem?.commonName || input.chemicalId;
          const formula = chem?.formula || input.formula || input.chemicalId;
          const conc = input.concentrationMolar ? `${input.concentrationMolar} M` : undefined;
          const amt = `${input.amount} ${input.unit}`;
          return {
            name,
            formula,
            amount: conc ? `${amt} (${conc})` : amt,
            class: chem?.chemicalClass,
            state: chem?.physicalState,
          };
        });

        const reactantDescription = chemicals
          .map((c) => `${c.commonName} (${c.formula})`)
          .join(" + ");
        const aiResolution = await aiReactionPredictor.predict(reactantDescription, {
          apiKey: options?.apiKey,
          provider: options?.provider,
          conditions,
          reactantDetails,
        });

        if (aiResolution.status !== "REACTION") {
          return { ...result, resolution: aiResolution };
        }

        // Validate Groq AI prediction with chemical balancer and audit
        const audit = auditReactionChemistry(aiResolution.reactants, aiResolution.products);
        if (audit.passed) {
          if (audit.balancedEquation) aiResolution.balancedEquation = audit.balancedEquation;
          if (audit.balancedReactants) aiResolution.reactants = audit.balancedReactants;
          if (audit.balancedProducts) aiResolution.products = audit.balancedProducts;
        }

        const { stoichiometry, calorimetry } = this.computeStoichiometryForResolution(
          aiResolution,
          inputs,
          conditions
        );

        return {
          ...result,
          resolution: aiResolution,
          stoichiometry,
          calorimetry,
        };
      } catch (err: any) {
        logger.info("AI reaction prediction skipped or not available", { error: err.message });
        if (err.message && err.message.includes("NO_API_KEY")) {
          result.resolution.warnings = [
            ...(result.resolution.warnings ?? []),
            "This reaction is not in our curated database. Set an AI API key in ✨ AI Settings to automatically predict and balance it in the background.",
          ];
        }
      }
    }

    return result;
  }


  private parseOrBuildInputsForPredict(
    query: string,
    reactants: { chemicalId: string; coefficient?: number }[]
  ): ReactionInputSpecies[] {
    const amountRegex = /(\d+(?:\.\d+)?)\s*(g|mg|kg|ml|l|mol|mmol)\s+([a-zA-Z0-9_\-\+]+)/gi;
    const molarityRegex = /(\d+(?:\.\d+)?)\s*M\s+([a-zA-Z0-9_\-\+]+)/gi;
    const parsedAmounts = new Map<string, { amount: number; unit: string; concentrationMolar?: number }>();

    let match;
    while ((match = amountRegex.exec(query)) !== null) {
      const amt = parseFloat(match[1]);
      const u = match[2];
      const chem = match[3].toLowerCase();
      parsedAmounts.set(chem, { amount: amt, unit: u });
    }
    while ((match = molarityRegex.exec(query)) !== null) {
      const conc = parseFloat(match[1]);
      const chem = match[2].toLowerCase();
      const existing = parsedAmounts.get(chem);
      if (existing) {
        existing.concentrationMolar = conc;
      } else {
        parsedAmounts.set(chem, { amount: 25, unit: "mL", concentrationMolar: conc });
      }
    }

    return reactants.map((r) => {
      const key = r.chemicalId.toLowerCase();
      const parsed = parsedAmounts.get(key);
      if (parsed) {
        return {
          chemicalId: r.chemicalId,
          amount: parsed.amount,
          unit: parsed.unit as any,
          concentrationMolar: parsed.concentrationMolar,
        };
      }

      const chem = this.chemicalRepo.getById(r.chemicalId);
      const coeff = r.coefficient || 1;
      if (r.chemicalId === "water" || r.chemicalId === "h2o") {
        return { chemicalId: r.chemicalId, amount: 50, unit: "mL" };
      }
      if (chem?.physicalState === "solid") {
        return { chemicalId: r.chemicalId, amount: 10 * coeff, unit: "g" };
      }
      if (chem?.physicalState === "gas") {
        return { chemicalId: r.chemicalId, amount: 1 * coeff, unit: "mol" };
      }
      return {
        chemicalId: r.chemicalId,
        amount: 25 * coeff,
        unit: "mL",
        concentrationMolar: 1.0,
      };
    });
  }

  /**
   * Predicts a reaction from free text (e.g. "KMnO4 + H2O2 + H2SO4" or "c2h4cl2 + c2h4br2").
   * 1. First checks the curated database records in SQLite dev.db.
   * 2. If not in database, queries the local ReactionT5v2 Neural Model (with chemical integrity audit).
   * 3. If ML model cannot recognize or provide output, falls back to Groq AI API.
   * All outputs are unified into the main result.
   */
  async predictAny(
    query: string,
    conditions: ReactionConditions = {},
    options?: PredictReactionOptions
  ): Promise<{ simulationResult: SimulationResult; source: "curated_database" | "ai_predicted" }> {
    const clean = query.trim();
    // Split reactants by + or comma, preserving chemical names with spaces
    const mlTokens = clean.split(/\s*[\+,]\s*|\s+\.\s+/).map((t) => t.trim()).filter(Boolean);

    // Chemical Plausibility check: Saturated alkanes (e.g. C2H6 + C3H8) are chemically inert
    const inertAlkaneRes = checkInertAlkaneMixture(
      mlTokens.map((t) => this.resolveSpecies(t))
    );
    if (inertAlkaneRes && !(conditions.temperatureC && conditions.temperatureC > 400)) {
      return {
        simulationResult: { resolution: inertAlkaneRes },
        source: "ai_predicted",
      };
    }

    // Extract clean tokens without amounts for database lookup
    const cleanWithoutAmounts = clean
      .replace(/\b\d+(?:\.\d+)?\s*(g|mg|kg|ml|l|mol|mmol|M)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // 1. Search dev.db by exact reactantKey
    let matchedRow = await prisma.reaction.findUnique({ where: { reactantKey: clean.toLowerCase() } }).catch(() => null);
    if (!matchedRow && cleanWithoutAmounts) {
      matchedRow = await prisma.reaction.findUnique({ where: { reactantKey: cleanWithoutAmounts.toLowerCase() } }).catch(() => null);
    }

    if (!matchedRow) {
      const strippedTokens = (cleanWithoutAmounts || clean).split(/\s*[\+,]\s*|\s+\.\s+/).map((t) => t.trim()).filter(Boolean);
      const sortedParts = strippedTokens.map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, "_")).sort().join("+");
      matchedRow = await prisma.reaction.findUnique({ where: { reactantKey: sortedParts } }).catch(() => null);
    }

    // Search by name or id, or by equation if query has an arrow (e.g. "A + B -> C")
    const hasArrow = clean.includes("->") || clean.includes("→");
    if (!matchedRow) {
      const searchTarget = cleanWithoutAmounts || clean;
      matchedRow = await prisma.reaction.findFirst({
        where: {
          OR: [
            { name: { contains: searchTarget } },
            { id: { contains: searchTarget.toLowerCase() } },
            ...(hasArrow ? [{ equation: { contains: clean } }] : []),
          ],
        },
      }).catch(() => null);
    }

    if (matchedRow) {
      const cond = (matchedRow.conditions as any) || {};
      const obs = (matchedRow.observations as any[]) || [];
      const reactants = (matchedRow.reactants as any[]) || [];
      const products = (matchedRow.products as any[]) || [];

      let resolution: ReactionResolution = {
        status: "REACTION",
        confidenceTier: "SUPPORTED",
        confidenceScore: matchedRow.confidenceScore,
        reactionType: matchedRow.reactionType as any,
        balancedEquation: matchedRow.equation,
        netIonicEquation: matchedRow.netIonicEquation ?? undefined,
        reactants: reactants.map((r: any) => ({
          chemicalId: r.chemicalId,
          formula: r.chemicalId.toUpperCase(),
          commonName: r.chemicalId,
          coefficient: r.coefficient,
          isRegistered: true,
        })),
        products: products.map((p: any) => ({
          chemicalId: p.chemicalId,
          formula: p.chemicalId.toUpperCase(),
          commonName: p.chemicalId,
          coefficient: p.coefficient,
          isByproduct: !!p.isByproduct,
          isRegistered: true,
        })),
        observableEffects: obs as ObservableEffect[],
        energyClassification: cond.energyClassification,
        enthalpyKjPerMol: cond.enthalpyKjPerMol,
        explanation: `Curated reaction from verified chemical database: ${matchedRow.name}.`,
        ruleApplied: "curated_database",
        safetyNotes: (matchedRow.hazards as any)?.safetyNotes,
        warnings: [],
      };

      const inputs = this.parseOrBuildInputsForPredict(clean, reactants);
      const { stoichiometry, calorimetry } = this.computeStoichiometryForResolution(
        resolution,
        inputs,
        conditions
      );

      if (calorimetry) {
        const augmentedEffects = resolution.observableEffects.map((effect) => {
          if (effect.type === "temperature_decrease" || effect.type === "temperature_increase") {
            const isDecrease = calorimetry.temperatureDeltaC < 0;
            const changeLabel = isDecrease
              ? `Temperature decreased by ${Math.abs(calorimetry.temperatureDeltaC).toFixed(1)} °C (from ${calorimetry.initialTemperatureC.toFixed(1)} °C to ${calorimetry.finalTemperatureC.toFixed(1)} °C).`
              : calorimetry.temperatureDeltaC > 0
                ? `Temperature increased by ${calorimetry.temperatureDeltaC.toFixed(1)} °C (from ${calorimetry.initialTemperatureC.toFixed(1)} °C to ${calorimetry.finalTemperatureC.toFixed(1)} °C).`
                : `No significant temperature change (${calorimetry.initialTemperatureC.toFixed(1)} °C).`;

            return {
              ...effect,
              temperatureDeltaC: calorimetry.temperatureDeltaC,
              initialTemperatureC: calorimetry.initialTemperatureC,
              finalTemperatureC: calorimetry.finalTemperatureC,
              description: `${changeLabel} ${effect.description}`,
            };
          }
          return effect;
        });

        resolution = {
          ...resolution,
          observableEffects: augmentedEffects,
          calorimetry,
        };
      }

      resolution.processBreakdown = generateProcessBreakdown(resolution);

      return {
        simulationResult: {
          resolution,
          stoichiometry,
          calorimetry,
        },
        source: "curated_database",
      };
    }

    // 2. Not in database: Try Local Neural ML Model (ReactionT5v2) unless an external provider was requested
    if (!options?.provider || options.provider === "groq") {
      try {
        const mlInput = clean.replace(/\s*\+\s*/g, ".");
        const mlRes = await localMlModelService.predict({ input: mlInput, numBeams: 3, maxLength: 128 });

        const hasValidProducts = !!(mlRes && mlRes.predictedProducts && mlRes.predictedProducts.length > 0);
        const isEcho = isReactionEcho(mlTokens, mlRes?.predictedProducts || []);

        const mockReactants: ResolvedSpecies[] = mlTokens.map((tok) => this.resolveSpecies(tok));

        const candidateProducts: ResolvedSpecies[] = (mlRes?.predictedProducts || []).map((p, idx) => {
          const profile = mlRes?.productAnalyses?.[idx];
          return {
            chemicalId: (profile?.formula || p).toLowerCase().replace(/[^a-z0-9]/g, "_"),
            formula: profile?.formula || p,
            commonName: profile?.name || p,
            coefficient: 1,
            isRegistered: true,
          };
        });

        const audit: ReactionAuditReport = hasValidProducts && !isEcho
          ? auditReactionChemistry(mockReactants, candidateProducts)
          : { passed: false, isInertAlkanes: false, failureReason: "No valid products or echo detected." };

        if (audit.passed) {
          logger.info("Tier 2: Reaction validated and resolved via ReactionT5v2 Neural Model in predictAny", {
            input: mlInput,
            equation: audit.balancedEquation || mlRes.predictedEquation,
            latencyMs: mlRes.latencyMs,
          });

          const mlResolution = this.buildResolutionFromMl(
            mlRes,
            audit.balancedReactants || mockReactants,
            conditions,
            audit.balancedProducts,
            audit.balancedEquation
          );
          const mockInputs: ReactionInputSpecies[] = mlResolution.reactants.map((r) => ({
            chemicalId: r.chemicalId,
            amount: r.coefficient || 1,
            unit: "mol",
          }));

          const { stoichiometry, calorimetry } = this.computeStoichiometryForResolution(
            mlResolution,
            mockInputs,
            conditions
          );

          return {
            simulationResult: {
              resolution: mlResolution,
              stoichiometry,
              calorimetry,
            },
            source: "ai_predicted",
          };
        } else {
          logger.info("Local ML model prediction rejected by chemical audit in predictAny, falling back to Groq AI", {
            input: mlInput,
            reason: audit.failureReason,
            products: mlRes?.predictedProducts,
          });
        }
      } catch (err: any) {
        logger.debug("Local ML model skipped in predictAny, falling back to Groq AI", { error: err.message });
      }
    }

    // 3. Fallback to Groq AI Reaction Predictor
    const resolution = await aiReactionPredictor.predict(clean, {
      apiKey: options?.apiKey,
      provider: options?.provider,
      conditions,
    });

    if (resolution.status !== "REACTION") {
      return {
        simulationResult: { resolution },
        source: "ai_predicted",
      };
    }

    // Validate Groq AI prediction with chemical balancer and audit
    const audit = auditReactionChemistry(resolution.reactants, resolution.products);
    if (audit.passed) {
      if (audit.balancedEquation) resolution.balancedEquation = audit.balancedEquation;
      if (audit.balancedReactants) resolution.reactants = audit.balancedReactants;
      if (audit.balancedProducts) resolution.products = audit.balancedProducts;
    }

    const mockInputs: ReactionInputSpecies[] = resolution.reactants.map((r) => ({
      chemicalId: r.chemicalId,
      amount: r.coefficient,
      unit: "mol",
    }));

    const { stoichiometry, calorimetry } = this.computeStoichiometryForResolution(
      resolution,
      mockInputs,
      conditions
    );

    return {
      simulationResult: {
        resolution,
        stoichiometry,
        calorimetry,
      },
      source: "ai_predicted",
    };
  }
}
