import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDatabaseFile(nodeEnv: string): string {
  if (process.env.DATABASE_FILE) return process.env.DATABASE_FILE;
  if (nodeEnv === "test") return ":memory:";

  const candidates = [
    path.resolve(__dirname, "../../data/chemlab.db"),
    path.join(process.cwd(), "backend", "data", "chemlab.db"),
    path.join(process.cwd(), "data", "chemlab.db"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(__dirname, "../../data/chemlab.db");
}

export interface AppConfig {
  port: number;
  databaseFile: string;
  corsOrigin: string;
  nodeEnv: "development" | "production" | "test";
  anthropicApiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  defaultAiProvider?: "groq" | "gemini" | "openai" | "anthropic";
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached) return cached;

  const nodeEnv = (process.env.NODE_ENV as AppConfig["nodeEnv"]) || "development";
  cached = {
    port: Number(process.env.PORT ?? 4000),
    databaseFile: resolveDatabaseFile(nodeEnv),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    nodeEnv,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    defaultAiProvider: (process.env.DEFAULT_AI_PROVIDER as any) ?? "groq",
  };
  return cached;
}
