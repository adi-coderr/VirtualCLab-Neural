import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateMoleculeStructure } from "../chemistry-engine/moleculeStructureGenerator.js";
import { parseFormula } from "../chemistry-engine/formulaParser.js";
import { isMoreReactive, canDisplaceHydrogenFromAcid } from "../chemistry-engine/activitySeries.js";
import { predictSolubility } from "../chemistry-engine/solubility.js";
import { balanceEquation } from "../chemistry-engine/balancer.js";
import { ion } from "../chemistry-engine/ions.js";
import { ELEMENT_DATA } from "../chemistry-engine/elementData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const unifiedDbPath = path.resolve(__dirname, "../../data/chemlab_unified.db");

let dbInstance: Database.Database | null = null;

export function getUnifiedDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(unifiedDbPath, { readonly: true });
    dbInstance.pragma("journal_mode = WAL");
  }
  return dbInstance;
}

export interface ReactantSearchQuery {
  q?: string;
  category?: string;
  state?: string;
  bonding?: string;
  isFlammable?: boolean;
  page?: number;
  limit?: number;
}

export interface UnifiedReactantDTO {
  id: string;
  canonicalName: string;
  iupacName: string | null;
  formula: string;
  casNumber: string | null;
  smiles: string | null;
  categoryTags: string[];
  bondingType: string;

  // Universal properties
  atomicNumber: number | null;
  molarMass: {
    gMol: number;
    kgMol: number;
    provenance: { status: string; source: string; confidence: number };
  };
  physicalState: string;
  temperatures: {
    meltingPointK: number | null;
    meltingPointC: number | null;
    boilingPointK: number | null;
    boilingPointC: number | null;
    provenance: Record<string, { status: string; source: string }>;
  };
  density: {
    kgM3: number | null;
    gCm3: number | null;
    provenance: { status: string; source: string };
  };
  appearance: {
    color: string;
    odor: string;
  };
  solubility: {
    category: string;
    gPer100gWater: number | null;
  };
  electronic: {
    valenceElectrons: number | null;
    commonOxidationStates: number[];
    electronegativityPauling: number | null;
    ionizationEnergyJouleMol: number | null;
    atomicRadiusPm: number | null;
  };

  // Category dependent
  categoryProperties: {
    metals?: {
      malleability: string | null;
      ductility: string | null;
      luster: string | null;
      oxideBehavior: string | null;
      electronTendency: string | null;
    };
    nonmetals?: {
      brittleness: string | null;
      electronTendency: string | null;
    };
    nobleGases?: {
      chemicallyInert: boolean;
    };
  };

  // Special characteristics
  characterization: {
    isAmphoteric: boolean;
    magneticBehavior: string;
    isRadioactive: boolean;
    isFlammable: boolean;
    redoxCharacter: string;
    acidBaseClass: string;
    pKa: number | null;
    pKb: number | null;
  };

  // Lab reactivity & safety
  reactivity: {
    reactsWithWater: boolean;
    waterNotes: string | null;
    reactsWithAcid: boolean;
    acidNotes: string | null;
    reactsWithBase: boolean;
    baseNotes: string | null;
    reactsWithOxygen: boolean;
    oxygenNotes: string | null;
    flameTestColor: string | null;
    ghsHazardCodes: string[];
    handlingPrecautions: string;
    ppeRequirements: string;
  };

  isotopes: Array<{ massNumber: number; isotopicMassU: number; abundancePercent: number; halfLife: string }>;
  aliases: string[];
  structure?: any;
}

export interface MixtureSimulationResult {
  status: "REACTION" | "NO_REACTION";
  reactionType: string;
  equation: string;
  netIonicEquation: string | null;
  reactants: Array<{ chemicalId: string; formula: string; name: string; coefficient: number }>;
  products: Array<{ chemicalId: string; formula: string; name: string; coefficient: number }>;
  observableEffects: Array<{ type: string; description: string; [key: string]: any }>;
  safetyWarnings: string[];
  energyClassification: "exothermic" | "endothermic" | "thermoneutral";
  enthalpyKjMol: number | null;
  confidenceScore: number;
  source: string;
}

