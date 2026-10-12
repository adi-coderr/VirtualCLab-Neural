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
    num_beams: Optional[int] = 2
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

class PredictBatchRequest(BaseModel):
    inputs: List[str]
    num_beams: Optional[int] = 1
    max_length: Optional[int] = 200
    batch_size: Optional[int] = 32

class PredictBatchResponse(BaseModel):
    results: List[PredictResponse]
    total_latency_ms: float
    average_latency_ms: float

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

import sqlite3

COMMON_NAME_TO_SMILES = {
    # Hydrocarbons & alkynes / alkenes / alkanes
    "c4h6": "C=CC=C",
    "1,3-butadiene": "C=CC=C",
    "butadiene": "C=CC=C",
    "c2h2": "C#C",
    "acetylene": "C#C",
    "ethyne": "C#C",
    "c2h4": "C=C",
    "ethylene": "C=C",
    "ethene": "C=C",
    "c2h6": "CC",
    "ethane": "CC",
    "c3h8": "CCC",
    "propane": "CCC",
    "c3h6": "C=CC",
    "propene": "C=CC",
    "propylene": "C=CC",
    "c4h10": "CCCC",
    "butane": "CCCC",
    "c4h8": "CCC=C",
    "butene": "CCC=C",
    "c5h12": "CCCCC",
    "pentane": "CCCCC",
    "ch4": "C",
    "methane": "C",
    "cyclopentadiene": "C1=CCC=C1",
    "c5h6": "C1=CCC=C1",
    "cyclohexadiene": "C1=CC=CCC1",
    "1,3-cyclohexadiene": "C1=CC=CCC1",
    "1,4-cyclohexadiene": "C1=CCC=CC1",
    # Aromatics
    "benzene": "c1ccccc1",
    "c6h6": "c1ccccc1",
    "toluene": "Cc1ccccc1",
    "c7h8": "Cc1ccccc1",
    "bromobenzene": "Brc1ccccc1",
    "c6h5br": "Brc1ccccc1",
    "chlorobenzene": "Clc1ccccc1",
    "c6h5cl": "Clc1ccccc1",
    "iodobenzene": "Ic1ccccc1",
    "aniline": "c1ccccc1N",
    "phenol": "c1ccccc1O",
    "nitrobenzene": "O=[N+]([O-])c1ccccc1",
    "benzaldehyde": "c1ccccc1C=O",
    "benzoic acid": "c1ccccc1C(=O)O",
    "acetophenone": "CC(=O)c1ccccc1",
    "phenylboronic acid": "OB(O)c1ccccc1",
    "4-bromotoluene": "Cc1ccc(Br)cc1",
    "benzonitrile": "c1ccccc1C#N",
    # Alcohols, ethers & carbonyls
    "methanol": "CO",
    "ch3oh": "CO",
    "ch4o": "CO",
    "ethanol": "CCO",
    "c2h5oh": "CCO",
    "c2h6o": "CCO",
    "acetone": "CC(=O)C",
    "ch3coch3": "CC(=O)C",
    "c3h6o": "CC(=O)C",
    "acetic acid": "CC(=O)O",
    "ch3cooh": "CC(=O)O",
    "c2h4o2": "CC(=O)O",
    "formic acid": "O=CO",
    "hcooh": "O=CO",
    "formaldehyde": "C=O",
    "hcho": "C=O",
    "ch2o": "C=O",
    "acetaldehyde": "CC=O",
    "ch3cho": "CC=O",
    "acetyl chloride": "CC(=O)Cl",
    "ethyl acetate": "CCOC(=O)C",
    "diethyl ether": "CCOCC",
    "morpholine": "C1COCCN1",
    "methyl acrylate": "C=CC(=O)OC",
    "maleic anhydride": "O=C1OC(=O)C=C1",
    # Halides, inorganics & elements
    "chlorine": "ClCl",
    "cl2": "ClCl",
    "bromine": "BrBr",
    "br2": "BrBr",
    "iodine": "II",
    "i2": "II",
    "fluorine": "FF",
    "f2": "FF",
    "water": "O",
    "h2o": "O",
    "hydrogen peroxide": "OO",
    "h2o2": "OO",
    "carbon dioxide": "O=C=O",
    "co2": "O=C=O",
    "carbon monoxide": "[C]=O",
    "co": "[C]=O",
    "ammonia": "N",
    "nh3": "N",
    "hydrogen": "[H][H]",
    "h2": "[H][H]",
    "oxygen": "O=O",
    "o2": "O=O",
    "nitrogen": "N#N",
    "n2": "N#N",
    "ozone": "O=[O+][O-]",
    "o3": "O=[O+][O-]",
    # Pure metals & elements
    "fe": "[Fe]", "iron": "[Fe]",
    "cu": "[Cu]", "copper": "[Cu]",
    "zn": "[Zn]", "zinc": "[Zn]",
    "mg": "[Mg]", "magnesium": "[Mg]",
    "al": "[Al]", "aluminium": "[Al]", "aluminum": "[Al]",
    "ca": "[Ca]", "calcium": "[Ca]",
    "na": "[Na]", "sodium": "[Na]",
    "k": "[K]", "potassium": "[K]",
    "li": "[Li]", "lithium": "[Li]",
    "ag": "[Ag]", "silver": "[Ag]",
    "au": "[Au]", "gold": "[Au]",
    "pb": "[Pb]", "lead": "[Pb]",
    "sn": "[Sn]", "tin": "[Sn]",
    "ni": "[Ni]", "nickel": "[Ni]",
    "co": "[Co]", "cobalt": "[Co]",
    "mn": "[Mn]", "manganese": "[Mn]",
    "cr": "[Cr]", "chromium": "[Cr]",
    "ti": "[Ti]", "titanium": "[Ti]",
    "pt": "[Pt]", "platinum": "[Pt]",
    "pd": "[Pd]", "palladium": "[Pd]",
    "ba": "[Ba]", "barium": "[Ba]",
    "sr": "[Sr]", "strontium": "[Sr]",
    "b": "[B]", "boron": "[B]",
    "c": "[C]", "carbon": "[C]",
    "s": "[S]", "sulfur": "[S]",
    "p": "[P]", "phosphorus": "[P]",
    "si": "[Si]", "silicon": "[Si]",
    # Common acids & bases
    "hcl": "Cl", "hydrochloric acid": "Cl",
    "hbr": "Br", "hydrobromic acid": "Br",
    "hi": "I", "hydroiodic acid": "I",
    "hf": "F", "hydrofluoric acid": "F",
    "naoh": "[Na+].[OH-]", "sodium hydroxide": "[Na+].[OH-]",
    "koh": "[K+].[OH-]", "potassium hydroxide": "[K+].[OH-]",
    "h2so4": "OS(=O)(=O)O", "sulfuric acid": "OS(=O)(=O)O",
    "hno3": "O[N+](=O)[O-]", "nitric acid": "O[N+](=O)[O-]",
    "h3po4": "OP(=O)(O)O", "phosphoric acid": "OP(=O)(O)O",
    # Common salts
    "nacl": "[Na+].[Cl-]", "sodium chloride": "[Na+].[Cl-]",
    "kcl": "[K+].[Cl-]", "potassium chloride": "[K+].[Cl-]",
    "na2co3": "[Na+].[Na+].[O-]C(=O)[O-]", "sodium carbonate": "[Na+].[Na+].[O-]C(=O)[O-]",
    "nahco3": "[Na+].OC(=O)[O-]", "sodium bicarbonate": "[Na+].OC(=O)[O-]",
    "caco3": "[Ca+2].[O-]C(=O)[O-]", "calcium carbonate": "[Ca+2].[O-]C(=O)[O-]",
    "agcl": "[Ag+].[Cl-]", "silver chloride": "[Ag+].[Cl-]",
    "agno3": "[Ag+].[O-][N+](=O)[O-]", "silver nitrate": "[Ag+].[O-][N+](=O)[O-]",
    "cuso4": "[Cu+2].[O-]S(=O)(=O)[O-]", "copper sulfate": "[Cu+2].[O-]S(=O)(=O)[O-]",
    "znso4": "[Zn+2].[O-]S(=O)(=O)[O-]", "zinc sulfate": "[Zn+2].[O-]S(=O)(=O)[O-]",
    "feso4": "[Fe+2].[O-]S(=O)(=O)[O-]", "iron sulfate": "[Fe+2].[O-]S(=O)(=O)[O-]",
    "cacl2": "[Ca+2].[Cl-].[Cl-]", "calcium chloride": "[Ca+2].[Cl-].[Cl-]",
    "mgcl2": "[Mg+2].[Cl-].[Cl-]", "magnesium chloride": "[Mg+2].[Cl-].[Cl-]",
    "alcl3": "[Al+3].[Cl-].[Cl-].[Cl-]", "aluminum chloride": "[Al+3].[Cl-].[Cl-].[Cl-]",
    "cuo": "[Cu+2].[O-2]", "copper oxide": "[Cu+2].[O-2]",
    "zno": "[Zn+2].[O-2]", "zinc oxide": "[Zn+2].[O-2]",
    "mgo": "[Mg+2].[O-2]", "magnesium oxide": "[Mg+2].[O-2]",
    "cao": "[Ca+2].[O-2]", "calcium oxide": "[Ca+2].[O-2]",
    "feo": "[Fe+2].[O-2]", "iron(ii) oxide": "[Fe+2].[O-2]",
    "fe2o3": "[Fe+3].[Fe+3].[O-2].[O-2].[O-2]", "iron(iii) oxide": "[Fe+3].[Fe+3].[O-2].[O-2].[O-2]",
}

