# 🌾 Kissanmart (महाराष्ट्र ॲग्रीटेक)

A full-stack Maharashtra AgriTech platform featuring **Real-Time Speed-Run APMC Auctions**, **Gemma AI Voice Call Agent**, and **3D Interactive Farm Digital Twins** built with Three.js.

The entire application is packaged as a **single unified, self-contained hostable package** — a single command or Docker container serves both the React Single Page Application (SPA) and the FastAPI backend.

---

## ⚡ Quick Start (Single Command)

### Option 1: Docker (Recommended for Hosting)
Run the entire platform with Docker without installing Python or Node.js locally:

```bash
docker compose up --build
```
Or with standard Docker:
```bash
docker build -t kissanmart .
docker run -p 8000:8000 kissanmart
```

Open **`http://localhost:8000`** in your browser.

---

### Option 2: Local Run (Single Unified Server)

1. **Build frontend:**
   ```bash
   npm run build
   ```

2. **Start unified backend & frontend:**
   ```bash
   # Windows
   start.bat

   # Linux / macOS
   ./start.sh
   # Or via python:
   python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
   ```

- **Web Application**: [`http://localhost:8000/`](http://localhost:8000/)
- **Interactive API Docs (Swagger UI)**: [`http://localhost:8000/docs`](http://localhost:8000/docs)
- **API Health Check**: [`http://localhost:8000/api/v1/health`](http://localhost:8000/api/v1/health)

---

### Option 3: Development Mode (Hot Reload)

Run frontend and backend independently with hot reloading:

```bash
# Terminal 1: Backend API (FastAPI)
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend (Vite)
cd frontend
npm run dev
```

---

## 🚀 Cloud Deployment

### 1-Click Render.com Deployment
This repository includes a [`render.yaml`](./render.yaml) blueprint:
1. Connect this repo to [Render](https://render.com).
2. Create a new **Web Service** with **Docker** runtime.
3. Set environment variable `GEMMA_API_KEY` (optional for voice call agent).
4. Deploy! Render will build and host the application at `https://your-app.onrender.com`.

### Railway / Fly.io / Heroku
The included [`Dockerfile`](./Dockerfile) and [`Procfile`](./Procfile) automatically bind to the cloud platform's `$PORT` environment variable.

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` to customize settings:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Port for the unified server |
| `DEBUG` | `False` | Debug mode |
| `DATABASE_URL` | `sqlite:///./app.db` | Database connection string (SQLite or PostgreSQL) |
| `BACKEND_CORS_ORIGINS` | `*` | Allowed CORS origins |
| `GEMMA_API_KEY` | *(None)* | Google Gemini/Gemma API Key for Call Agent |
| `GEMMA_MODEL` | `gemma-2-9b-it` | Gemma model name |

---

## 🏗️ Architecture & Features

```
kissanmart/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Auctions, Farms, Soil Health, Voice Agent
│   │   ├── core/               # App configuration & CORS
│   │   ├── db/                 # SQLite/PostgreSQL schema & seed data
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── services/           # Gemma Call Agent & ONNX segmentation engine
│   │   └── main.py             # FastAPI app with SPA fallback & static mounts
│   ├── tests/                  # Pytest test suite (100% passing)
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/buyer/   # Buyer portal, APMC Speed-Run, 3D Digital Twin
│   │   ├── components/farmer/  # Crop listings, DBT payments, Gemma Call Agent
│   │   └── lib/                # Real-time auction store, dynamic API client
│   ├── package.json            # Vite, React 19, Tailwind v4, Three.js
│   └── vite.config.ts
├── Dockerfile                  # Multi-stage production container
├── docker-compose.yml          # Single-command container deployment
├── Procfile                    # Cloud platform deployment entrypoint
├── render.yaml                 # Render Blueprint
├── .gitignore                  # Production git rules
├── start.sh / start.bat        # Instant launchers
└── package.json                # Unified top-level scripts
```

### Key Modules:
- **3D Farm Digital Twin**: Three.js scene featuring real-time combine harvester boustrophedon sweeps, dynamic wheat blade cutting, procedural terrain, day/night sun-moon lighting cycles, weather & storage sensor telemetry, and daily timeline scrubber.
- **60s Speed-Run APMC Auction Engine**: High-frequency real-time bidding simulation with APMC bot traders (Vidarbha Mills, Marathwada Solvents, Mumbai APMC), dynamic outbid notifications, and instant DBT escrow settlement.
- **Gemma Voice AI Call Agent**: Multilingual (English / Marathi) grounded call assistant with audio visualizer, client-side Web Audio speech streaming, and guardrails restricted strictly to crop prices, farm/soil records, rainfall alerts, and recent lot bids.

