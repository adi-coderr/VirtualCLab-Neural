import { describe, it, expect } from "vitest";
import {
  derivePhysicalForm,
  getPhaseIcon,
  getPhaseLabel,
  analyzeVesselPhases,
} from "./phaseUtils";
import type { ContainerContent } from "../types/experiment";

describe("phaseUtils", () => {
  describe("derivePhysicalForm", () => {
    it("correctly infers elemental solid metals as 'solid'", () => {
      expect(derivePhysicalForm({ formula: "Cu", chemicalClass: "metal" })).toBe("solid");
      expect(derivePhysicalForm({ formula: "Fe", chemicalClass: "metal" })).toBe("solid");
      expect(derivePhysicalForm({ formula: "Zn", chemicalClass: "metal" })).toBe("solid");
      expect(derivePhysicalForm({ formula: "Mg", chemicalClass: "metal" })).toBe("solid");
    });

    it("correctly infers salts as 'crystal'", () => {
      expect(derivePhysicalForm({ formula: "CuSO4", chemicalClass: "salt" })).toBe("crystal");
      expect(derivePhysicalForm({ formula: "NaCl", chemicalClass: "salt" })).toBe("crystal");
      expect(derivePhysicalForm({ formula: "KNO3", chemicalClass: "salt" })).toBe("crystal");
    });

    it("correctly infers oxides, carbonates and precipitates as 'powder'", () => {
      expect(derivePhysicalForm({ formula: "CaCO3", chemicalClass: "carbonate" })).toBe("powder");
      expect(derivePhysicalForm({ formula: "CuO", chemicalClass: "oxide" })).toBe("powder");
      expect(derivePhysicalForm({ formula: "Cu(OH)2", chemicalClass: "base" })).toBe("powder");
      expect(derivePhysicalForm({ formula: "S", chemicalClass: "nonmetal" })).toBe("powder");
    });

    it("correctly infers common liquids as 'liquid'", () => {
      expect(derivePhysicalForm({ formula: "H2O", chemicalClass: "solvent" })).toBe("liquid");
      expect(derivePhysicalForm({ formula: "C2H5OH", chemicalClass: "organic" })).toBe("liquid");
      expect(derivePhysicalForm({ formula: "HCl", chemicalClass: "acid" })).toBe("liquid");
      expect(derivePhysicalForm({ formula: "H2SO4", chemicalClass: "acid" })).toBe("liquid");
    });

    it("correctly infers gases as 'gas'", () => {
      expect(derivePhysicalForm({ formula: "CO2", physicalState: "gas" })).toBe("gas");
      expect(derivePhysicalForm({ formula: "NH3", physicalState: "gas" })).toBe("gas");
      expect(derivePhysicalForm({ formula: "Cl2", physicalState: "gas" })).toBe("gas");
    });
  });

  describe("getPhaseIcon and getPhaseLabel", () => {
    it("returns clean icon without emojis", () => {
      expect(getPhaseIcon("crystal")).toBe("");
      expect(getPhaseIcon("powder")).toBe("");
      expect(getPhaseIcon("solid")).toBe("");
      expect(getPhaseIcon("liquid")).toBe("");
      expect(getPhaseIcon("gas")).toBe("");
    });

    it("returns concise human-readable labels", () => {
      expect(getPhaseLabel("crystal")).toBe("Crystal");
      expect(getPhaseLabel("powder")).toBe("Powder");
      expect(getPhaseLabel("solid")).toBe("Solid");
      expect(getPhaseLabel("liquid")).toBe("Liquid");
      expect(getPhaseLabel("gas")).toBe("Gas");
    });
  });

  describe("analyzeVesselPhases", () => {
    it("handles empty container contents", () => {
      const res = analyzeVesselPhases([], "beaker", "#3b82f6");
      expect(res.hasLiquid).toBe(false);
      expect(res.solids).toHaveLength(0);
      expect(res.liquidFillPercent).toBe(0);
    });

    it("identifies dry solid powder with no liquid layer", () => {
      const contents: ContainerContent[] = [
        {
          chemicalId: "caco3",
          formula: "CaCO3",
          commonName: "Calcium carbonate",
          amount: 15,
          unit: "g",
          physicalForm: "powder",
          physicalState: "solid",
        },
      ];

      const res = analyzeVesselPhases(contents, "beaker", "#ffffff");
      expect(res.hasLiquid).toBe(false);
      expect(res.solids).toHaveLength(1);
      expect(res.solids[0]!.form).toBe("powder");
      expect(res.solids[0]!.isSubmerged).toBe(false);
      expect(res.liquidFillPercent).toBe(0);
    });

    it("identifies dry crystalline cluster with no liquid layer", () => {
      const contents: ContainerContent[] = [
        {
          chemicalId: "cuso4",
          formula: "CuSO4",
          commonName: "Copper(II) sulfate",
          amount: 10,
          unit: "g",
          physicalForm: "crystal",
          physicalState: "solid",
          substanceColor: "#2E7DA6",
        },
      ];

      const res = analyzeVesselPhases(contents, "beaker", "#2E7DA6");
      expect(res.hasLiquid).toBe(false);
      expect(res.solids).toHaveLength(1);
      expect(res.solids[0]!.form).toBe("crystal");
      expect(res.solids[0]!.isSubmerged).toBe(false);
    });

    it("correctly sets isSubmerged: true when liquid and solid coexist", () => {
      const contents: ContainerContent[] = [
        {
          chemicalId: "h2o",
          formula: "H2O",
          commonName: "Water",
          amount: 50,
          unit: "mL",
          physicalForm: "liquid",
          physicalState: "liquid",
        },
        {
          chemicalId: "cu",
          formula: "Cu",
          commonName: "Copper strip",
          amount: 5,
          unit: "g",
          physicalForm: "solid",
          physicalState: "solid",
          substanceColor: "#C88033",
        },
      ];

      const res = analyzeVesselPhases(contents, "beaker", "#3b82f6");
      expect(res.hasLiquid).toBe(true);
      expect(res.liquidFillPercent).toBeGreaterThan(0);
      expect(res.solids).toHaveLength(1);
      expect(res.solids[0]!.form).toBe("solid");
      expect(res.solids[0]!.isSubmerged).toBe(true);
      expect(res.solids[0]!.color).toBe("#C88033");
    });
  });
});