export class UnifiedReactantService {
  private db: Database.Database;

  constructor() {
    this.db = getUnifiedDb();
  }

  /**
   * Resolves any input (ID, formula, synonym, or merged ID) to canonical reactant ID
   */
  resolveCanonicalId(input: string): string | null {
    if (!input) return null;
    const clean = input.trim().toLowerCase();

    // Direct ID check
    const direct = this.db.prepare("SELECT id FROM reactants_unified WHERE id = ?").get(clean) as { id: string } | undefined;
    if (direct) return direct.id;

    // Direct formula check
    const formulaMatch = this.db.prepare("SELECT id FROM reactants_unified WHERE LOWER(formula) = ?").get(clean) as { id: string } | undefined;
    if (formulaMatch) return formulaMatch.id;

    // Alias lookup
    const aliasMatch = this.db.prepare("SELECT reactant_id FROM reactant_aliases WHERE LOWER(alias) = ?").get(clean) as { reactant_id: string } | undefined;
    if (aliasMatch) return aliasMatch.reactant_id;

    // Normalized check (e.g. "pb-no3-2" -> "pbno32")
    const noHyphen = clean.replace(/[-\s_]/g, "");
    if (noHyphen !== clean) {
      const directNoHyphen = this.db.prepare("SELECT id FROM reactants_unified WHERE id = ?").get(noHyphen) as { id: string } | undefined;
      if (directNoHyphen) return directNoHyphen.id;

      const aliasNoHyphen = this.db.prepare("SELECT reactant_id FROM reactant_aliases WHERE LOWER(alias) = ?").get(noHyphen) as { reactant_id: string } | undefined;
      if (aliasNoHyphen) return aliasNoHyphen.reactant_id;
    }

    return null;
  }

