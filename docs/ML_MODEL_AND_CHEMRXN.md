# 🧠 1.8M Neural ML Model & 2.0M ChemRxn Database Guide

This document details how the **PyTorch Neural ML Model** (`virtual_chem_lab_model`) and the **2.0M Patent Literature Database** (`ChemRxn`) are integrated, served, and utilized within the Virtual Chemistry Laboratory.

---

## 1. Overview & Architecture

The Virtual Chemistry Laboratory employs a **3-tier hybrid reaction simulation pipeline**:

```
                         Reactants Mixed on Bench
                                    │
                         POST /api/reactions/simulate
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────────┐    ┌──────────────────────┐    ┌───────────────────────────┐
│  Tier 1: Core    │    │  Tier 2: 2.0M Patent │    │  Tier 3: 1.8M Neural ML   │
│ Chemistry Engine │    │ Literature (ChemRxn) │    │  Model (T5 Seq2Seq)       │
│                  │    │                      │    │                           │
│ • Deterministic  │    │ • Daniel Lowe USPTO  │    │ • PyTorch on Apple Metal  │
│ • Stoichiometry  │    │   1976-2016 Archive  │    │   GPU (MPS) / CUDA / CPU  │
│ • Calorimetry    │    │ • Fast SQLite (FTS5) │    │ • Functional Group Detect │
│ • State & pH     │    │ • Real lab protocols │    │ • Molar Mass & Appearance │
└────────┬─────────┘    └──────────┬───────────┘    └─────────────┬─────────────┘
         │                         │                              │
         └─────────────────────────┼──────────────────────────────┘
                                   ▼
                Unified Reaction Result in Web UI
```

1. **Grounded Science Engine**: Computes exact balancing, stoichiometry, limiting reagent, calorimetry, and pH.
2. **Literature Reference (ChemRxn)**: Pulls verbatim laboratory synthesis procedures, verified yields, physical appearances, and Google Patent citations.
3. **Neural ML Model (`virtual_chem_lab_model`)**: Predicts complex organic transformations, estimated physical states, and molecular properties using sequence-to-sequence neural inference.

---

## 2. The Neural Model Folder (`virtual_chem_lab_model`)

### Model Specifications
* **Architecture**: `T5ForConditionalGeneration` (Sequence-to-Sequence Transformer)
* **Parameter Count**: ~60.5 Million parameters
* **Vocabulary Size**: 32,100 tokens
* **Training Dataset**: 1.8 Million USPTO chemical reaction schemes
* **Default Checkpoint Folder**: `virtual_chem_lab_model/` (in the project root)

### Expected Files in `virtual_chem_lab_model/`
A standard Hugging Face model directory containing:
```
virtual_chem_lab_model/
├── config.json                 # Model architecture parameters
├── generation_config.json      # Default beam search & decoding settings
├── model.safetensors           # Neural network weights (or pytorch_model.bin)
├── tokenizer.json              # Tokenizer vocabulary and BPE merges
├── tokenizer_config.json       # Special token mappings
└── special_tokens_map.json     # </s>, <unk>, <pad> tokens
```

---

## 3. Python Inference Server (`backend/src/ai/model_service.py`)

The ML model is served via a dedicated local FastAPI service on port `5005`:

### Hardware Acceleration
* **Apple Silicon (Mac M1/M2/M3/M4)**: Automatically uses Metal Performance Shaders (`mps`), giving ~500–600 ms latency.
* **NVIDIA GPU**: Automatically uses `cuda` if available.
* **CPU**: Multi-threaded fallback for standard architectures.

### Starting the Server
#### Automatic (via `./start.sh`):
The all-in-one startup script boots the Python ML service, Express API, and Vite web app concurrently:
```bash
./start.sh
```

#### Manual / Standalone:
```bash
# Activate virtual environment
source .venv/bin/activate

# Launch the FastAPI service
python3 backend/src/ai/model_service.py
```
> Running on: `http://127.0.0.1:5005`

