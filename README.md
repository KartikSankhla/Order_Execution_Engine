# Order Execution Engine

A high-performance backend system for executing Token Swaps on Solana, featuring:
- **Fastify** API with WebSocket support for real-time updates
- **BullMQ + Redis** for robust order queuing and processing
- **Mock DEX Routing** (Raydium/Meteora) with best-price execution
- **TypeScript** for type safety and better developer experience
- **Comprehensive Testing** with 17+ unit and integration tests

## 🎥 Demo Video

**[Watch Demo Video](https://youtube.com/placeholder)** *(1-2 minutes)*

The demo showcases:
- Order flow through the system
- 3-5 simultaneous orders being processed
- WebSocket status updates (pending → routing → confirmed)
- DEX routing decisions in console logs
- Queue processing multiple orders concurrently

## 🌐 Live Deployment

**Public URL**: `https://your-app.onrender.com` *(Coming soon)*

The application is deployed on Render's free tier with Redis addon for production-grade queue management.

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

The server will start on `http://localhost:3000`

### Redis notes (Windows)
- If you see `ECONNREFUSED 127.0.0.1:6379`, Redis is not running. This project will fall back to an in-memory queue, but BullMQ/Redis is required for full fidelity.
- Start Redis only:
  - PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/start-redis.ps1`
  - Or: `docker-compose up -d redis`

## 📖 Documentation

- **[Architecture & Flow](docs/architecture.md)** - How the Queue and Worker work
- **[API Reference](docs/api.md)** - `POST /execute` and WebSocket events
- **[Setup Guide](docs/setup.md)** - Detailed setup instructions
- **[Design Decisions](docs/design-decisions.md)** - Technical choices and rationale

## 🧪 Testing

```bash
npm test
```

**Test Coverage:**
- ✅ 17+ unit and integration tests
- ✅ Order execution and routing logic
- ✅ Queue behavior with concurrent orders
- ✅ WebSocket lifecycle and real-time updates
- ✅ Error handling and validation

## 📬 API Collection

Import the Postman collection to test the API:

**[postman_collection.json](postman_collection.json)**

The collection includes:
- Order execution endpoints for different token pairs
- WebSocket connection examples
- Batch testing scenarios (5 concurrent orders)
- Error handling examples
- Environment variables for local/production

### Quick Test with Postman
1. Import `postman_collection.json`
2. Ensure server is running (`npm run dev`)
3. Send POST request to `/api/orders/execute`
4. Copy the `wsUrl` from response
5. Use a WebSocket client to connect and see real-time updates

## 🏗️ Design Decisions

### Why Fastify over Express?
- **65% faster** in benchmarks
- First-class TypeScript support
- Built-in schema validation
- Native WebSocket support

### Why BullMQ + Redis?
- **Reliable** job processing with retries
- **Scalable** to handle high throughput
- **Observable** with job status tracking
- **Persistent** - jobs survive server restarts

### Mock DEX vs Real Integration
Currently using mock DEX for demonstration purposes:
- ✅ Faster development and testing
- ✅ No transaction fees
- ✅ Showcases routing logic and architecture

**Production Path**: Replace `DexService` with Jupiter Aggregator API for real Solana DEX routing.

### WebSocket for Real-Time Updates
- Instant status updates when order state changes
- Lower bandwidth than HTTP polling
- Better user experience

See **[docs/design-decisions.md](docs/design-decisions.md)** for comprehensive technical rationale.

## 📂 Project Structure

```
src/
├── routes/           # API Endpoints
│   └── order.routes.ts
├── queue/            # BullMQ Producer & Worker
│   ├── order.queue.ts
│   └── order.worker.ts
├── services/         # Business Logic
│   └── dex.service.ts
├── types/            # TypeScript Definitions
│   └── index.ts
├── websocket.store.ts # WebSocket Connection Store
└── index.ts          # Server Entry Point

tests/
├── order.test.ts     # API endpoint tests
├── dex.test.ts       # DEX routing tests
├── queue.test.ts     # Queue behavior tests
└── integration.test.ts # End-to-end tests

docs/
├── architecture.md   # System architecture
├── api.md           # API documentation
├── setup.md         # Setup guide
└── design-decisions.md # Technical decisions

scripts/
└── demo.ts          # Demo script for video
```

## 🔧 Environment Variables

```bash
# .env file (optional)
PORT=3000
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

## 🚢 Deployment

### Deploying to Render (Recommended)

1. **Create Render Account**: Sign up at [render.com](https://render.com)

2. **Create Web Service**:
   - Connect your GitHub repository
   - Select "Web Service"
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Add Redis**:
   - Create a new Redis instance
   - Copy the internal Redis URL
   - Add as environment variable: `REDIS_URL`

4. **Deploy**: Render will automatically deploy on push to main branch

### Alternative Platforms
- **Railway**: Easy deployment with Redis addon
- **Fly.io**: Global edge deployment
- **Heroku**: Redis available via addon

See **[docs/setup.md](docs/setup.md)** for detailed deployment instructions.

## 🎯 API Usage

### Submit an Order

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MARKET",
    "side": "buy",
    "inputToken": "SOL",
    "outputToken": "USDC",
    "amount": 10
  }'
```

**Response:**
```json
{
  "message": "Order received",
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "wsUrl": "ws://localhost:3000/api/orders/ws/550e8400-e29b-41d4-a716-446655440000"
}
```

### Connect to WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3000/api/orders/ws/{orderId}');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Order Status:', update.status);
  // pending → routing → confirmed
};
```

## 🔍 Monitoring & Logs

Watch order processing in real-time:

```bash
# Terminal 1: Start server with logs
npm run dev

# Terminal 2: Submit orders
npm run demo

# You'll see:
# - Order received logs
# - DEX routing decisions (Raydium vs Meteora)
# - WebSocket connection events
# - Queue processing status
```

## 🤝 Contributing

This is a demonstration project for a backend engineering assessment. For production use:

1. Replace mock DEX with real Solana integration
2. Add authentication and user management
3. Implement rate limiting
4. Add comprehensive monitoring
5. Set up CI/CD pipeline

## 📝 License

ISC

## 🙏 Acknowledgments

Built with:
- [Fastify](https://www.fastify.io/) - Fast web framework
- [BullMQ](https://docs.bullmq.io/) - Queue management
- [Redis](https://redis.io/) - In-memory data store
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

**Note**: This project uses mock DEX routing for demonstration. For production use with real Solana transactions, integrate with [Jupiter Aggregator](https://jup.ag/) or direct DEX SDKs.

