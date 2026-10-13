import type Database from "better-sqlite3";
import type {
  AcidBaseStrength,
  Chemical,
  ChemicalClass,
  DataConfidence,
  ElementComposition,
  Hazard,
  MoleculeStructure,
  PhysicalState,
} from "../../chemistry-engine/types.js";
import { generateMoleculeStructure } from "../../chemistry-engine/moleculeStructureGenerator.js";
import { parseFormula } from "../../chemistry-engine/formulaParser.js";
import { computeMolarMass } from "../../chemistry-engine/molarMass.js";
import { normalizeFormulaCasing } from "../../chemistry-engine/reactionAudit.js";


interface ChemicalRow {
  id: string;
  common_name: string;
  iupac_name: string | null;
  formula: string;
  molar_mass: number;
  cas_number: string | null;
  smiles: string | null;
  inchi: string | null;
  inchi_key: string | null;
  physical_state: string;
  density: number | null;
  melting_point_c: number | null;
  boiling_point_c: number | null;
  solubility_notes: string | null;
  is_acid: number;
  is_base: number;
  acid_base_strength: string;
  pka: number | null;
  pkb: number | null;
  chemical_class: string;
  charge: number;
  substance_color: string | null;
  is_elemental: number;
  common_cation_charge: number | null;
  neutralization_produces_water: number;
  dissociation_cation_formula: string | null;
  dissociation_cation_charge: number | null;
  dissociation_anion_formula: string | null;
  dissociation_anion_charge: number | null;
  source: string;
  reference: string | null;
  last_verified_date: string | null;
  confidence: string;
  data_version: string;
  notes: string | null;
}

