# Order Execution Engine

A high-performance backend system for executing Token Swaps on Solana, featuring:
- **Fastify** API with WebSocket support.
- **BullMQ + Redis** for robust order queuing.
- **Mock DEX Routing** (Raydium/Meteora) for best-price execution.
- **TypeScript** for type safety.

## 🚀 Quick Start

### 1. Requirements
- Node.js v18+
- Docker Desktop (for Redis/Postgres)

### 2. Run Locally
```bash
# 1. Start Infrastructure
docker-compose up -d

# 2. Install Dependencies
npm install

# 3. Run Dev Server
npm run dev
```

### 3. Documentation
- [Architecture & Flow](docs/architecture.md) - How the Queue and Worker work.
- [API Reference](docs/api.md) - `POST /execute` and WebSocket events.
- [Setup Guide](docs/setup.md) - Detailed setup instructions.

## 🧪 Testing
```bash
npm test
```

## 📂 Project Structure
- `src/routes`: API Endpoints
- `src/queue`: BullMQ Producer & Worker
- `src/services`: Mock DEX Logic
- `tests`: Integration Tests