CHEMLAB_DB_SMILES = {}

def load_chemlab_db():
    global CHEMLAB_DB_SMILES
    db_candidates = [
        os.path.join(PROJECT_ROOT, "backend", "data", "chemlab.db"),
        os.path.join(PROJECT_ROOT, "data", "chemlab.db"),
    ]
    for db_path in db_candidates:
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                c.execute("SELECT id, formula, common_name, smiles FROM chemicals WHERE smiles IS NOT NULL")
                count = 0
                for cid, form, cname, sm in c.fetchall():
                    if sm:
                        s_clean = sm.strip()
                        # Reject entries whose common_name is like '( b )', '( k )', '( 83 )'
                        if cname and re.match(r"^\(\s*[a-zA-Z0-9_-]+\s*\)$", cname.strip()):
                            continue
                        # If chemical id is in COMMON_NAME_TO_SMILES, never overwrite with DB entry
                        if cid:
                            cid_clean = cid.lower().strip()
                            if cid_clean not in COMMON_NAME_TO_SMILES:
                                CHEMLAB_DB_SMILES[cid_clean] = s_clean
                        if form:
                            form_clean = form.lower().strip()
                            if form_clean not in COMMON_NAME_TO_SMILES:
                                CHEMLAB_DB_SMILES[form_clean] = s_clean
                        if cname:
                            cname_clean = cname.lower().strip()
                            if cname_clean not in COMMON_NAME_TO_SMILES:
                                CHEMLAB_DB_SMILES[cname_clean] = s_clean
                        count += 1
                conn.close()
                print(f"[ReactionT5v2] Successfully loaded {count} chemicals ({len(CHEMLAB_DB_SMILES)} aliases) from {db_path}!")
                break
            except Exception as e:
                print(f"[ReactionT5v2] Warning: Could not read chemicals from {db_path}: {e}")

