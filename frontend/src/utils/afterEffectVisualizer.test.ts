import { describe, it, expect } from "vitest";
import { getAfterEffectVisual } from "./afterEffectVisualizer";
import type { ReactionResolution } from "../types/chemistry";

describe("afterEffectVisualizer", () => {
  it("returns null for reactions without conditions or after-effects", () => {
    const res: ReactionResolution = {
      status: "REACTION",
      confidenceTier: "SUPPORTED",
      confidenceScore: 1,
      reactants: [],
      products: [],
      observableEffects: [],
      explanation: "Standard neutralization",
      ruleApplied: "acid_base",
      warnings: [],
    };
    expect(getAfterEffectVisual(res)).toBeNull();
  });

  it("detects polymer_film for Nylon-6,6 interfacial polymerization", () => {
    const res: ReactionResolution = {
      status: "REACTION",
      confidenceTier: "SUPPORTED",
      confidenceScore: 1,
      reactants: [{ chemicalId: "adipoyl-chloride", formula: "C6H8Cl2O2", commonName: "Adipoyl chloride", coefficient: 1, isRegistered: true }],
      products: [{ chemicalId: "nylon_66", formula: "C12H22N2O2", commonName: "Nylon-6,6", coefficient: 1, isRegistered: true }],
      observableEffects: [],
      explanation: "Interfacial polycondensation",
      ruleApplied: "curated_database",
      warnings: [],
      conditionsDescription: "The two layers meet without mixing",
      outcome: "A film forms instantly at the interface and can be pulled out as a continuous rope",
      afterEffect: "White nylon thread. In practice NaOH is added to absorb the HCl.",
    };
    const visual = getAfterEffectVisual(res);
    expect(visual).not.toBeNull();
    expect(visual?.type).toBe("polymer_film");
    expect(visual?.badge).toContain("Polymer");
  });

  it("detects salt_crust for Sodium + Chlorine", () => {
    const res: ReactionResolution = {
      status: "REACTION",
      confidenceTier: "SUPPORTED",
      confidenceScore: 1,
      reactants: [{ chemicalId: "na", formula: "Na", commonName: "Sodium", coefficient: 2, isRegistered: true }],
      products: [{ chemicalId: "nacl", formula: "NaCl", commonName: "Sodium chloride", coefficient: 2, isRegistered: true }],
      observableEffects: [],
      explanation: "Direct elemental synthesis",
      ruleApplied: "curated_database",
      warnings: [],
      conditionsDescription: "Warmed sodium lowered into a chlorine-filled jar",
      afterEffect: "white NaCl coats the vessel, with a large temperature rise.",
    };
    const visual = getAfterEffectVisual(res);
    expect(visual).not.toBeNull();
    expect(visual?.type).toBe("salt_crust");
    expect(visual?.badge).toContain("Salt");
  });

  it("detects brown_fumes for Copper + Nitric Acid", () => {
    const res: ReactionResolution = {
      status: "REACTION",
      confidenceTier: "SUPPORTED",
      confidenceScore: 1,
      reactants: [{ chemicalId: "cu", formula: "Cu", commonName: "Copper", coefficient: 1, isRegistered: true }],
      products: [{ chemicalId: "cuno32", formula: "Cu(NO3)2", commonName: "Copper(II) nitrate", coefficient: 1, isRegistered: true }],
      observableEffects: [],
      explanation: "Redox oxidation",
      ruleApplied: "curated_database",
      warnings: [],
      conditionsDescription: "Concentrated vs dilute acid",
      afterEffect: "Green solution that turns blue on dilution (Cu(NO3)2). Dense brown NO2 fumes.",
    };
    const visual = getAfterEffectVisual(res);
    expect(visual).not.toBeNull();
    expect(visual?.type).toBe("brown_fumes");
  });

  it("detects purple_vapor for Aluminium + Iodine", () => {
    const res: ReactionResolution = {
      status: "REACTION",
      confidenceTier: "SUPPORTED",
      confidenceScore: 1,
      reactants: [],
      products: [],
      observableEffects: [],
      explanation: "Synthesis",
      ruleApplied: "curated_database",
      warnings: [],
      conditionsDescription: "Room temperature, water added last",
      afterEffect: "yellow-brown AlI3 residue and purple iodine crystals and vapour",
    };
    const visual = getAfterEffectVisual(res);
    expect(visual).not.toBeNull();
    expect(visual?.type).toBe("purple_vapor");
  });

  it("detects white_smoke for Ammonia + HCl", () => {
    const res: ReactionResolution = {
      status: "REACTION",
      confidenceTier: "SUPPORTED",
      confidenceScore: 1,
      reactants: [],
      products: [],
      observableEffects: [],
      explanation: "Gas phase combination",
      ruleApplied: "curated_database",
      warnings: [],
      conditionsDescription: "Gas jars mouth to mouth",
      afterEffect: "thick white NH4Cl smoke coating glassware with fine white powder.",
    };
    const visual = getAfterEffectVisual(res);
    expect(visual).not.toBeNull();
    expect(visual?.type).toBe("white_smoke");
  });
});
