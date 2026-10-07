"""
Virtual ChemLab Local ML Model Inference Service
Loads and serves `virtual_chem_lab_model` (T5-based model trained on 1.8M USPTO chemical reactions).
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
from transformers import PreTrainedTokenizerFast, T5ForConditionalGeneration

MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../virtual_chem_lab_model")
)

# Fallback if relative path shifts
if not os.path.exists(MODEL_DIR):
    candidate = os.path.abspath("virtual_chem_lab_model")
    if os.path.exists(candidate):
        MODEL_DIR = candidate

app = FastAPI(
    title="Virtual ChemLab ML Model Service",
    description="Local inference server for the 1.8M reaction trained neural model",
    version="1.0.0"
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
    print(f"[ML Model] Loading tokenizer and model from {MODEL_DIR}...")
    
    tokenizer_file = os.path.join(MODEL_DIR, "tokenizer.json")
    if not os.path.exists(tokenizer_file):
        raise FileNotFoundError(f"tokenizer.json not found in {MODEL_DIR}")
        
    tokenizer = PreTrainedTokenizerFast(
        tokenizer_file=tokenizer_file,
        eos_token="</s>",
        unk_token="<unk>",
        pad_token="<pad>"
    )
    
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"[ML Model] Using device: {device}")
    
    model = T5ForConditionalGeneration.from_pretrained(MODEL_DIR)
    model.to(device)
    model.eval()
    
    load_time_sec = round(time.time() - t0, 2)
    print(f"[ML Model] Model loaded successfully in {load_time_sec}s! Vocab size: {len(tokenizer)}")

@app.on_event("startup")
def on_startup():
    try:
        load_model()
    except Exception as e:
        print(f"[ML Model] Startup warning: {e}", file=sys.stderr)

class PredictRequest(BaseModel):
    input: str
    num_beams: Optional[int] = 4
    max_length: Optional[int] = 128
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
        "model_name": "virtual_chem_lab_model",
        "architecture": "T5ForConditionalGeneration",
        "parameters": "60.5M",
        "training_dataset": "1.8 Million USPTO Chemical Reactions",
        "vocab_size": len(tokenizer) if tokenizer else 32100,
        "device": device,
        "load_time_sec": load_time_sec,
    }

def clean_smiles(raw: str) -> str:
    # Remove extra spaces, clean up duplicate tokens
    cleaned = raw.strip()
    # Strip potential prefix markers
    cleaned = re.sub(r"^(output:|products:|result:)\s*", "", cleaned, flags=re.IGNORECASE)
    # Strip CXSMILES annotations like |f:0.1|
    cleaned = re.sub(r"\|[^|]*\|", "", cleaned).strip()
    return cleaned

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None or tokenizer is None:
        load_model()
        
    t0 = time.time()
    query = req.input.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Input cannot be empty")
        
    # Prepare tokenization
    encoded = tokenizer(query, return_tensors="pt")
    encoded.pop("token_type_ids", None)
    
    # Move to target device
    input_ids = encoded["input_ids"].to(device)
    attention_mask = encoded.get("attention_mask")
    if attention_mask is not None:
        attention_mask = attention_mask.to(device)
        
    beams = max(1, min(req.num_beams or 4, 8))
    
    with torch.no_grad():
        out = model.generate(
            input_ids=input_ids,
            attention_mask=attention_mask,
            max_length=req.max_length or 128,
            num_beams=beams,
            early_stopping=True,
            do_sample=False
        )
        
    raw_output = tokenizer.decode(out[0], skip_special_tokens=True).strip()
    cleaned = clean_smiles(raw_output)
    
    # Parse into discrete product species separated by '.' in SMILES
    product_parts = [p.strip() for p in cleaned.split(".") if p.strip()]
    if not product_parts:
        product_parts = [cleaned] if cleaned else ["Unknown Product"]
        
    # Formulate predicted reaction equation
    predicted_equation = f"{query} → {cleaned}" if cleaned else query
    
    latency_ms = round((time.time() - t0) * 1000, 2)
    
    return PredictResponse(
        input=query,
        raw_output=raw_output,
        cleaned_output=cleaned,
        predicted_equation=predicted_equation,
        predicted_products=product_parts,
        latency_ms=latency_ms,
        model_name="virtual_chem_lab_model (T5 Seq2Seq)",
        training_dataset="1.8 Million USPTO Chemical Reactions",
        device=device,
        beams_used=beams
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", "5005"))
    print(f"Starting ML Model Server on port {port}...")
    uvicorn.run(app, host="127.0.0.1", port=port)
