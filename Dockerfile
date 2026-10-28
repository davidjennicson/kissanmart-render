# ==============================================================================
# Multi-Stage Dockerfile for Kissanmart (Single Unified Package)
# Stage 1: Build React/Vite Frontend
# Stage 2: Package with FastAPI, Gemma AI Agent, and Three.js Digital Twin
# ==============================================================================

# ── Stage 1: Build Frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend

# Copy frontend dependency manifests
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

# Copy frontend source and build production bundle
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production Python Runner ─────────────────────────────────────────
FROM python:3.12-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    FRONTEND_DIST_DIR=/app/frontend/dist

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install backend Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy ONNX model if present at root
COPY sam_mask_decoder.onnx* ./

# Copy built frontend from Stage 1
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist

# Expose container port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Start unified FastAPI server serving both API and Frontend SPA
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]