### Direct API Testing
Check model health and hardware:
```bash
curl http://127.0.0.1:5005/health
```

Run an inference prediction directly:
```bash
curl -X POST http://127.0.0.1:5005/predict \
  -H "Content-Type: application/json" \
  -d '{"input": "CC(=O)O.CCO", "num_beams": 3, "max_length": 128}'
```

---

## 4. Backend Node.js Service Integration

The Express backend connects to the Python ML server via `backend/src/services/localMlModelService.ts`.

### Lifecycle Management
* **Auto-Launch**: If the Python service is offline when a reaction is triggered, the backend automatically spawns `backend/src/ai/model_service.py` using `.venv/bin/python3`.
* **Health Checks**: Probes `http://127.0.0.1:5005/health` with a non-blocking timeout.
* **Express Endpoints**:
  * `GET  /api/reactions/model-status` — Checks if the neural model is ready.
  * `POST /api/reactions/model-start`  — Spawns or restarts the Python process.
  * `POST /api/reactions/model-predict` — Runs a direct standalone query through the backend.

### Real-World Molecular Property Enrichment
Predictions returned from the neural network are analyzed in `backend/src/chemistry-engine/molecularAnalysis.ts`:
* **Chemical Identification**: Resolves IUPAC/common names and Hill formulas.
* **Calculated Molar Mass**: Computes exact molar weight in $g/\text{mol}$.
* **Physical State Prediction**: Estimates whether products are liquid, crystalline solid, gas, or precipitate at STP.
* **Visual Appearance & Odor**: Inferred sensory properties (e.g. "Colorless liquid with sweet fruity aroma").
* **Functional Group Detection**: Identifies Esters, Carboxylic Acids, Alcohols, Amines, Amides, Carbonyls, Halides, and Aromatic rings.
* **Mechanism Classification**: Classifies reaction types (e.g. *Fischer Esterification*, *Acid-Base Neutralization*, *Nucleophilic Substitution*).
* **Theoretical Atom Economy**: Computes atom economy percentage ($\text{Atom Economy } \%$).

---

## 5. The 2.0M Patent Database (`ChemRxn`)

### Dataset Origins
Created by Daniel Lowe from USPTO patent grants (1976–2016), containing ~2,000,000 organic chemical reactions.

### Local SQLite Storage (`backend/data/chemrxn.db`)
Rather than parsing 14 GB of XML files in real time, representative reactions across all 40+ years are pre-indexed into a fast local SQLite database (~209 MB):
* **FTS5 Full-Text Search**: Instant search by reactant name, product name, or procedural keyword.
* **Sub-Millisecond Query Latency**: Typically **0.3 to 1.0 ms** per query.
* **Low Memory Footprint**: Uses ~20–30 MB of RAM via `better-sqlite3`.

### Extracted Real-Life Laboratory Data
* **Starting Materials**: Names, CAS/formulas, SMILES, and recorded lab amounts (e.g., `75.3 g`, `0.5 mol`, `18 mL`).
* **Isolated Products**: Name, SMILES, isolated mass, physical state (crystalline, solid, oil), visual color/appearance.
* **Verified Yields**: Quantitative yield percentages and text from patent literature.
* **Step-by-Step Laboratory Procedure**: Numbered experimental steps (e.g., *1. Dissolve*, *2. Add*, *3. Reflux for 5 hours*, *4. Evaporate in vacuo*).
* **Clickable Google Patent Citations**: Direct links to `https://patents.google.com/patent/{documentId}/en`.

---

## 6. Using Custom ML Models or Fine-Tuning

To use a custom model or newer fine-tuned checkpoint:
1. Replace or export the model weights into `virtual_chem_lab_model/`.
2. Ensure `tokenizer.json` and `config.json` match the new model architecture.
3. Restart the Python server:
   ```bash
   curl -X POST http://localhost:4000/api/reactions/model-start
   ```
4. Test predictions in the UI bench by mixing reactants and clicking **React**.
