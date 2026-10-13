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
  ): {
    resolution: ReactionResolution;
    stoichiometry?: StoichiometryLine[];
    limitingReagentChemicalId?: string;
    calorimetry?: CalorimetryResult;
  } {
    const stoichReactants = resolution.reactants.map((r) => ({
      chemicalId: r.chemicalId,
      formula: r.formula,
      commonName: r.commonName,
      coefficient: r.coefficient || 1,
      molarMass: this.getMolarMass(r.chemicalId, r.formula),
    }));

    const stoichProducts = resolution.products
      .filter((p) => p.isRegistered)
      .map((p) => ({
        chemicalId: p.chemicalId,
        formula: p.formula,
        commonName: p.commonName,
        coefficient: p.coefficient || 1,
        molarMass: this.getMolarMass(p.chemicalId, p.formula),
        isByproduct: p.isByproduct,
      }));

    const enrichedInputs = inputs.map((inp) => {
      if (inp.formula) return inp;
      const chem = this.chemicalRepo.getById(inp.chemicalId);
      return {
        ...inp,
        formula: chem?.formula || inp.formula,
      };
    });

    try {
      const stoich = computeStoichiometry(stoichReactants, stoichProducts, enrichedInputs);

      let calorimetry: CalorimetryResult | undefined;
      let augmentedResolution = resolution;

      const effectiveEnthalpy =
        resolution.enthalpyKjPerMol !== undefined
          ? resolution.enthalpyKjPerMol
          : resolution.energyClassification === "exothermic"
            ? -65.0
            : resolution.energyClassification === "endothermic"
              ? 35.0
              : undefined;

      if (effectiveEnthalpy !== undefined && stoich.extentMoles > 0) {
        calorimetry = computeCalorimetry({
          inputs: enrichedInputs,
          extentMoles: stoich.extentMoles,
          enthalpyKjPerMol: effectiveEnthalpy,
          initialTemperatureC: conditions.temperatureC ?? 25.0,
          molarMassLookup: (id) => this.getMolarMass(id),
        });
        augmentedResolution = this.augmentResolutionWithCalorimetry(
          { ...resolution, enthalpyKjPerMol: effectiveEnthalpy },
          calorimetry
        );
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
   * Augments a ReactionResolution with calorimetry results, updating temperature change observable effects
   * and process breakdowns consistently.
   */
  private augmentResolutionWithCalorimetry(
    resolution: ReactionResolution,
    calorimetry?: CalorimetryResult
  ): ReactionResolution {
    if (!calorimetry) return resolution;

    let hasTempEffect = false;
    const augmentedEffects: ObservableEffect[] = resolution.observableEffects.map((effect): ObservableEffect => {
      if (effect.type === "temperature_decrease" || effect.type === "temperature_increase") {
        hasTempEffect = true;
        const isDecrease = calorimetry.temperatureDeltaC < 0;
        const changeLabel = isDecrease
          ? `Temperature decreased by ${Math.abs(calorimetry.temperatureDeltaC).toFixed(1)} °C (from ${calorimetry.initialTemperatureC.toFixed(1)} °C to ${calorimetry.finalTemperatureC.toFixed(1)} °C).`
          : calorimetry.temperatureDeltaC > 0
            ? `Temperature increased by ${calorimetry.temperatureDeltaC.toFixed(1)} °C (from ${calorimetry.initialTemperatureC.toFixed(1)} °C to ${calorimetry.finalTemperatureC.toFixed(1)} °C).`
            : `No significant temperature change (${calorimetry.initialTemperatureC.toFixed(1)} °C).`;

        const cleanDesc = effect.description.replace(/^Temperature (?:decreased|increased)[^.]*\.\s*/, "");
        return {
          ...effect,
          type: isDecrease ? ("temperature_decrease" as const) : ("temperature_increase" as const),
          temperatureDeltaC: calorimetry.temperatureDeltaC,
          initialTemperatureC: calorimetry.initialTemperatureC,
          finalTemperatureC: calorimetry.finalTemperatureC,
          description: `${changeLabel} ${cleanDesc}`,
        };
      }
      return effect;
    });

    if (!hasTempEffect && Math.abs(calorimetry.temperatureDeltaC) >= 0.1) {
      const isDecrease = calorimetry.temperatureDeltaC < 0;
      augmentedEffects.push({
        type: isDecrease ? ("temperature_decrease" as const) : ("temperature_increase" as const),
        temperatureDeltaC: calorimetry.temperatureDeltaC,
        initialTemperatureC: calorimetry.initialTemperatureC,
        finalTemperatureC: calorimetry.finalTemperatureC,
        description: calorimetry.summaryText,
      });
    }

    const updated: ReactionResolution = {
      ...resolution,
      observableEffects: augmentedEffects,
      calorimetry,
    };

    if (!updated.processBreakdown || calorimetry) {
      updated.processBreakdown = generateProcessBreakdown(updated);
    }

    return updated;
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

    return this.computeStoichiometryForResolution(resolution, inputs, conditions);
  }

  /**
   * Helper to build a full SimulationResult from a curated database record in SQLite dev.db.
   * Handles reaction resolution, stoichiometric scaling, and calorimetry adjustments for amounts.
   */
  private buildResolutionFromDbRow(
    matchedRow: any,
    inputs: ReactionInputSpecies[],
    conditions: ReactionConditions = {}
  ): SimulationResult {
    const cond = (matchedRow.conditions as any) || {};
    const obs = (matchedRow.observations as any[]) || [];
    const reactants = (matchedRow.reactants as any[]) || [];
    const products = (matchedRow.products as any[]) || [];

    const rawEnthalpy = cond.enthalpyKjPerMol;
    let energyClass = cond.energyClassification;
    if (!energyClass) {
      if (rawEnthalpy !== undefined && rawEnthalpy < 0) energyClass = "exothermic";
      else if (rawEnthalpy !== undefined && rawEnthalpy > 0) energyClass = "endothermic";
      else energyClass = "exothermic";
    }
    const enthalpyKjPerMol =
      rawEnthalpy !== undefined && rawEnthalpy !== null
        ? rawEnthalpy
        : energyClass === "exothermic"
          ? -65.0
          : energyClass === "endothermic"
            ? 35.0
            : undefined;

    const enrichedObs = [...obs];
    const hasTemp = enrichedObs.some(
      (e: any) => e.type === "temperature_increase" || e.type === "temperature_decrease"
    );
    if (!hasTemp) {
      if (energyClass === "exothermic" || (enthalpyKjPerMol !== undefined && enthalpyKjPerMol < 0)) {
        enrichedObs.push({
          type: "temperature_increase",
          description: `Exothermic reaction releasing heat (ΔH = ${enthalpyKjPerMol ?? -65.0} kJ/mol); final temperature rise scales directly with the quantity and concentration of reactants.`,
        });
      } else if (energyClass === "endothermic" || (enthalpyKjPerMol !== undefined && enthalpyKjPerMol > 0)) {
        enrichedObs.push({
          type: "temperature_decrease",
          description: `Endothermic reaction absorbing heat (ΔH = +${enthalpyKjPerMol ?? 35.0} kJ/mol); final temperature drop scales directly with the quantity of reactants dissolved or reacted.`,
        });
      }
    }

    let resolution: ReactionResolution = {
      status: "REACTION",
      confidenceTier: "SUPPORTED",
      confidenceScore: matchedRow.confidenceScore ?? 1.0,
      reactionType: matchedRow.reactionType as any,
      balancedEquation: matchedRow.equation,
      netIonicEquation: matchedRow.netIonicEquation ?? undefined,
      reactants: reactants.map((r: any) => {
        const chem = this.chemicalRepo.getById(r.chemicalId) || this.chemicalRepo.getByFormula(r.chemicalId);
        return {
          chemicalId: r.chemicalId,
          formula: chem?.formula || r.formula || r.chemicalId,
          commonName: chem?.commonName || r.commonName || r.chemicalId,
          coefficient: r.coefficient || 1,
          isRegistered: true,
          substanceColor: chem?.substanceColor,
        };
      }),
      products: products.map((p: any) => {
        const chem = this.chemicalRepo.getById(p.chemicalId) || this.chemicalRepo.getByFormula(p.chemicalId);
        return {
          chemicalId: p.chemicalId,
          formula: chem?.formula || p.formula || p.chemicalId,
          commonName: chem?.commonName || p.commonName || p.chemicalId,
          coefficient: p.coefficient || 1,
          isByproduct: !!p.isByproduct,
          isRegistered: true,
          substanceColor: chem?.substanceColor,
        };
      }),
      observableEffects: enrichedObs as ObservableEffect[],
      energyClassification: energyClass,
      enthalpyKjPerMol,
      explanation: `Curated reaction from verified chemical database: ${matchedRow.name || matchedRow.equation}.`,
      ruleApplied: "curated_database",
      safetyNotes: (matchedRow.hazards as any)?.safetyNotes,
      warnings: [],
      isAiPredicted: false,
    };

    const { stoichiometry, calorimetry } = this.computeStoichiometryForResolution(
      resolution,
      inputs,
      conditions
    );
    const augmentedResolution = this.augmentResolutionWithCalorimetry(resolution, calorimetry);

    return {
      resolution: augmentedResolution,
      stoichiometry,
      calorimetry,
    };
  }

  /**
   * Helper to check local curated databases (both chemlab.db and dev.db) for the given input species.
   */
  private async findInDatabase(
    inputs: ReactionInputSpecies[],
    conditions: ReactionConditions = {}
  ): Promise<SimulationResult | null> {
    // 1. Check local chemlab.db and deterministic rule engine
    try {
      const localResult = this.simulate(inputs, conditions);
      if (localResult.resolution.status !== "UNSUPPORTED") {
        return localResult;
      }
    } catch {
      // Continue to prisma dev.db lookup
    }

    // 2. Check prisma dev.db curated reactions
    try {
      const candidateKeys = new Set<string>();

      // A. Chemical IDs sorted
      const rawIds = inputs.map((i) => i.chemicalId.toLowerCase().replace(/[^a-z0-9]/g, "_")).sort();
      candidateKeys.add(rawIds.join("+"));
      candidateKeys.add(rawIds.map((id) => id.replace(/_/g, "-")).join("+"));

      // B. Resolved chemical repository IDs (canonical)
      const resolvedIds = inputs.map((i) => {
        const chem = this.chemicalRepo.getById(i.chemicalId) || this.chemicalRepo.getByFormula(i.chemicalId);
        return (chem?.id || i.chemicalId).toLowerCase().replace(/[^a-z0-9]/g, "_");
      }).sort();
      candidateKeys.add(resolvedIds.join("+"));
      candidateKeys.add(resolvedIds.map((id) => id.replace(/_/g, "-")).join("+"));

      // C. Formulas
      const formulas = inputs
        .map((i) => {
          const chem = this.chemicalRepo.getById(i.chemicalId);
          return (chem?.formula || i.formula || i.chemicalId).toLowerCase().replace(/[^a-z0-9]/g, "_");
        })
        .sort();
      candidateKeys.add(formulas.join("+"));
      candidateKeys.add(formulas.map((f) => f.replace(/_/g, "-")).join("+"));

      // D. Common names
      const commonNames = inputs
        .map((i) => {
          const chem = this.chemicalRepo.getById(i.chemicalId);
          return (chem?.commonName || i.chemicalId).toLowerCase().replace(/[^a-z0-9]/g, "_");
        })
        .sort();
      candidateKeys.add(commonNames.join("+"));
      candidateKeys.add(commonNames.map((c) => c.replace(/_/g, "-")).join("+"));

      for (const k of candidateKeys) {
        const matched = await prisma.reaction.findUnique({ where: { reactantKey: k } }).catch(() => null);
        if (matched) {
          return this.buildResolutionFromDbRow(matched, inputs, conditions);
        }
      }
    } catch {
      // Prisma error fallback
    }

    return null;
  }

  /**
   * 3-tier reaction resolution pipeline following strict priority:
   * 1. Priority 1 (Local Database): If reactant is present in local database (chemlab.db or dev.db),
   *    show final output directly because local database data is verified and accurate.
   * 2. Priority 2 (Local ML Model - ReactionT5v2): If not in database, local ML model predicts output.
   *    - If ML output is available: Integrated API rechecks reactions and adds additional literature/internet data.
   *      If API is unable to recheck/respond, the predicted output by the ML model is treated as final output and displayed.
   * 3. Priority 3 (Integrated API Fallback): If ML model is unable to predict, send input to Integrated API
   *    to generate output from scratch, treating API output as final output to display on webpage.
   */
  async simulateWithAi(
    inputs: ReactionInputSpecies[],
    conditions: ReactionConditions = {},
    options?: PredictReactionOptions
  ): Promise<SimulationResult> {
    // 1. Priority 1: Check Local Verified Database (Direct output, verified & accurate)
    const dbResult = await this.findInDatabase(inputs, conditions);
    if (dbResult && dbResult.resolution.status !== "UNSUPPORTED") {
      logger.info("Priority 1: Reaction resolved directly via curated database", {
        reactants: inputs.map((i) => i.chemicalId),
        status: dbResult.resolution.status,
        equation: dbResult.resolution.balancedEquation,
      });
      return dbResult;
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

    // 2. Priority 2: Query Local Neural ML Model (ReactionT5v2)
    let mlPredictionResult: SimulationResult | null = null;
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
          logger.info("Priority 2: Valid prediction obtained from Local ML Model (ReactionT5v2)", {
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

          // Recheck with Integrated API to verify and add additional internet/literature details (if needed)
          let finalResolution = mlResolution;
          try {
            const enrichedResolution = await aiReactionPredictor.recheckAndEnrich(
              mlResolution,
              conditions,
              options
            );
            if (enrichedResolution && enrichedResolution.status === "REACTION") {
              finalResolution = enrichedResolution;
              logger.info("Integrated API successfully rechecked reaction and added literature data", {
                equation: finalResolution.balancedEquation,
              });
            }
          } catch (apiErr: any) {
            logger.info("Integrated API unable to recheck/enrich (using ML model predicted output directly as final output)", {
              error: apiErr.message,
            });
            // Fallback to pure ML predicted output as final output
          }

          const stoichResult = this.computeStoichiometryForResolution(
            finalResolution,
            inputs,
            conditions
          );

          mlPredictionResult = {
            resolution: stoichResult.resolution,
            stoichiometry: stoichResult.stoichiometry,
            calorimetry: stoichResult.calorimetry,
            mlPrediction: {
              modelName: mlRes.modelName,
              rawOutput: mlRes.rawOutput,
              cleanedOutput: mlRes.cleanedOutput,
              predictedEquation: mlRes.predictedEquation,
              predictedProducts: mlRes.predictedProducts,
              productAnalyses: mlRes.productAnalyses,
              reactionType: mlRes.reactionType,
              atomEconomyPercent: mlRes.atomEconomyPercent,
              expectedByproducts: mlRes.expectedByproducts,
              mechanismNotes: mlRes.mechanismNotes,
              latencyMs: mlRes.latencyMs,
              trainingDataset: mlRes.trainingDataset,
              device: mlRes.device,
              beamsUsed: mlRes.beamsUsed,
            },
          };
        } else {
          logger.info("ML model prediction rejected by chemical audit, falling back to Integrated API", {
            input: mlInput,
            reason: audit.failureReason,
          });
        }
      }
    } catch (err: any) {
      logger.info("Local ML model skipped or failed, falling back to Integrated API", { error: err.message });
    }

    if (mlPredictionResult) {
      return mlPredictionResult;
    }

    // 3. Priority 3: ML model unable to predict -> Send input to Integrated API to generate output
    if (process.env.NODE_ENV === "test" && !options?.apiKey) {
      return this.simulate(inputs, conditions);
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
        return { resolution: aiResolution };
      }

      // Validate Integrated API prediction with chemical balancer and audit
      const audit = auditReactionChemistry(aiResolution.reactants, aiResolution.products);
      if (audit.passed) {
        if (audit.balancedEquation) aiResolution.balancedEquation = audit.balancedEquation;
        if (audit.balancedReactants) aiResolution.reactants = audit.balancedReactants;
        if (audit.balancedProducts) aiResolution.products = audit.balancedProducts;
      }

      const stoichResult = this.computeStoichiometryForResolution(
        aiResolution,
        inputs,
        conditions
      );

      return {
        resolution: stoichResult.resolution,
        stoichiometry: stoichResult.stoichiometry,
        calorimetry: stoichResult.calorimetry,
      };
    } catch (err: any) {
      logger.info("Integrated API reaction prediction failed or unavailable", { error: err.message });
      const localFallback = this.simulate(inputs, conditions);
      if (err.message && err.message.includes("NO_API_KEY")) {
        localFallback.resolution.warnings = [
          ...(localFallback.resolution.warnings ?? []),
          "This reaction is not in our verified database and could not be predicted by the ML model. Set an AI API key in Settings to generate products dynamically.",
        ];
      }
      return localFallback;
    }
  }


  private parseOrBuildInputsForPredict(
    query: string,
    reactants: { chemicalId: string; coefficient?: number }[]
  ): ReactionInputSpecies[] {
    const amountRegex = /(\d+(?:\.\d+)?)\s*(g|mg|kg|ml|l|mol|mmol)\s+([a-zA-Z0-9_\-\+]+)/gi;
    const molarityRegex = /(\d+(?:\.\d+)?)\s*M\s+([a-zA-Z0-9_\-\+]+)/gi;
    const parsedAmounts = new Map<string, { amount: number; unit: string; concentrationMolar?: number }>();

    // Split by + or comma into reagent segments
    const segments = query.split(/\s*[\+,]\s*|\s+\.\s+/).map((s) => s.trim()).filter(Boolean);
    for (const segment of segments) {
      // 1. Volume + optional molarity + chemical name (e.g. "25ml 2M sodium hydroxide", "50 mL water")
      const mVolConc = segment.match(/(\d+(?:\.\d+)?)\s*(ml|l)\s*(?:of\s+)?(?:(\d+(?:\.\d+)?)\s*m\s+)?(.*)/i);
      if (mVolConc && mVolConc[1] && mVolConc[2] && mVolConc[4]) {
        const amt = parseFloat(mVolConc[1]);
        const u = mVolConc[2].toLowerCase() === "ml" ? "mL" : "L";
        const conc = mVolConc[3] ? parseFloat(mVolConc[3]) : undefined;
        const rawChem = mVolConc[4].trim().toLowerCase();
        if (rawChem) {
          parsedAmounts.set(rawChem, { amount: amt, unit: u, concentrationMolar: conc });
          parsedAmounts.set(rawChem.replace(/[^a-z0-9]/g, "_"), { amount: amt, unit: u, concentrationMolar: conc });
        }
        continue;
      }

      // 2. Mass / moles + chemical name (e.g. "15g urea", "2 mol zinc")
      const mMass = segment.match(/(\d+(?:\.\d+)?)\s*(g|mg|kg|mol|mmol)\s+(.*)/i);
      if (mMass && mMass[1] && mMass[2] && mMass[3]) {
        const amt = parseFloat(mMass[1]);
        const u = mMass[2].toLowerCase();
        const rawChem = mMass[3].trim().toLowerCase();
        if (rawChem) {
          parsedAmounts.set(rawChem, { amount: amt, unit: u });
          parsedAmounts.set(rawChem.replace(/[^a-z0-9]/g, "_"), { amount: amt, unit: u });
        }
        continue;
      }

      // 3. Standalone molarity + chemical name (e.g. "2M HCl")
      const mMolar = segment.match(/(\d+(?:\.\d+)?)\s*m\s+(.*)/i);
      if (mMolar && mMolar[1] && mMolar[2]) {
        const conc = parseFloat(mMolar[1]);
        const rawChem = mMolar[2].trim().toLowerCase();
        if (rawChem) {
          parsedAmounts.set(rawChem, { amount: 25, unit: "mL", concentrationMolar: conc });
          parsedAmounts.set(rawChem.replace(/[^a-z0-9]/g, "_"), { amount: 25, unit: "mL", concentrationMolar: conc });
        }
      }
    }

    if (reactants.length === 0) {
      const tokens = query
        .replace(/\b\d+(?:\.\d+)?\s*(g|mg|kg|ml|l|mol|mmol|M)\b/gi, "")
        .split(/\s*[\+,]\s*|\s+\.\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const result: ReactionInputSpecies[] = [];
      for (const tok of tokens) {
        const cleanTok = tok.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const chem =
          this.chemicalRepo.getById(cleanTok) ||
          this.chemicalRepo.getByFormula(tok) ||
          this.chemicalRepo.getById(tok);
        const chemId = chem ? chem.id : cleanTok;
        const parsed =
          parsedAmounts.get(chemId.toLowerCase()) ||
          (chem && parsedAmounts.get(chem.formula.toLowerCase())) ||
          (chem && parsedAmounts.get(chem.commonName.toLowerCase())) ||
          parsedAmounts.get(cleanTok) ||
          parsedAmounts.get(tok.toLowerCase());

        if (parsed) {
          const isLiquid = (parsed.unit === "mL" || parsed.unit === "L") && chemId !== "water" && chemId !== "h2o";
          result.push({
            chemicalId: chemId,
            formula: chem?.formula,
            amount: parsed.amount,
            unit: parsed.unit as any,
            concentrationMolar: parsed.concentrationMolar ?? (isLiquid ? 1.0 : undefined),
          });
        } else {
          const isWater = chemId === "water" || chemId === "h2o" || chem?.formula?.toUpperCase() === "H2O";
          if (isWater) {
            result.push({
              chemicalId: chemId,
              formula: "H2O",
              amount: 50,
              unit: "mL" as any,
            });
          } else {
            const isSolid = chem?.physicalState === "solid";
            const isGas = chem?.physicalState === "gas";
            result.push({
              chemicalId: chemId,
              formula: chem?.formula,
              amount: isSolid ? 10 : isGas ? 1 : 25,
              unit: (isSolid ? "g" : isGas ? "mol" : "mL") as any,
              concentrationMolar: !isSolid && !isGas ? 1.0 : undefined,
            });
          }
        }
      }
      return result;
    }

    return reactants.map((r) => {
      const key = r.chemicalId.toLowerCase();
      const chem = this.chemicalRepo.getById(r.chemicalId) || this.chemicalRepo.getByFormula(r.chemicalId);
      const parsed =
        parsedAmounts.get(key) ||
        (chem && parsedAmounts.get(chem.formula.toLowerCase())) ||
        (chem && parsedAmounts.get(chem.commonName.toLowerCase())) ||
        (chem && parsedAmounts.get(chem.commonName.toLowerCase().replace(/[^a-z0-9]/g, "")));

      if (parsed) {
        const isLiquid = (parsed.unit === "mL" || parsed.unit === "L") && r.chemicalId !== "water" && r.chemicalId !== "h2o";
        return {
          chemicalId: r.chemicalId,
          formula: chem?.formula,
          amount: parsed.amount,
          unit: parsed.unit as any,
          concentrationMolar: parsed.concentrationMolar ?? (isLiquid ? 1.0 : undefined),
        };
      }

      const coeff = r.coefficient || 1;
      if (r.chemicalId === "water" || r.chemicalId === "h2o") {
        return { chemicalId: r.chemicalId, formula: "H2O", amount: 50, unit: "mL" };
      }
      if (chem?.physicalState === "solid") {
        return { chemicalId: r.chemicalId, formula: chem.formula, amount: 10 * coeff, unit: "g" };
      }
      if (chem?.physicalState === "gas") {
        return { chemicalId: r.chemicalId, formula: chem.formula, amount: 1 * coeff, unit: "mol" };
      }
      return {
        chemicalId: r.chemicalId,
        formula: chem?.formula,
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

    // 1. Priority 1: Check Local Verified Database (Direct output, verified & accurate)
    const parsedInputs = this.parseOrBuildInputsForPredict(clean, []);
    if (parsedInputs.length >= 1) {
      const dbResult = await this.findInDatabase(parsedInputs, conditions);
      if (dbResult && dbResult.resolution.status !== "UNSUPPORTED") {
        return {
          simulationResult: dbResult,
          source: "curated_database",
        };
      }
    }

    // Fallback: Search dev.db by name, id, or equation (e.g. named reactions or "A + B -> C")
    const hasArrow = clean.includes("->") || clean.includes("→");
    const searchTarget = cleanWithoutAmounts || clean;
    const matchedRow = await prisma.reaction.findFirst({
      where: {
        OR: [
          { name: { contains: searchTarget } },
          { id: { contains: searchTarget.toLowerCase() } },
          ...(hasArrow ? [{ equation: { contains: clean } }] : []),
        ],
      },
    }).catch(() => null);

    if (matchedRow) {
      const reactants = (matchedRow.reactants as any[]) || [];
      const inputs = this.parseOrBuildInputsForPredict(clean, reactants);
      const simRes = this.buildResolutionFromDbRow(matchedRow, inputs, conditions);
      return {
        simulationResult: simRes,
        source: "curated_database",
      };
    }

    // 2. Priority 2: Not in database -> Try Local Neural ML Model (ReactionT5v2)
    let mlSimResult: SimulationResult | null = null;
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
          logger.info("Priority 2: Valid prediction obtained from Local ML Model in predictAny", {
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

          // Recheck with Integrated API to verify and add additional internet/literature details (if needed)
          let finalResolution = mlResolution;
          try {
            const enrichedResolution = await aiReactionPredictor.recheckAndEnrich(
              mlResolution,
              conditions,
              options
            );
            if (enrichedResolution && enrichedResolution.status === "REACTION") {
              finalResolution = enrichedResolution;
              logger.info("Integrated API successfully rechecked reaction in predictAny", {
                equation: finalResolution.balancedEquation,
              });
            }
          } catch (apiErr: any) {
            logger.info("Integrated API unable to recheck in predictAny (using ML model predicted output directly as final output)", {
              error: apiErr.message,
            });
            // Fallback to pure ML predicted output as final output
          }

          const actualInputs = this.parseOrBuildInputsForPredict(
            clean,
            finalResolution.reactants
          );

          const stoichResult = this.computeStoichiometryForResolution(
            finalResolution,
            actualInputs,
            conditions
          );

          mlSimResult = {
            resolution: stoichResult.resolution,
            stoichiometry: stoichResult.stoichiometry,
            calorimetry: stoichResult.calorimetry,
            mlPrediction: {
              modelName: mlRes.modelName,
              rawOutput: mlRes.rawOutput,
              cleanedOutput: mlRes.cleanedOutput,
              predictedEquation: mlRes.predictedEquation,
              predictedProducts: mlRes.predictedProducts,
              productAnalyses: mlRes.productAnalyses,
              reactionType: mlRes.reactionType,
              atomEconomyPercent: mlRes.atomEconomyPercent,
              expectedByproducts: mlRes.expectedByproducts,
              mechanismNotes: mlRes.mechanismNotes,
              latencyMs: mlRes.latencyMs,
              trainingDataset: mlRes.trainingDataset,
              device: mlRes.device,
              beamsUsed: mlRes.beamsUsed,
            },
          };
        } else {
          logger.info("Local ML model prediction rejected by chemical audit in predictAny, falling back to Integrated API", {
            input: mlInput,
            reason: audit.failureReason,
            products: mlRes?.predictedProducts,
          });
        }
      } catch (err: any) {
        logger.debug("Local ML model skipped in predictAny, falling back to Integrated API", { error: err.message });
      }

    if (mlSimResult) {
      return {
        simulationResult: mlSimResult,
        source: "ai_predicted",
      };
    }

    // 3. Priority 3: ML model unable to predict -> Send input to Integrated API to generate output
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

    // Validate Integrated API prediction with chemical balancer and audit
    const audit = auditReactionChemistry(resolution.reactants, resolution.products);
    if (audit.passed) {
      if (audit.balancedEquation) resolution.balancedEquation = audit.balancedEquation;
      if (audit.balancedReactants) resolution.reactants = audit.balancedReactants;
      if (audit.balancedProducts) resolution.products = audit.balancedProducts;
    }

    const actualInputs = this.parseOrBuildInputsForPredict(
      clean,
      resolution.reactants
    );

    const stoichResult = this.computeStoichiometryForResolution(
      resolution,
      actualInputs,
      conditions
    );

    return {
      simulationResult: {
        resolution: stoichResult.resolution,
        stoichiometry: stoichResult.stoichiometry,
        calorimetry: stoichResult.calorimetry,
      },
      source: "ai_predicted",
    };
  }
}