export interface ChemicalSummary {
  id: string;
  commonName: string;
  formula: string;
  molarMass: number;
  chemicalClass: ChemicalClass;
  substanceColor?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export class ChemicalRepository {
  constructor(private readonly db: Database.Database) {}

  private getComposition(chemicalId: string): ElementComposition {
    const rows = this.db
      .prepare("SELECT element_symbol, count FROM chemical_elements WHERE chemical_id = ?")
      .all(chemicalId) as { element_symbol: string; count: number }[];
    const composition: ElementComposition = {};
    for (const row of rows) composition[row.element_symbol] = row.count;
    return composition;
  }

  private getAliases(chemicalId: string): string[] {
    return (this.db.prepare("SELECT alias FROM chemical_aliases WHERE chemical_id = ?").all(chemicalId) as { alias: string }[]).map(
      (r) => r.alias
    );
  }

  private getHazards(chemicalId: string): Hazard[] {
    return this.db
      .prepare(
        `SELECT h.code, h.label, h.description, h.severity
         FROM chemical_hazards ch JOIN hazards h ON h.code = ch.hazard_code
         WHERE ch.chemical_id = ?`
      )
      .all(chemicalId) as Hazard[];
  }

  private getStructure(
    chemicalId: string,
    formula?: string,
    commonName?: string,
    smiles?: string
  ): MoleculeStructure | undefined {
    const atoms = this.db
      .prepare("SELECT * FROM molecule_atoms WHERE chemical_id = ? ORDER BY atom_index")
      .all(chemicalId) as {
      atom_index: number;
      element_symbol: string;
      x2d: number;
      y2d: number;
      x3d: number;
      y3d: number;
      z3d: number;
      formal_charge: number;
    }[];

    if (atoms.length > 0) {
      const bonds = this.db.prepare("SELECT * FROM molecule_bonds WHERE chemical_id = ?").all(chemicalId) as {
        atom_index_1: number;
        atom_index_2: number;
        bond_order: number;
        bond_type: string;
      }[];

      let hasUnphysicalBond = false;
      for (const b of bonds) {
        const a1 = atoms.find((a) => a.atom_index === b.atom_index_1);
        const a2 = atoms.find((a) => a.atom_index === b.atom_index_2);
        if (a1 && a2) {
          const d = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
          if (d > 2.65 || (b.bond_type === "covalent" && d < 0.70)) {
            hasUnphysicalBond = true;
            break;
          }
        }
      }

      if (!hasUnphysicalBond) {
        for (let i = 0; i < atoms.length; i++) {
          for (let j = i + 1; j < atoms.length; j++) {
            const a1 = atoms[i]!;
            const a2 = atoms[j]!;
            const d = Math.hypot(a1.x3d - a2.x3d, a1.y3d - a2.y3d, a1.z3d - a2.z3d);
            if (d < 0.65) {
              hasUnphysicalBond = true;
              break;
            }
          }
          if (hasUnphysicalBond) break;
        }
      }

      if (!hasUnphysicalBond) {
        return {
          curated: true,
          atoms: atoms.map((a) => ({
            atomIndex: a.atom_index,
            element: a.element_symbol,
            x2d: a.x2d,
            y2d: a.y2d,
            x3d: a.x3d,
            y3d: a.y3d,
            z3d: a.z3d,
            formalCharge: a.formal_charge,
          })),
          bonds: bonds.map((b) => ({
            atomIndex1: b.atom_index_1,
            atomIndex2: b.atom_index_2,
            order: b.bond_order as 1 | 2 | 3,
            type: b.bond_type as "covalent" | "ionic",
          })),
        };
      }
    }

    // Dynamic 3D molecular structure generation for all compounds
    const comp = this.getComposition(chemicalId);
    if (Object.keys(comp).length > 0 || (formula && /^[A-Z]/.test(formula)) || smiles) {
      return generateMoleculeStructure(chemicalId, formula || "", comp, commonName || "", smiles);
    }

    return undefined;
  }

  private rowToChemical(row: ChemicalRow): Chemical {
    const dissociation =
      row.dissociation_cation_formula && row.dissociation_anion_formula
        ? {
            cation: { formula: row.dissociation_cation_formula, charge: row.dissociation_cation_charge ?? 0 },
            anion: { formula: row.dissociation_anion_formula, charge: row.dissociation_anion_charge ?? 0 },
          }
        : undefined;

    return {
      id: row.id,
      commonName: row.common_name,
      iupacName: row.iupac_name ?? undefined,
      formula: row.formula,
      composition: this.getComposition(row.id),
      charge: row.charge,
      molarMass: row.molar_mass,
      casNumber: row.cas_number ?? undefined,
      smiles: row.smiles ?? undefined,
      inchi: row.inchi ?? undefined,
      inchiKey: row.inchi_key ?? undefined,
      physicalState: row.physical_state as PhysicalState,
      density: row.density ?? undefined,
      meltingPointC: row.melting_point_c ?? undefined,
      boilingPointC: row.boiling_point_c ?? undefined,
      solubilityNotes: row.solubility_notes ?? undefined,
      isAcid: !!row.is_acid,
      isBase: !!row.is_base,
      acidBaseStrength: row.acid_base_strength as AcidBaseStrength,
      pKa: row.pka ?? undefined,
      pKb: row.pkb ?? undefined,
      chemicalClass: row.chemical_class as ChemicalClass,
      substanceColor: row.substance_color ?? undefined,
      aliases: this.getAliases(row.id),
      hazards: this.getHazards(row.id),
      structure: this.getStructure(row.id, row.formula, row.common_name, row.smiles ?? undefined),
      provenance: {
        source: row.source,
        reference: row.reference ?? undefined,
        lastVerifiedDate: row.last_verified_date ?? undefined,
        confidence: row.confidence as DataConfidence,
        dataVersion: row.data_version,
      },
      notes: row.notes ?? undefined,
      dissociation,
      isElemental: !!row.is_elemental,
      commonCationCharge: row.common_cation_charge ?? undefined,
      neutralizationProducesWater: !!row.neutralization_produces_water,
    };
  }

  getById(id: string): Chemical | undefined {
    // 1. Direct ID match
    const row = this.db.prepare("SELECT * FROM chemicals WHERE id = ?").get(id) as ChemicalRow | undefined;
    if (row) return this.rowToChemical(row);

    // 2. Direct name or case-insensitive ID match
    const byName = this.db
      .prepare("SELECT * FROM chemicals WHERE LOWER(common_name) = LOWER(?) OR LOWER(id) = LOWER(?)")
      .get(id, id) as ChemicalRow | undefined;
    if (byName) return this.rowToChemical(byName);

    // 3. Normalize ID (clean slug, replace underscores, compact alphanumeric)
    const cleanWithSpaces = id.replace(/_/g, " ").trim();
    const cleanSlug = id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const cleanCompact = id.toLowerCase().replace(/[^a-z0-9]/g, "");

    const byNormalized = this.db
      .prepare(`
        SELECT * FROM chemicals 
        WHERE id = ? 
           OR id = ? 
           OR LOWER(common_name) = LOWER(?) 
           OR LOWER(common_name) = LOWER(?)
           OR REPLACE(REPLACE(LOWER(common_name), ' ', ''), '-', '') = ?
           OR REPLACE(REPLACE(LOWER(id), ' ', ''), '-', '') = ?
           OR id IN (
             SELECT chemical_id FROM chemical_aliases 
             WHERE LOWER(alias) = LOWER(?) 
                OR LOWER(alias) = LOWER(?)
                OR LOWER(alias) = LOWER(?)
                OR REPLACE(REPLACE(LOWER(alias), ' ', ''), '-', '') = ?
           )
        LIMIT 1
      `)
      .get(
        id,
        cleanSlug,
        id,
        cleanWithSpaces,
        cleanCompact,
        cleanCompact,
        id,
        cleanWithSpaces,
        cleanSlug,
        cleanCompact
      ) as ChemicalRow | undefined;

    if (byNormalized) {
      const chem = this.rowToChemical(byNormalized);
      return { ...chem, id };
    }

    // 4. Direct formula match (e.g. C6H8, C4H6, C2H2, H2O)
    const byFormula = this.db
      .prepare("SELECT * FROM chemicals WHERE LOWER(formula) = LOWER(?) LIMIT 1")
      .get(id) as ChemicalRow | undefined;
    if (byFormula) {
      const chem = this.rowToChemical(byFormula);
      return { ...chem, id };
    }

    // 5. Dynamic chemical synthesis from valid formula with 3D structure
    const norm = normalizeFormulaCasing(id);
    try {
      const parsed = parseFormula(norm);
      if (Object.keys(parsed.composition).length > 0) {
        const molarMass = computeMolarMass(parsed.composition);
        const struct = generateMoleculeStructure(id, norm, parsed.composition, id);
        return {
          id,
          commonName: id,
          formula: norm,
          composition: parsed.composition,
          charge: parsed.charge,
          molarMass,
          physicalState: "liquid",
          isAcid: false,
          isBase: false,
          acidBaseStrength: "none",
          chemicalClass: "organic",
          aliases: [],
          hazards: [],
          structure: struct,
          provenance: {
            source: "virtual_chem_lab_dynamic",
            confidence: "medium",
            dataVersion: "0.1",
          },
        };
      }
    } catch {}

    return undefined;
  }

  getByFormula(formula: string): Chemical | undefined {
    const row = this.db
      .prepare("SELECT * FROM chemicals WHERE LOWER(formula) = LOWER(?) LIMIT 1")
      .get(formula.trim()) as ChemicalRow | undefined;
    if (row) return this.rowToChemical(row);
    return this.getById(formula);
  }

  getByIds(ids: string[]): Chemical[] {
    return ids.map((id) => this.getById(id)).filter((c): c is Chemical => c !== undefined);
  }

  /**
   * Finds a registered chemical with an exact element composition and charge.
   * The dataset is small (tens to low hundreds of records) so an in-memory
   * scan is simpler and plenty fast; at "thousands to millions of records"
   * scale (see docs/DATABASE_SCHEMA.md) this should become an indexed
   * canonical-composition-hash lookup instead.
   */
  findByComposition(composition: ElementComposition, charge: number): Chemical | undefined {
    const candidates = this.db.prepare("SELECT id FROM chemicals WHERE charge = ?").all(charge) as { id: string }[];
    const targetKeys = Object.keys(composition)
      .filter((k) => composition[k] !== 0)
      .sort();
    for (const { id } of candidates) {
      const candidateComposition = this.getComposition(id);
      const candidateKeys = Object.keys(candidateComposition).sort();
      if (candidateKeys.length !== targetKeys.length) continue;
      if (candidateKeys.every((k, i) => k === targetKeys[i] && candidateComposition[k] === composition[k])) {
        return this.getById(id);
      }
    }
    return undefined;
  }

  search(query: string, limit = 20, offset = 0): PagedResult<ChemicalSummary> {
    const rawTrim = query.trim();
    const q = `%${rawTrim.toLowerCase()}%`;
    const exact = rawTrim.toLowerCase();
    const compactExact = exact.replace(/[^a-z0-9]/g, "");
    const qCompact = `%${compactExact}%`;

    const rows = this.db
      .prepare(
        `SELECT DISTINCT c.id, c.common_name, c.formula, c.molar_mass, c.chemical_class, c.substance_color,
                CASE
                  WHEN LOWER(c.formula) = @exact THEN 0
                  WHEN LOWER(c.common_name) = @exact THEN 1
                  WHEN REPLACE(REPLACE(LOWER(c.common_name), ' ', ''), '-', '') = @compactExact THEN 1
                  WHEN LOWER(a.alias) = @exact THEN 1
                  WHEN REPLACE(REPLACE(LOWER(a.alias), ' ', ''), '-', '') = @compactExact THEN 1
                  WHEN c.cas_number = @raw THEN 1
                  WHEN LOWER(c.formula) LIKE @prefix THEN 2
                  WHEN LOWER(c.common_name) LIKE @prefix THEN 3
                  WHEN LOWER(a.alias) LIKE @prefix THEN 3
                  WHEN REPLACE(REPLACE(LOWER(c.common_name), ' ', ''), '-', '') LIKE @qCompact THEN 3
                  WHEN REPLACE(REPLACE(LOWER(a.alias), ' ', ''), '-', '') LIKE @qCompact THEN 3
                  ELSE 4
                END as rank,
                CASE
                  WHEN c.source LIKE '%CRC%' OR c.source LIKE '%Curated%' OR c.source LIKE '%textbook%' THEN 0
                  ELSE 1
                END as sourceRank
         FROM chemicals c
         LEFT JOIN chemical_aliases a ON a.chemical_id = c.id
         WHERE (
            LOWER(c.common_name) LIKE @q
            OR LOWER(c.formula) LIKE @q
            OR LOWER(COALESCE(c.iupac_name, '')) LIKE @q
            OR LOWER(a.alias) LIKE @q
            OR c.cas_number = @raw
            OR (LENGTH(@compactExact) >= 3 AND (
                 REPLACE(REPLACE(LOWER(c.common_name), ' ', ''), '-', '') LIKE @qCompact
                 OR REPLACE(REPLACE(LOWER(c.id), ' ', ''), '-', '') LIKE @qCompact
                 OR REPLACE(REPLACE(LOWER(a.alias), ' ', ''), '-', '') LIKE @qCompact
               ))
         )
         AND NOT (c.common_name GLOB '(*)' OR c.common_name GLOB '[*]' OR c.common_name GLOB '#*')
         ORDER BY rank ASC, sourceRank ASC, LENGTH(c.common_name) ASC
         LIMIT @limit OFFSET @offset`
      )
      .all({ q, exact, compactExact, qCompact, raw: rawTrim, prefix: `${exact}%`, limit, offset }) as (ChemicalRow extends never
      ? never
      : {
          id: string;
          common_name: string;
          formula: string;
          molar_mass: number;
          chemical_class: string;
          substance_color: string | null;
        })[];

    const totalRow = this.db
      .prepare(
        `SELECT COUNT(DISTINCT c.id) as n
         FROM chemicals c
         LEFT JOIN chemical_aliases a ON a.chemical_id = c.id
         WHERE (
            LOWER(c.common_name) LIKE @q
            OR LOWER(c.formula) LIKE @q
            OR LOWER(COALESCE(c.iupac_name, '')) LIKE @q
            OR LOWER(a.alias) LIKE @q
            OR c.cas_number = @raw
            OR (LENGTH(@compactExact) >= 3 AND (
                 REPLACE(REPLACE(LOWER(c.common_name), ' ', ''), '-', '') LIKE @qCompact
                 OR REPLACE(REPLACE(LOWER(c.id), ' ', ''), '-', '') LIKE @qCompact
                 OR REPLACE(REPLACE(LOWER(a.alias), ' ', ''), '-', '') LIKE @qCompact
               ))
         )
         AND NOT (c.common_name GLOB '(*)' OR c.common_name GLOB '[*]' OR c.common_name GLOB '#*')`
      )
      .get({ q, compactExact, qCompact, raw: rawTrim }) as { n: number };

    return {
      items: rows.map((r) => ({
        id: r.id,
        commonName: r.common_name,
        formula: r.formula,
        molarMass: r.molar_mass,
        chemicalClass: r.chemical_class as ChemicalClass,
        substanceColor: r.substance_color ?? undefined,
      })),
      total: totalRow.n,
    };
  }

  list(limit = 50, offset = 0, chemicalClass?: string): PagedResult<ChemicalSummary> {
    const rows = chemicalClass
      ? (this.db
          .prepare(`
            SELECT * FROM chemicals 
            WHERE chemical_class = ?
              AND NOT (common_name GLOB '(*)' OR common_name GLOB '[*]' OR common_name GLOB '#*')
            ORDER BY 
              CASE WHEN source LIKE '%CRC%' OR source LIKE '%Curated%' OR source LIKE '%textbook%' THEN 0 ELSE 1 END,
              common_name ASC 
            LIMIT ? OFFSET ?
          `)
          .all(chemicalClass, limit, offset) as ChemicalRow[])
      : (this.db
          .prepare(`
            SELECT * FROM chemicals 
            WHERE NOT (common_name GLOB '(*)' OR common_name GLOB '[*]' OR common_name GLOB '#*')
            ORDER BY 
              CASE WHEN source LIKE '%CRC%' OR source LIKE '%Curated%' OR source LIKE '%textbook%' THEN 0 ELSE 1 END,
              common_name ASC 
            LIMIT ? OFFSET ?
          `)
          .all(limit, offset) as ChemicalRow[]);

    const totalRow = chemicalClass
      ? (this.db
          .prepare(`
            SELECT COUNT(*) as n FROM chemicals 
            WHERE chemical_class = ?
              AND NOT (common_name GLOB '(*)' OR common_name GLOB '[*]' OR common_name GLOB '#*')
          `)
          .get(chemicalClass) as { n: number })
      : (this.db
          .prepare(`
            SELECT COUNT(*) as n FROM chemicals 
            WHERE NOT (common_name GLOB '(*)' OR common_name GLOB '[*]' OR common_name GLOB '#*')
          `)
          .get() as { n: number });

    return {
      items: rows.map((r) => ({
        id: r.id,
        commonName: r.common_name,
        formula: r.formula,
        molarMass: r.molar_mass,
        chemicalClass: r.chemical_class as ChemicalClass,
        substanceColor: r.substance_color ?? undefined,
      })),
      total: totalRow.n,
    };
  }
}
