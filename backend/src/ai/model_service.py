"""
Virtual ChemLab Local ML Model Inference Service
Loads and serves `ReactionT5v2` (ReactionT5 model pretrained on the Open Reaction Database and USPTO).
Provides local forward reaction synthesis prediction and property analysis.
"""

import os
import sys
import time
import re
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Project root paths
PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../..")
)
MODEL_DIR = os.path.join(PROJECT_ROOT, "virtual_chem_lab_modelV2")
if not os.path.exists(MODEL_DIR):
    MODEL_DIR = os.path.join(PROJECT_ROOT, "ReactionT5v2")
if os.path.exists(MODEL_DIR):
    sys.path.insert(0, MODEL_DIR)
    sys.path.insert(0, os.path.join(MODEL_DIR, "task_forward"))

# Check for local checkpoint in virtual_chem_lab_modelV2/model, else fallback to Hugging Face ID
LOCAL_MODEL_DIR = os.path.join(MODEL_DIR, "model")
if os.path.exists(os.path.join(LOCAL_MODEL_DIR, "config.json")):
    MODEL_PATH = LOCAL_MODEL_DIR
else:
    MODEL_PATH = os.environ.get("REACTIONT5_MODEL", "sagawa/ReactionT5v2-forward")

app = FastAPI(
    title="Virtual ChemLab ReactionT5v2 Service",
    description="Local inference server for ReactionT5v2 chemical reaction neural model",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
tokenizer = None
device = "cpu"
load_time_sec = 0.0

def load_model():
    global model, tokenizer, device, load_time_sec
    if model is not None:
        return
    t0 = time.time()
    print(f"[ReactionT5v2] Loading tokenizer and model from {MODEL_PATH}...")
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, fix_markdown=False)
    
    if torch.backends.mps.is_available():
        device = "mps"
    elif torch.cuda.is_available():
        device = "cuda"
    else:
        device = "cpu"
        
    print(f"[ReactionT5v2] Using device: {device}")
    
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_PATH)
    model.to(device)
    model.eval()
    
    load_time_sec = round(time.time() - t0, 2)
    print(f"[ReactionT5v2] Model loaded successfully in {load_time_sec}s! Vocab size: {len(tokenizer)}")

@app.on_event("startup")
def on_startup():
    try:
        load_model()
    except Exception as e:
        print(f"[ReactionT5v2] Startup warning (will retry on first request): {e}", file=sys.stderr)

class PredictRequest(BaseModel):
    input: str
    num_beams: Optional[int] = 5
    max_length: Optional[int] = 200
    temperature: Optional[float] = 1.0

class PredictResponse(BaseModel):
    input: str
    raw_output: str
    cleaned_output: str
    predicted_equation: str
    predicted_products: List[str]
    latency_ms: float
    model_name: str
    training_dataset: str
    device: str
    beams_used: int

@app.get("/health")
def health():
    is_ready = model is not None and tokenizer is not None
    return {
        "status": "ready" if is_ready else "not_loaded",
        "model_name": "ReactionT5v2",
        "architecture": "ReactionT5 (T5ForConditionalGeneration)",
        "parameters": "248M",
        "training_dataset": "Open Reaction Database (ORD) & USPTO",
        "vocab_size": len(tokenizer) if tokenizer else 268,
        "device": device,
        "load_time_sec": load_time_sec,
    }

def clean_smiles(raw: str) -> str:
    cleaned = raw.strip().replace(" ", "")
    cleaned = re.sub(r"^(output:|products:|result:)\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\|[^|]*\|", "", cleaned).strip()
    return cleaned

def format_reactiont5_input(query: str) -> str:
    """Format input according to ReactionT5's standard: REACTANT:<reactants>REAGENT:<reagents>"""
    query = query.strip()
    if "REACTANT:" in query:
        return query
    
    if ">" in query:
        parts = query.split(">")
        reactants = parts[0].strip().replace(" ", "")
        reagents = parts[1].strip().replace(" ", "") if len(parts) > 1 else ""
        return f"REACTANT:{reactants}REAGENT:{reagents}"
    
    # Otherwise treat entered chemicals as reactants
    reactants = query.replace(" + ", ".").replace("+", ".").replace(" ", "")
    return f"REACTANT:{reactants}REAGENT:"

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None or tokenizer is None:
        load_model()
        
    t0 = time.time()
    query = req.input.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Input cannot be empty")
        
    formatted_input = format_reactiont5_input(query)
    
    encoded = tokenizer(formatted_input, return_tensors="pt")
    encoded.pop("token_type_ids", None)
    
    input_ids = encoded["input_ids"].to(device)
    attention_mask = encoded.get("attention_mask")
    if attention_mask is not None:
        attention_mask = attention_mask.to(device)
        
    beams = max(1, min(req.num_beams or 5, 8))
    
    with torch.no_grad():
        out = model.generate(
            input_ids=input_ids,
            attention_mask=attention_mask,
            max_length=req.max_length or 200,
            num_beams=beams,
            early_stopping=True,
            do_sample=False
        )
        
    raw_output = tokenizer.decode(out[0], skip_special_tokens=True).strip()
    cleaned = clean_smiles(raw_output)
    
    product_parts = [p.strip() for p in cleaned.split(".") if p.strip()]
    if not product_parts:
        product_parts = [cleaned] if cleaned else ["Unknown Product"]
        
    predicted_equation = f"{query} → {cleaned}" if cleaned else query
    
    latency_ms = round((time.time() - t0) * 1000, 2)
    
    return PredictResponse(
        input=query,
        raw_output=raw_output,
        cleaned_output=cleaned,
        predicted_equation=predicted_equation,
        predicted_products=product_parts,
        latency_ms=latency_ms,
        model_name="ReactionT5v2 (Forward Prediction)",
        training_dataset="Open Reaction Database (ORD) & USPTO",
        device=device,
        beams_used=beams
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", "5005"))
    print(f"Starting ReactionT5v2 Model Server on port {port}...")
    uvicorn.run(app, host="127.0.0.1", port=port)
