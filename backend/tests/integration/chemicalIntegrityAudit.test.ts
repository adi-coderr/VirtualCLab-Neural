import { describe, it, expect } from "vitest";
import {
  auditReactionChemistry,
  checkInertAlkaneMixture,
  normalizeFormulaCasing,
  isSaturatedAlkane,
} from "../../src/chemistry-engine/reactionAudit.js";
import { SimulationService } from "../../src/services/simulationService.ts";

describe("Chemical Integrity & Principle-by-Principle Verification", () => {
  it("normalizes lowercase formulas properly", () => {
    expect(normalizeFormulaCasing("c4h6")).toBe("C4H6");
    expect(normalizeFormulaCasing("c2h2")).toBe("C2H2");
    expect(normalizeFormulaCasing("c2h6")).toBe("C2H6");
    expect(normalizeFormulaCasing("c3h8")).toBe("C3H8");
  });

  it("identifies saturated alkanes correctly", () => {
    expect(isSaturatedAlkane({ C: 1, H: 4 })).toBe(true); // methane
    expect(isSaturatedAlkane({ C: 2, H: 6 })).toBe(true); // ethane
    expect(isSaturatedAlkane({ C: 3, H: 8 })).toBe(true); // propane
    expect(isSaturatedAlkane({ C: 4, H: 6 })).toBe(false); // butadiene (unsaturated)
    expect(isSaturatedAlkane({ C: 2, H: 2 })).toBe(false); // acetylene (unsaturated)
  });

  it("strictly rejects reactions with alien elements (e.g. Magnesium in hydrocarbon reactions)", () => {
    const reactants = [
      { chemicalId: "ethane", formula: "C2H6", commonName: "Ethane", coefficient: 1, isRegistered: true },
      { chemicalId: "propane", formula: "C3H8", commonName: "Propane", coefficient: 1, isRegistered: true },
    ];

    // Hallucinated Grignard / magnesium intermediate
    const hallucinatedProducts = [
      { chemicalId: "c4h10mg", formula: "C4H10Mg", commonName: "Butylmagnesium", coefficient: 1, isRegistered: true },
    ];

    const audit = auditReactionChemistry(reactants, hallucinatedProducts);
    expect(audit.passed).toBe(false);
    expect(audit.failureReason).toContain("Conservation of mass failed: Product contains element(s) [Mg]");
  });

  it("strictly reports saturated alkane mixtures (ethane + propane) as chemically inert NO_REACTION", () => {
    const reactants = [
      { chemicalId: "c2h6", formula: "c2h6", commonName: "Ethane" },
      { chemicalId: "c3h8", formula: "c3h8", commonName: "Propane" },
    ];

    const inertRes = checkInertAlkaneMixture(reactants);
    expect(inertRes).not.toBeNull();
    expect(inertRes?.status).toBe("NO_REACTION");
    expect(inertRes?.products).toHaveLength(0);
    expect(inertRes?.enthalpyKjPerMol).toBe(0);
    expect(inertRes?.explanation).toContain("Saturated alkanes (paraffins) possess strong, nonpolar C–C and C–H σ-bonds");
  });

  it("validates Diels-Alder reaction C4H6 + C2H2 -> C6H8 with mass and atom balance", () => {
    const reactants = [
      { chemicalId: "c4h6", formula: "C4H6", commonName: "1,3-Butadiene", coefficient: 1, isRegistered: true },
      { chemicalId: "c2h2", formula: "C2H2", commonName: "Acetylene", coefficient: 1, isRegistered: true },
    ];

    const products = [
      { chemicalId: "c6h8", formula: "C6H8", commonName: "1,4-Cyclohexadiene", coefficient: 1, isRegistered: true },
    ];

    const audit = auditReactionChemistry(reactants, products);
    expect(audit.passed).toBe(true);
    expect(audit.balancedEquation).toBe("C4H6 + C2H2 → C6H8");
    expect(audit.balancedReactants?.[0].coefficient).toBe(1);
    expect(audit.balancedReactants?.[1].coefficient).toBe(1);
    expect(audit.balancedProducts?.[0].coefficient).toBe(1);
  });

  it("SimulationService returns NO_REACTION for ethane + propane (c2h6 + c3h8)", async () => {
    const simService = new SimulationService();
    const result = await simService.predictAny("c2h6 + c3h8");
    expect(result.simulationResult.resolution.status).toBe("NO_REACTION");
    expect(result.simulationResult.resolution.products).toHaveLength(0);
    expect(result.simulationResult.resolution.enthalpyKjPerMol).toBe(0);
    expect(result.simulationResult.resolution.warnings.length).toBeGreaterThan(0);
  });

  it("SimulationService returns Diels-Alder reaction for c4h6 + c2h2 under thermal conditions (150 °C)", async () => {
    const simService = new SimulationService();
    const result = await simService.predictAny("c4h6 + c2h2", { temperatureC: 150 });
    expect(result.simulationResult.resolution.status).toBe("REACTION");
    const prods = result.simulationResult.resolution.products;
    expect(prods.length).toBeGreaterThan(0);
    // Crucial: Must NEVER contain magnesium or other alien elements!
    for (const p of prods) {
      expect(p.formula.includes("Mg")).toBe(false);
      expect(p.formula.includes("O")).toBe(false);
    }
    // Must be valid C6 hydrocarbon product (C6H8 cyclohexadiene or C6H6 benzene)
    expect(["C6H8", "C6H6"]).toContain(prods[0].formula.toUpperCase());
  }, 15000);
});

