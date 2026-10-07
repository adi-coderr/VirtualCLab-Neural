#!/usr/bin/env bash
# ==============================================================================
# Virtual Chemistry Laboratory — All-in-One Startup Script
# Boots up:
#   1. Local Neural ML Model Server (Python PyTorch / MPS) on port 5005
#   2. Express Backend API on port 4000
#   3. React / Vite Frontend on port 5173
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================================="
echo "🧪 Starting Virtual Chemistry Laboratory Stack..."
echo "=========================================================="

# 1. Start Neural ML Model Service
echo "🧠 [1/3] Launching 1.8M Neural ML Model Service (port 5005)..."
if [ -f "$PROJECT_ROOT/.venv/bin/python3" ]; then
  PYTHON_BIN="$PROJECT_ROOT/.venv/bin/python3"
else
  PYTHON_BIN="python3"
fi

$PYTHON_BIN "$PROJECT_ROOT/backend/src/ai/model_service.py" &
ML_PID=$!

# 2. Start Backend API Server
echo "⚙️  [2/3] Launching Express Backend Server (port 4000)..."
cd "$PROJECT_ROOT/backend"
npm run dev &
BACKEND_PID=$!

# 3. Start Frontend Dev Server
echo "💻 [3/3] Launching Frontend Webpage (port 5173)..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo "🎉 Virtual ChemLab is RUNNING!"
echo "   • Webpage:  http://localhost:5173"
echo "   • API:      http://localhost:4000"
echo "   • ML Model: http://127.0.0.1:5005"
echo "Press Ctrl+C to shut down all services."
echo "=========================================================="

# Cleanup on exit
trap "echo ''; echo 'Shutting down services...'; kill $ML_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
