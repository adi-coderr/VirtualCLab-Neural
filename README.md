# Virtual Chemistry Laboratory

A scientifically grounded virtual chemistry laboratory where you can select real chemicals, combine them on an interactive lab bench, predict synthesis outcomes using a local **1.8-Million-Reaction Neural ML Model**, and explore a literature database of **2.0 Million historical patent reactions**.

---

## Key Capabilities

1. **Neural ML Reaction Predictor**
   - **Pre-trained Knowledge**: Pre-trained on the **Open Reaction Database (ORD)** and fine-tuned on the USPTO chemical reaction dataset (*Journal of Cheminformatics*, 2025).
   - **Hardware Acceleration**: Automatic Apple Silicon Metal (`mps`) GPU acceleration with CPU fallback, running inference in ~800–1200 ms.
   - **Web Interface**: Integrated **"Reaction ML Model"** tab with quick reaction presets (esterification, halogenation, Diels-Alder, aldol condensation), custom SMILES input, and beam-search controls.

2. **Grounded Chemistry Engine & 3D Lab Bench**:
   - Exact-arithmetic linear algebra equation balancing.
   - Stoichiometry, limiting reagents, calorimetry, and theoretical yields.
   - 2D molecular structures and 3D interactive ball-and-stick visualization.
   - Clear confidence tiers (**SUPPORTED**, **PREDICTED**, **APPROXIMATE**, **UNKNOWN**).

---

## Project Structure

```
VirtualCLab/
├── virtual_chem_lab_modelV2/
├── backend/                # Node.js + Express API, SQLite data layer, & Python ML service
│   ├── src/ai/             # ML inference server (FastAPI) & assistant NLU
│   ├── src/chemistry-engine/ # Deterministic balancing, stoichiometry, thermodynamics
│   ├── src/data/           # SQLite database (chemlab.db)
│   └── src/services/       # Simulation, ML model manager, and assistant services
├── frontend/               # React + TypeScript + Vite web application
│   ├── src/components/ml/  # Neural ML Model Panel
│   ├── src/components/lab/ # Interactive glassware vessels & 3D lab bench
│   └── src/components/results/ # Reaction outcome, equation, & effect panels
├── .venv/                  # Python virtual environment (PyTorch, Transformers, FastAPI)
└── start.sh                # All-in-One startup script
```

---

## Prerequisites

- **Node.js** ≥ 18.18 and **npm** — [Download](https://nodejs.org/)
- **Python** 3.9+ — [Download](https://www.python.org/downloads/)
- A modern browser (Chrome, Firefox, Edge)

---

## First-Time Setup

After cloning the repo, follow these steps **once** to set up your environment:

```bash
# 1. Clone the repository
git clone https://github.com/adi-coderr/VirtualCLab-Neural.git
cd VirtualCLab-Neural

# 2. Install Node.js dependencies (backend + frontend)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Set up the Python virtual environment (for the ML Model)
python3 -m venv .venv
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows
pip install -r requirements.txt

# 4. Configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env to add your AI API keys (optional — you can also enter them in the UI)

# 5. Initialize the database
cd backend && npm run db:reset && cd ..
```

> **Note:** The Neural ML Model weights (~758 MB) are downloaded automatically from HuggingFace on first startup. If you already have a local checkpoint, place it in `virtual_chem_lab_modelV2/model/`.

---

## Quick Start (All-in-One)

Once setup is complete, launch all services with a single command:

```bash
./start.sh
```

This starts:
- **Neural ML Model Service**: `http://127.0.0.1:5005`
- **Backend API Server**: `http://localhost:4000`
- **Frontend Web Application**: `http://localhost:5173`

Open **http://localhost:5173** in your browser to start experimenting!  
*(Press `Ctrl + C` in the terminal to stop all three servers cleanly.)*

---

## Manual Multi-Terminal Startup

If you prefer running services in separate terminal windows to view distinct logs:

### 1. Neural ML Model Server (Python / PyTorch)
```bash
source .venv/bin/activate
python3 backend/src/ai/model_service.py
```
> Running on `http://127.0.0.1:5005` (MPS / CPU hardware acceleration enabled).

### 2. Backend API Server (Node.js / Express)
```bash
cd backend
npm run dev
```
> Running on `http://localhost:4000` (auto-detects and connects to the ML server).

### 3. Frontend Web Application (React / Vite)
```bash
cd frontend
npm run dev
```
> Accessible at `http://localhost:5173`.

---

## Testing the Virtual Lab

### Backend & Chemistry Engine Tests
Over 5,200 unit and integration tests covering the balancing matrix, stoichiometry, reaction pathways, and AI predictors:
```bash
cd backend
npm test
```

### Frontend Component Tests
```bash
cd frontend
npm test
```

### Resetting the Database
To reset the core lab database to its initial clean seeded state:
```bash
cd backend
npm run db:reset
```

---

## How to Use the Neural ML Model on the Webpage

1. **Test the Neural ML Model**:
   - Click the **"Reaction ML Model"** button in the header or the right-side tab.
   - Click any pre-loaded demo (e.g., *Esterification*, *Aromatic Halogenation*, *Diels-Alder*) or enter your own SMILES/reactants.
   - Click **"Predict Reaction Outcome (ML Model)"** to generate the predicted equation and synthesized products.

---

## License & Data Provenance

- **Curated Lab Bench Data**: General chemistry reference knowledge verified by the exact equation balancer.
- **ML Model (ReactionT5v2)**: Pretrained chemical foundation model on the Open Reaction Database (ORD) and USPTO patent literature (*Journal of Cheminformatics*, 2025).

---


