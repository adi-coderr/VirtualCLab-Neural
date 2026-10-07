# Virtual Chemistry Laboratory

A scientifically grounded virtual chemistry laboratory where you can select real chemicals, combine them on an interactive lab bench, predict synthesis outcomes using a local **1.8-Million-Reaction Neural ML Model**, and explore a literature database of **2.0 Million historical patent reactions**.

---

## 🌟 Key Capabilities

1. **🧠 Neural ML Reaction Predictor (`virtual_chem_lab_model`)**:
   - **Architecture**: Hugging Face / PyTorch `T5ForConditionalGeneration` (T5-small Seq2Seq, 60.5M parameters).
   - **Pre-trained Knowledge**: **1.8 Million chemical reactions** from the USPTO patent corpus for forward reaction prediction and synthesis.
   - **Hardware Acceleration**: Automatic Apple Silicon Metal (`mps`) GPU acceleration with CPU fallback, running inference in ~900 ms.
   - **Web Interface**: Integrated **"🧠 1.8M ML Model"** tab with quick reaction presets (esterification, halogenation, Diels-Alder, aldol condensation), custom SMILES input, and beam-search controls.

2. **📚 2.0 Million Chemical Reactions Patent Database (`ChemRxn`)**:
   - **Scope**: Complete 41-year experimental patent dataset (**1976–2016**) across **2,460 XML archive volumes**.
   - **Fast Search Cache**: Over **35,496 pre-indexed reaction records** in SQLite with real-time FTS5 full-text search, expandable to the full 2M dataset.
   - **Rich Explorer**: Accessible via the **"📚 2M Reactions DB"** button in the header with filters for Era, Yield (≥50%, ≥75%, ≥90%), and Phase/State, complete with original patent laboratory procedures.
   - **Cross-Integration**: 1-click **"🧠 Test in ML Model"** and **"🧪 Lab Bench"** buttons to compare neural predictions with historical literature outcomes.

3. **⚗️ Grounded Chemistry Engine & 3D Lab Bench**:
   - Exact-arithmetic linear algebra equation balancing.
   - Stoichiometry, limiting reagents, calorimetry, and theoretical yields.
   - 2D molecular structures and 3D interactive ball-and-stick visualization.
   - Clear confidence tiers (**SUPPORTED**, **PREDICTED**, **APPROXIMATE**, **UNKNOWN**).

---

## 📁 Project Structure

```
VirtualCLab/
├── virtual_chem_lab_model/ # 1.8M reaction T5 neural model weights & tokenizer
├── ChemRxn/                # 2.0M reactions USPTO patent dataset (1976–2016 XML archives)
├── backend/                # Node.js + Express API, SQLite data layer, & Python ML service
│   ├── src/ai/             # ML inference server (FastAPI) & assistant NLU
│   ├── src/chemistry-engine/ # Deterministic balancing, stoichiometry, thermodynamics
│   ├── src/data/           # SQLite databases (chemlab.db & chemrxn.db)
│   └── src/services/       # Simulation, ML model manager, and ChemRxn search services
├── frontend/               # React + TypeScript + Vite web application
│   ├── src/components/ml/  # 1.8M Neural ML Model Panel
│   ├── src/components/database/ # 2M Patent Reactions Database Explorer
│   ├── src/components/lab/ # Interactive glassware vessels & 3D lab bench
│   └── src/components/results/ # Reaction outcome, equation, & effect panels
├── .venv/                  # Python virtual environment (PyTorch, Transformers, FastAPI)
└── start.sh                # All-in-one startup script
```

---

## 🚀 Quick Start (All-in-One)

You can launch all services (Python ML model, Node.js backend, and React frontend) with a single command:

```bash
cd "/Users/adi/Documents/Github Projects/VirtualCLab"
./start.sh
```

This starts:
- 🧠 **Neural ML Model Service**: `http://127.0.0.1:5005`
- ⚙️ **Backend API Server**: `http://localhost:4000`
- 💻 **Frontend Web Application**: `http://localhost:5173`

Open **http://localhost:5173** in your browser to start experimenting!  
*(Press `Ctrl + C` in the terminal to stop all three servers cleanly.)*

---

## 🛠️ Manual Multi-Terminal Startup

If you prefer running services in separate terminal windows to view distinct logs:

### 1. Neural ML Model Server (Python / PyTorch)
```bash
cd "/Users/adi/Documents/Github Projects/VirtualCLab"
.venv/bin/python3 backend/src/ai/model_service.py
```
> Running on `http://127.0.0.1:5005` (MPS / CPU hardware acceleration enabled).

### 2. Backend API Server (Node.js / Express)
```bash
cd "/Users/adi/Documents/Github Projects/VirtualCLab/backend"
npm install
npm run dev
```
> Running on `http://localhost:4000` (auto-detects and connects to the ML server).

### 3. Frontend Web Application (React / Vite)
```bash
cd "/Users/adi/Documents/Github Projects/VirtualCLab/frontend"
npm install
npm run dev
```
> Accessible at `http://localhost:5173`.

---

## 🧪 Testing the Virtual Lab

### Backend & Chemistry Engine Tests
Over 5,200 unit and integration tests covering the balancing matrix, stoichiometry, ChemRxn patent searches, and AI predictors:
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

## 📖 Unified Reaction Simulation Flow

Whenever you mix chemicals in a virtual vessel and click **React**:
1. **Core Science Engine**: Computes exact stoichiometric conservation, limiting reagent, calorimetry, state changes, color shifts, and pH.
2. **2.0M Patent Literature Match (`ChemRxn`)**: Instantly searches the USPTO patent database for verified real-world laboratory protocols, isolated yields, physical states, and Google Patents citations.
3. **1.8M Neural ML Model Analysis (`virtual_chem_lab_model`)**: Evaluates the transformation using PyTorch on Apple Silicon GPU (`mps`), deriving molecular formulas, molar mass, estimated STP physical states, visual appearance, and detected functional groups.

All three layers render simultaneously inside the **Result** panel without requiring extra clicks.

---

## 📚 Technical Documentation (`docs/`)

* **[ML Model & 2.0M ChemRxn Guide](docs/ML_MODEL_AND_CHEMRXN.md)** — Architecture, PyTorch serving, FastAPI inference endpoints, and hardware acceleration.
* **[Architecture Overview](docs/ARCHITECTURE.md)** — System layering, simulation request lifecycles, and state management.
* **[API Reference](docs/API.md)** — Complete REST endpoints and request/response specifications.
* **[Chemistry Engine Guide](docs/CHEMISTRY_ENGINE.md)** — Balance algorithms, stoichiometry, and rule systems.
* **[Adding Chemicals & Reactions](docs/ADDING_NEW_REACTIONS.md)** — Walkthrough for extending curated data and ML predictions.
* **[Database Schema](docs/DATABASE_SCHEMA.md)** — SQLite relational structures and indexes.

---

## 📄 License & Data Provenance

- **Curated Lab Bench Data**: General chemistry reference knowledge verified by the exact equation balancer.
- **ChemRxn Dataset**: Curated from public United States Patent and Trademark Office (USPTO) experimental chemical reaction archives (1976–2016).
- **ML Model**: Pretrained transformer Seq2Seq architecture on 1.8 million USPTO chemical reaction transformations.