load_chemlab_db()

def resolve_single_species_to_smiles(token: str) -> str:
    clean = token.strip()
    if not clean:
        return ""
    lower = clean.lower()
    
    # 1. Exact match in built-in dictionary
    if lower in COMMON_NAME_TO_SMILES:
        return COMMON_NAME_TO_SMILES[lower]
        
    # 2. Match in chemlab.db
    if lower in CHEMLAB_DB_SMILES:
        return CHEMLAB_DB_SMILES[lower]
        
    # 3. Already valid aromatic or standard SMILES
    if any(c in clean for c in ["=", "#", "(", ")", "[", "]", ":"]) or clean.islower():
        # Likely already a SMILES string
        return clean.replace("BrC1=CC=CC=C1", "Brc1ccccc1").replace("C1=CC=CC=C1", "c1ccccc1")
        
    return clean

def split_bracket_safe(text: str, delimiters: str = "+>,"):
    """Splits a chemical string by delimiter characters only when NOT inside square brackets [...]"""
    tokens = []
    current = []
    in_bracket = False
    for char in text:
        if char == '[':
            in_bracket = True
            current.append(char)
        elif char == ']':
            in_bracket = False
            current.append(char)
        elif not in_bracket and char in delimiters:
            tok = "".join(current).strip()
            if tok:
                tokens.append(tok)
            current = []
        else:
            current.append(char)
    tok = "".join(current).strip()
    if tok:
        tokens.append(tok)
    return tokens

