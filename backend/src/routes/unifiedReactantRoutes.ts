import { Router } from "express";
import { UnifiedReactantService } from "../services/unifiedReactantService.js";

export function unifiedReactantRoutes(): Router {
  const router = Router();
  const service = new UnifiedReactantService();

  // Search reactants by query, category, bonding, or physical state
  router.get("/search", (req, res) => {
    try {
      const { q, category, state, bonding, isFlammable, page, limit } = req.query;
      const result = service.searchReactants({
        q: q ? String(q) : undefined,
        category: category ? String(category) : undefined,
        state: state ? String(state) : undefined,
        bonding: bonding ? String(bonding) : undefined,
        isFlammable: isFlammable !== undefined ? isFlammable === "true" || isFlammable === "1" : undefined,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 20,
      });
      res.json({ status: "success", data: result });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Fetch full detailed reactant profile by ID, formula, or synonym
  router.get("/:id", (req, res) => {
    try {
      const reactant = service.getReactantById(req.params.id);
      if (!reactant) {
        return res.status(404).json({ status: "error", code: "NOT_FOUND", message: `Reactant "${req.params.id}" not found.` });
      }
      res.json({ status: "success", data: reactant });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // List paged reactants
  router.get("/", (req, res) => {
    try {
      const { category, page, limit } = req.query;
      const result = service.searchReactants({
        category: category ? String(category) : undefined,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 20,
      });
      res.json({ status: "success", data: result });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Simulate mixing 2 or more reactants
  router.post("/mix", (req, res) => {
    try {
      const { reactants } = req.body;
      if (!reactants || !Array.isArray(reactants) || reactants.length < 2) {
        return res.status(400).json({
          status: "error",
          code: "INVALID_INPUT",
          message: "Body must contain 'reactants': an array with at least 2 chemical IDs or formulas.",
        });
      }
      const simulation = service.mixReactants(reactants);
      res.json({ status: "success", data: simulation });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  return router;
}