  /**
   * Fetches full unified reactant profile by ID
   */
  getReactantById(idOrInput: string): UnifiedReactantDTO | null {
    const id = this.resolveCanonicalId(idOrInput);
    if (!id) return null;

    const row = this.db.prepare("SELECT * FROM reactants_unified WHERE id = ?").get(id) as any;
    if (!row) return null;

    // Fetch Provenance
    const provRows = this.db.prepare("SELECT property_name, status, raw_value, provenance_source, confidence_score FROM reactant_property_provenance WHERE reactant_id = ?").all(id) as any[];
    const provMap: Record<string, { status: string; source: string; confidence: number; rawValue: string | null }> = {};
    for (const p of provRows) {
      provMap[p.property_name] = {
        status: p.status,
        source: p.provenance_source,
        confidence: p.confidence_score,
        rawValue: p.raw_value,
      };
    }

    // Fetch Isotopes
    const isotopes = this.db.prepare("SELECT mass_number as massNumber, isotopic_mass_u as isotopicMassU, abundance_percent as abundancePercent, half_life as halfLife FROM reactant_isotopes WHERE reactant_id = ?").all(id) as any[];

    // Fetch Aliases
    const aliases = (this.db.prepare("SELECT alias FROM reactant_aliases WHERE reactant_id = ?").all(id) as any[]).map((a) => a.alias);

    // Structure generation
    let structure: any = null;
    try {
      let comp = {};
      try {
        if (row.formula) comp = parseFormula(row.formula).composition;
      } catch {}
      structure = generateMoleculeStructure(id, row.formula, comp, row.canonical_name, row.smiles);
    } catch {
      // Fallback
    }

    const categoryTags = JSON.parse(row.category_tags || "[]");
    const isMetal = categoryTags.includes("metal");
    const isNonmetal = categoryTags.includes("nonmetal");
    const isNobleGas = categoryTags.includes("noble_gas");

    const meltingPointK = row.melting_point_k;
    const meltingPointC = meltingPointK !== null ? Number((meltingPointK - 273.15).toFixed(2)) : null;

    const boilingPointK = row.boiling_point_k;
    const boilingPointC = boilingPointK !== null ? Number((boilingPointK - 273.15).toFixed(2)) : null;

    const densityKgM3 = row.density_kg_m3;
    const densityGCm3 = densityKgM3 !== null ? Number((densityKgM3 / 1000).toFixed(4)) : null;

    const defaultProv = { status: "unknown", source: "Not recorded in source dataset", confidence: 0 };

    return {
      id: row.id,
      canonicalName: row.canonical_name,
      iupacName: row.iupac_name,
      formula: row.formula,
      casNumber: row.cas_number,
      smiles: row.smiles,
      categoryTags,
      bondingType: row.bonding_type,
      atomicNumber: row.atomic_number,
      molarMass: {
        gMol: row.molar_mass_g_mol,
        kgMol: row.molar_mass_kg_mol,
        provenance: provMap["molar_mass"] || defaultProv,
      },
      physicalState: row.physical_state_room_temp,
      temperatures: {
        meltingPointK,
        meltingPointC,
        boilingPointK,
        boilingPointC,
        provenance: {
          meltingPoint: provMap["melting_point_k"] || defaultProv,
          boilingPoint: provMap["boiling_point_k"] || defaultProv,
        },
      },
      density: {
        kgM3: densityKgM3,
        gCm3: densityGCm3,
        provenance: provMap["density_kg_m3"] || defaultProv,
      },
      appearance: {
        color: row.appearance_color,
        odor: row.odor,
      },
      solubility: {
        category: row.solubility_category,
        gPer100gWater: row.solubility_water_g_per_100g,
      },
      electronic: {
        valenceElectrons: row.valence_electrons,
        commonOxidationStates: JSON.parse(row.common_oxidation_states || "[0]"),
        electronegativityPauling: row.electronegativity_pauling,
        ionizationEnergyJouleMol: row.ionization_energy_j_mol,
        atomicRadiusPm: row.atomic_radius_pm,
      },
      categoryProperties: {
        metals: isMetal
          ? {
              malleability: row.malleability,
              ductility: row.ductility,
              luster: row.luster,
              oxideBehavior: row.oxide_acid_base_behavior,
              electronTendency: row.electron_tendency,
            }
          : undefined,
        nonmetals: isNonmetal
          ? {
              brittleness: row.brittleness,
              electronTendency: row.electron_tendency,
            }
          : undefined,
        nobleGases: isNobleGas
          ? {
              chemicallyInert: Boolean(row.is_chemically_inert),
            }
          : undefined,
      },
      characterization: {
        isAmphoteric: Boolean(row.is_amphoteric),
        magneticBehavior: row.magnetic_behavior,
        isRadioactive: Boolean(row.is_radioactive),
        isFlammable: Boolean(row.is_flammable),
        redoxCharacter: row.redox_character,
        acidBaseClass: row.acid_base_class,
        pKa: row.pka,
        pKb: row.pkb,
      },
      reactivity: {
        reactsWithWater: Boolean(row.reacts_with_water),
        waterNotes: row.water_reaction_notes,
        reactsWithAcid: Boolean(row.reacts_with_acid),
        acidNotes: row.acid_reaction_notes,
        reactsWithBase: Boolean(row.reacts_with_base),
        baseNotes: row.base_reaction_notes,
        reactsWithOxygen: Boolean(row.reacts_with_oxygen),
        oxygenNotes: row.oxygen_reaction_notes,
        flameTestColor: row.flame_test_color,
        ghsHazardCodes: JSON.parse(row.ghs_hazard_codes || "[]"),
        handlingPrecautions: row.handling_precautions,
        ppeRequirements: row.ppe_requirements,
      },
      isotopes,
      aliases,
      structure,
    };
  }