def resolve_names_to_smiles(query: str) -> str:
    """Translate chemical names and formulas in user inputs to valid canonical SMILES without breaking bracketed charges."""
    tokens = []
    current = []
    in_bracket = False
    for char in query:
        if char == '[':
            in_bracket = True
            current.append(char)
        elif char == ']':
            in_bracket = False
            current.append(char)
        elif not in_bracket and char in ['+', '>', ',']:
            if current:
                tokens.append("".join(current))
                current = []
            tokens.append(char)
        else:
            current.append(char)
    if current:
        tokens.append("".join(current))
        
    resolved = []
    for t in tokens:
        if t in ['+', '>', ',']:
            resolved.append(f" {t} ")
        else:
            resolved.append(resolve_single_species_to_smiles(t))
    return "".join(resolved)

KNOWN_REAGENT_SMILES = {
    # Carbonates, hydroxides & inorganic bases
    "c([o-])([o-])=o.[k+].[k+]", "[k+].[k+].[o-]c(=o)[o-]", "k2co3",
    "c([o-])([o-])=o.[na+].[na+]", "[na+].[na+].[o-]c(=o)[o-]", "na2co3",
    "[na+].[oh-]", "naoh", "[k+].[oh-]", "koh",
    "[na+].oc(=o)[o-]", "nahco3", "[k+].oc(=o)[o-]", "khco3",
    "[ca+2].[o-]c(=o)[o-]", "caco3",
    "[na+].[h-]", "[h-].[na+]", "nah",
    # Halide salts
    "[cl-].[nh4+]", "[nh4+].[cl-]", "nh4cl",
    "[na+].[cl-]", "nacl", "[k+].[cl-]", "kcl",
    "[na+].[i-]", "[i-].[na+]", "nai",
    "[k+].[i-]", "[i-].[k+]", "ki",
    "[na+].[br-]", "[br-].[na+]", "nabr",
    "[k+].[br-]", "[br-].[k+]", "kbr",
    # Inorganic acids
    "cl", "hcl", "br", "hbr", "i", "hi", "f", "hf",
    "os(=o)(=o)o", "h2so4", "o[n+](=o)[o-]", "hno3",
    "op(=o)(o)o", "h3po4",
    # Organic bases & amine reagents
    "ccn(cc)cc", "c6h15n", "et3n", "triethylamine",
    "c1ccncc1", "c5h5n", "pyridine",
    "c1cc[nh+]cc1", "c1cnccn1", "imidazole",
    # Hydrides & reductants
    "[bh4-].[na+]", "[na+].[bh4-]", "nabh4",
    "[al+3].[h-].[h-].[h-].[h-].[li+]", "lialh4",
    "[h][h]", "h2",
    # Activating agents & catalysts
    "o=s(cl)cl", "cl2os", "socl2",
    "o=c(cl)c(=o)cl", "c2cl2o2",
    # Solvents & workup
    "o", "water", "h2o", "c(f)(f)(f)c(=o)o", "tfa",
}

def is_species_reagent(token: str) -> bool:
    clean = token.strip().lower()
    if clean in KNOWN_REAGENT_SMILES:
        return True
    if re.match(r"^\[([a-z][a-z]?[\+\-0-9]*)\](\.\[([a-z][a-z]?[\+\-0-9]*)\])*$", clean):
        return True
    return False

