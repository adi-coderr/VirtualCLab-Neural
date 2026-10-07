import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface LocalModelStatus {
  status: "ready" | "starting" | "offline" | "error";
  modelName: string;
  architecture: string;
  parameters: string;
  trainingDataset: string;
  vocabSize: number;
  device: string;
  loadTimeSec?: number;
  endpoint: string;
  error?: string;
}

export interface LocalModelPredictRequest {
  input: string;
  numBeams?: number;
  maxLength?: number;
  temperature?: number;
}

import {
  analyzeProduct,
  analyzeReactionTransformation,
  type ProductChemicalProfile,
} from "../chemistry-engine/molecularAnalysis.js";

export interface LocalModelPredictResponse {
  input: string;
  rawOutput: string;
  cleanedOutput: string;
  predictedEquation: string;
  predictedProducts: string[];
  productAnalyses: ProductChemicalProfile[];
  reactionType: string;
  atomEconomyPercent: number;
  expectedByproducts: string[];
  mechanismNotes: string;
  latencyMs: number;
  modelName: string;
  trainingDataset: string;
  device: string;
  beamsUsed: number;
  timestamp: string;
}

class LocalMlModelService {
  private childProcess: ChildProcess | null = null;
  private readonly port = 5005;
  private readonly baseUrl = `http://127.0.0.1:${this.port}`;
  private isSpawning = false;

  private getPythonPath(): string {
    const candidates = [
      path.resolve(__dirname, "../../../.venv/bin/python3"),
      path.resolve(__dirname, "../../.venv/bin/python3"),
      path.resolve(process.cwd(), ".venv/bin/python3"),
      path.resolve(process.cwd(), "../.venv/bin/python3"),
      "python3",
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return "python3";
  }

  private getScriptPath(): string {
    const candidates = [
      path.resolve(__dirname, "../ai/model_service.py"),
      path.resolve(__dirname, "../../src/ai/model_service.py"),
      path.resolve(process.cwd(), "backend/src/ai/model_service.py"),
      path.resolve(process.cwd(), "src/ai/model_service.py"),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return candidates[0]!;
  }

  public async getStatus(): Promise<LocalModelStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as any;
        return {
          status: "ready",
          modelName: data.model_name || "virtual_chem_lab_model",
          architecture: data.architecture || "T5ForConditionalGeneration",
          parameters: data.parameters || "60.5M",
          trainingDataset: data.training_dataset || "1.8 Million USPTO Chemical Reactions",
          vocabSize: data.vocab_size || 32100,
          device: data.device || "cpu",
          loadTimeSec: data.load_time_sec,
          endpoint: this.baseUrl,
        };
      }
    } catch {
      // Server not reachable yet
    }

    if (this.isSpawning) {
      return {
        status: "starting",
        modelName: "virtual_chem_lab_model",
        architecture: "T5ForConditionalGeneration",
        parameters: "60.5M",
        trainingDataset: "1.8 Million USPTO Chemical Reactions",
        vocabSize: 32100,
        device: "mps",
        endpoint: this.baseUrl,
      };
    }

    return {
      status: "offline",
      modelName: "virtual_chem_lab_model",
      architecture: "T5ForConditionalGeneration",
      parameters: "60.5M",
      trainingDataset: "1.8 Million USPTO Chemical Reactions",
      vocabSize: 32100,
      device: "unknown",
      endpoint: this.baseUrl,
      error: "ML service is offline. Click Start or trigger a prediction to auto-launch.",
    };
  }

  public async ensureServerRunning(): Promise<boolean> {
    const status = await this.getStatus();
    if (status.status === "ready") {
      return true;
    }

    if (this.isSpawning) {
      // Wait up to 15 seconds for spawning
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const s = await this.getStatus();
        if (s.status === "ready") return true;
      }
      return false;
    }

    this.isSpawning = true;
    const pythonBin = this.getPythonPath();
    const scriptPath = this.getScriptPath();

    logger.info(`Auto-launching local ML model service with ${pythonBin} ${scriptPath}...`);

    try {
      this.childProcess = spawn(pythonBin, [scriptPath], {
        env: {
          ...process.env,
          ML_PORT: String(this.port),
        },
        detached: true,
        stdio: "ignore",
      });

      this.childProcess.unref();

      // Poll until ready
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const s = await this.getStatus();
        if (s.status === "ready") {
          logger.info("Local ML model service is now ready!");
          this.isSpawning = false;
          return true;
        }
      }
    } catch (err: any) {
      logger.error(`Failed to launch local ML model server: ${err.message}`);
    } finally {
      this.isSpawning = false;
    }

    return false;
  }

  public async predict(req: LocalModelPredictRequest): Promise<LocalModelPredictResponse> {
    const isRunning = await this.ensureServerRunning();
    if (!isRunning) {
      throw new Error(
        "Local ML Model Service could not be started. Ensure Python dependencies are installed in .venv."
      );
    }

    const res = await fetch(`${this.baseUrl}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: req.input,
        num_beams: req.numBeams ?? 4,
        max_length: req.maxLength ?? 128,
        temperature: req.temperature ?? 1.0,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ML Model prediction failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const reactantTokens = req.input.split(".").filter(Boolean);
    const rawProducts = (data.predicted_products as string[]) || [];
    const productProfiles = rawProducts.map((p) => analyzeProduct(p));
    const rxnAnalysis = analyzeReactionTransformation(reactantTokens, productProfiles);

    return {
      input: data.input,
      rawOutput: data.raw_output,
      cleanedOutput: data.cleaned_output,
      predictedEquation: data.predicted_equation,
      predictedProducts: rawProducts,
      productAnalyses: productProfiles,
      reactionType: rxnAnalysis.reactionType,
      atomEconomyPercent: rxnAnalysis.theoreticalAtomEconomyPercent,
      expectedByproducts: rxnAnalysis.expectedByproducts,
      mechanismNotes: rxnAnalysis.observationsSummary,
      latencyMs: data.latency_ms,
      modelName: data.model_name,
      trainingDataset: data.training_dataset,
      device: data.device,
      beamsUsed: data.beams_used,
      timestamp: new Date().toISOString(),
    };
  }
}

export const localMlModelService = new LocalMlModelService();