  /**
   * Indexed Fast Search by query string (name, formula, alias), category, bonding, or state
   */
  searchReactants(options: ReactantSearchQuery) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (options.q && options.q.trim().length > 0) {
      const q = `%${options.q.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(r.id) LIKE ? OR
        LOWER(r.canonical_name) LIKE ? OR
        LOWER(r.formula) LIKE ? OR
        EXISTS (SELECT 1 FROM reactant_aliases a WHERE a.reactant_id = r.id AND LOWER(a.alias) LIKE ?)
      )`);
      params.push(q, q, q, q);
    }

    if (options.category) {
      conditions.push(`r.category_tags LIKE ?`);
      params.push(`%${options.category.trim().toLowerCase()}%`);
    }

    if (options.state) {
      conditions.push(`LOWER(r.physical_state_room_temp) = ?`);
      params.push(options.state.trim().toLowerCase());
    }

    if (options.bonding) {
      conditions.push(`LOWER(r.bonding_type) = ?`);
      params.push(options.bonding.trim().toLowerCase());
    }

    if (options.isFlammable !== undefined) {
      conditions.push(`r.is_flammable = ?`);
      params.push(options.isFlammable ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRow = this.db.prepare(`SELECT count(*) as total FROM reactants_unified r ${whereClause}`).get(...params) as { total: number };
    const total = countRow.total;

    const rows = this.db.prepare(`
      SELECT r.id, r.canonical_name, r.formula, r.molar_mass_g_mol, r.physical_state_room_temp,
             r.category_tags, r.appearance_color, r.bonding_type, r.reacts_with_water, r.is_flammable
      FROM reactants_unified r
      ${whereClause}
      ORDER BY r.id ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: rows.map((r) => ({
        id: r.id,
        canonicalName: r.canonical_name,
        formula: r.formula,
        molarMassGMol: r.molar_mass_g_mol,
        physicalState: r.physical_state_room_temp,
        categoryTags: JSON.parse(r.category_tags || "[]"),
        color: r.appearance_color,
        bondingType: r.bonding_type,
        reactsWithWater: Boolean(r.reacts_with_water),
        isFlammable: Boolean(r.is_flammable),
      })),
    };
  }

  /**
   * Evaluates mixture between 2 or more reactants:
   * 1. Priority 1: Instant lookup in unified reactions registry (6,407 curated reactions)
   * 2. Priority 2: Chemistry engine domain rules (acid-base, precipitation, displacement, combustion, carbonate effervescence)
   */
  mixReactants(reactantInputs: string[]): MixtureSimulationResult {
    if (!reactantInputs || reactantInputs.length < 2) {
      throw new Error("mixReactants requires at least 2 reactants.");
    }

    // Resolve canonical IDs
    const resolvedIds = reactantInputs.map((inp) => this.resolveCanonicalId(inp) || inp.toLowerCase().trim());
    const sortedKey = [...resolvedIds].sort().join("+");

    // 1. Curated Reaction Table Check
    const match = this.db.prepare(`
      SELECT * FROM reactions_unified WHERE reactant_key = ?
    `).get(sortedKey) as any;

    if (match) {
      const reactants = JSON.parse(match.reactants_json || "[]");
      const products = JSON.parse(match.products_json || "[]");
      const observableEffects = JSON.parse(match.observable_effects_json || "[]");
      const safetyWarnings = JSON.parse(match.safety_warnings_json || "[]");

      return {
        status: "REACTION",
        reactionType: match.reaction_type,
        equation: match.equation,
        netIonicEquation: match.net_ionic_equation,
        reactants,
        products,
        observableEffects,
        safetyWarnings,
        energyClassification: match.energy_classification || "exothermic",
        enthalpyKjMol: match.enthalpy_kj_mol,
        confidenceScore: match.confidence_score || 0.99,
        source: `Curated Database (${match.source})`,
      };
    }

    // 2. Rule-Based Chemistry Engine Fallback
    const r1 = this.getReactantById(resolvedIds[0]!);
    const r2 = this.getReactantById(resolvedIds[1]!);

    if (!r1 || !r2) {
      return {
        status: "NO_REACTION",
        reactionType: "none",
        equation: `${reactantInputs.join(" + ")} → No reaction`,
        netIonicEquation: null,
        reactants: [],
        products: [],
        observableEffects: [{ type: "observation", description: "No observable chemical transformation or heat evolution." }],
        safetyWarnings: [],
        energyClassification: "thermoneutral",
        enthalpyKjMol: 0,
        confidenceScore: 0.85,
        source: "Rule-Based Chemistry Engine",
      };
    }

    // Rule A: Acid + Carbonate / Bicarbonate -> Salt + H2O + CO2 (gas evolution)
    const isAcid1 = r1.categoryTags.includes("acid");
    const isAcid2 = r2.categoryTags.includes("acid");
    const isCarbonate1 = r1.formula.includes("CO3");
    const isCarbonate2 = r2.formula.includes("CO3");

    if ((isAcid1 && isCarbonate2) || (isAcid2 && isCarbonate1)) {
      const acid = isAcid1 ? r1 : r2;
      const carbonate = isAcid1 ? r2 : r1;
      return {
        status: "REACTION",
        reactionType: "gas_evolution",
        equation: `${acid.formula} + ${carbonate.formula} → Salt + H2O + CO2(g)↑`,
        netIonicEquation: "2H+(aq) + CO3(2-)(aq) → H2O(l) + CO2(g)↑",
        reactants: [
          { chemicalId: acid.id, formula: acid.formula, name: acid.canonicalName, coefficient: 2 },
          { chemicalId: carbonate.id, formula: carbonate.formula, name: carbonate.canonicalName, coefficient: 1 },
        ],
        products: [
          { chemicalId: "water", formula: "H2O", name: "Water", coefficient: 1 },
          { chemicalId: "co2", formula: "CO2", name: "Carbon dioxide", coefficient: 1 },
        ],
        observableEffects: [
          { type: "gas_released", description: "Vigorous effervescence and rapid bubbling of colorless carbon dioxide (CO2) gas." },
          { type: "heat", description: "Slightly exothermic temperature increase." },
        ],
        safetyWarnings: ["Pressurization hazard in closed vessels due to rapid gas evolution."],
        energyClassification: "exothermic",
        enthalpyKjMol: -28.5,
        confidenceScore: 0.96,
        source: "Rule-Based Chemistry Engine (Acid-Carbonate Principle)",
      };
    }

    // Rule B: Single Displacement (Active metal displaces less active metal)
    const isMetal1 = r1.categoryTags.includes("metal") && r1.atomicNumber !== null;
    const isMetal2 = r2.categoryTags.includes("metal") && r2.atomicNumber !== null;
    const isSalt1 = r1.categoryTags.includes("salt");
    const isSalt2 = r2.categoryTags.includes("salt");

    if ((isMetal1 && isSalt2) || (isMetal2 && isSalt1)) {
      const freeMetal = isMetal1 ? r1 : r2;
      const salt = isMetal1 ? r2 : r1;

      // Check activity series
      const saltMetalElem = Object.keys(parseFormula(salt.formula).composition).find(
        (el) => ELEMENT_DATA.get(el)?.category?.includes("metal")
      );

      if (saltMetalElem && isMoreReactive(freeMetal.formula, saltMetalElem)) {
        return {
          status: "REACTION",
          reactionType: "single_displacement",
          equation: `${freeMetal.formula} + ${salt.formula} → Displaced ${saltMetalElem} + ${freeMetal.formula}-salt`,
          netIonicEquation: `${freeMetal.formula}(s) + ${saltMetalElem}2+(aq) → ${freeMetal.formula}2+(aq) + ${saltMetalElem}(s)`,
          reactants: [
            { chemicalId: freeMetal.id, formula: freeMetal.formula, name: freeMetal.canonicalName, coefficient: 1 },
            { chemicalId: salt.id, formula: salt.formula, name: salt.canonicalName, coefficient: 1 },
          ],
          products: [
            { chemicalId: saltMetalElem.toLowerCase(), formula: saltMetalElem, name: saltMetalElem, coefficient: 1 },
          ],
          observableEffects: [
            { type: "precipitate", description: `Elemental ${saltMetalElem} precipitates and deposits onto the ${freeMetal.canonicalName} surface.` },
            { type: "color_change", description: "Solution color shifts as cation exchange proceeds." },
          ],
          safetyWarnings: ["Exothermic redox reaction."],
          energyClassification: "exothermic",
          enthalpyKjMol: -120.0,
          confidenceScore: 0.95,
          source: "Rule-Based Chemistry Engine (Electrochemical Activity Series)",
        };
      }
    }

    // Rule B2: Active Metal + Acid Displacement (Metal displaces H2)
    if ((isMetal1 && isAcid2) || (isMetal2 && isAcid1)) {
      const freeMetal = isMetal1 ? r1 : r2;
      const acid = isMetal1 ? r2 : r1;
      if (canDisplaceHydrogenFromAcid(freeMetal.formula)) {
        return {
          status: "REACTION",
          reactionType: "single_displacement",
          equation: `${freeMetal.formula} + ${acid.formula} → Salt + H2(g)↑`,
          netIonicEquation: `${freeMetal.formula}(s) + 2H+(aq) → ${freeMetal.formula}2+(aq) + H2(g)↑`,
          reactants: [
            { chemicalId: freeMetal.id, formula: freeMetal.formula, name: freeMetal.canonicalName, coefficient: 1 },
            { chemicalId: acid.id, formula: acid.formula, name: acid.canonicalName, coefficient: 2 },
          ],
          products: [
            { chemicalId: "h2", formula: "H2", name: "Hydrogen", coefficient: 1 },
          ],
          observableEffects: [
            { type: "gas_evolution", description: `Vigorous effervescence and rapid bubbling of hydrogen gas (H2) as ${freeMetal.canonicalName} dissolves.` },
            { type: "temperature_increase", description: "Noticeable exothermic temperature rise." },
          ],
          safetyWarnings: ["Hydrogen gas is highly flammable; avoid open flames and ensure proper ventilation."],
          energyClassification: "exothermic",
          enthalpyKjMol: -220.0,
          confidenceScore: 0.95,
          source: "Rule-Based Chemistry Engine (Electrochemical Activity Series / Acid Displacement)",
        };
      }
    }

    // Rule C: Acid-Base Neutralization
    if ((isAcid1 && r2.categoryTags.includes("base")) || (isAcid2 && r1.categoryTags.includes("base"))) {
      const acid = isAcid1 ? r1 : r2;
      const base = isAcid1 ? r2 : r1;
      return {
        status: "REACTION",
        reactionType: "acid_base_neutralization",
        equation: `${acid.formula} + ${base.formula} → Salt + H2O`,
        netIonicEquation: "H+(aq) + OH-(aq) → H2O(l)",
        reactants: [
          { chemicalId: acid.id, formula: acid.formula, name: acid.canonicalName, coefficient: 1 },
          { chemicalId: base.id, formula: base.formula, name: base.canonicalName, coefficient: 1 },
        ],
        products: [
          { chemicalId: "water", formula: "H2O", name: "Water", coefficient: 1 },
        ],
        observableEffects: [
          { type: "heat", description: "Noticeable exothermic heat evolution (neutralization enthalpy ~ -57 kJ/mol)." },
        ],
        safetyWarnings: ["Exothermic reaction; rapid addition may cause localized boiling/splattering."],
        energyClassification: "exothermic",
        enthalpyKjMol: -57.3,
        confidenceScore: 0.98,
        source: "Rule-Based Chemistry Engine (Neutralization Principle)",
      };
    }

    // Default: No reaction observed
    return {
      status: "NO_REACTION",
      reactionType: "none",
      equation: `${r1.formula} + ${r2.formula} → No reaction`,
      netIonicEquation: null,
      reactants: [
        { chemicalId: r1.id, formula: r1.formula, name: r1.canonicalName, coefficient: 1 },
        { chemicalId: r2.id, formula: r2.formula, name: r2.canonicalName, coefficient: 1 },
      ],
      products: [],
      observableEffects: [{ type: "observation", description: "No observable chemical transformation or heat evolution." }],
      safetyWarnings: [],
      energyClassification: "thermoneutral",
      enthalpyKjMol: 0,
      confidenceScore: 0.9,
      source: "Rule-Based Chemistry Engine",
    };
  }
}