def format_reactiont5_input(query: str) -> str:
    """Format input according to ReactionT5's standard: REACTANT:<reactants>REAGENT:<reagents>"""
    query = resolve_names_to_smiles(query.strip())
    if "REACTANT:" in query:
        return query
    
    if ">" in query:
        parts = query.split(">")
        reactants = parts[0].strip().replace(" ", "")
        reagents = parts[1].strip().replace(" ", "") if len(parts) > 1 else ""
        return f"REACTANT:{reactants}REAGENT:{reagents}"
    
    # Bracket-safe split by reaction delimiters
    tokens = split_bracket_safe(query, delimiters="+>,")
    if len(tokens) == 1 and "." in tokens[0] and not ("[" in tokens[0] and "]" in tokens[0]):
        tokens = [t.strip() for t in tokens[0].split(".") if t.strip()]

    reactants = []
    reagents = []
    for t in tokens:
        clean = t.strip().replace(" ", "")
        if is_species_reagent(clean):
            reagents.append(clean)
        else:
            reactants.append(clean)
            
    # If all tokens were deemed reagents, keep them as reactants
    if not reactants and reagents:
        reactants = reagents
        reagents = []
        
    r_str = ".".join(reactants)
    reg_str = ".".join(reagents)
    return f"REACTANT:{r_str}REAGENT:{reg_str}"

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
    print(f"[ReactionT5v2] Input: {query!r} -> Formatted: {formatted_input!r} -> Output: {cleaned!r} ({latency_ms}ms)", flush=True)
    
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

@app.post("/predict_batch", response_model=PredictBatchResponse)
def predict_batch(req: PredictBatchRequest):
    if model is None or tokenizer is None:
        load_model()
        
    t0 = time.time()
    inputs = req.inputs
    if not inputs:
        return PredictBatchResponse(results=[], total_latency_ms=0.0, average_latency_ms=0.0)
        
    beams = max(1, min(req.num_beams or 1, 4))
    max_len = req.max_length or 200
    chunk_size = max(1, min(req.batch_size or 32, 64))
    
    formatted_inputs = [format_reactiont5_input(q) for q in inputs]
    results: List[PredictResponse] = []
    
    for i in range(0, len(formatted_inputs), chunk_size):
        chunk_inputs = formatted_inputs[i:i + chunk_size]
        chunk_raw = inputs[i:i + chunk_size]
        
        encoded = tokenizer(chunk_inputs, return_tensors="pt", padding=True, truncation=True)
        encoded.pop("token_type_ids", None)
        
        input_ids = encoded["input_ids"].to(device)
        attention_mask = encoded.get("attention_mask")
        if attention_mask is not None:
            attention_mask = attention_mask.to(device)
            
        with torch.no_grad():
            outs = model.generate(
                input_ids=input_ids,
                attention_mask=attention_mask,
                max_length=max_len,
                num_beams=beams,
                early_stopping=True,
                do_sample=False
            )
            
        decoded = [tokenizer.decode(g, skip_special_tokens=True).strip() for g in outs]
        
        for q_orig, raw_out in zip(chunk_raw, decoded):
            cleaned = clean_smiles(raw_out)
            product_parts = [p.strip() for p in cleaned.split(".") if p.strip()]
            if not product_parts:
                product_parts = [cleaned] if cleaned else ["Unknown Product"]
            predicted_equation = f"{q_orig} → {cleaned}" if cleaned else q_orig
            results.append(PredictResponse(
                input=q_orig,
                raw_output=raw_out,
                cleaned_output=cleaned,
                predicted_equation=predicted_equation,
                predicted_products=product_parts,
                latency_ms=0.0,
                model_name="ReactionT5v2 (Forward Prediction)",
                training_dataset="Open Reaction Database (ORD) & USPTO",
                device=device,
                beams_used=beams
            ))
            
    total_ms = round((time.time() - t0) * 1000, 2)
    avg_ms = round(total_ms / max(1, len(results)), 2)
    for r in results:
        r.latency_ms = avg_ms
        
    print(f"[ReactionT5v2] Processed batch of {len(inputs)} reactions in {total_ms}ms ({avg_ms}ms/rxn)", flush=True)
    return PredictBatchResponse(results=results, total_latency_ms=total_ms, average_latency_ms=avg_ms)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", "5005"))
    print(f"Starting ReactionT5v2 Model Server on port {port}...")
    uvicorn.run(app, host="127.0.0.1", port=port)
