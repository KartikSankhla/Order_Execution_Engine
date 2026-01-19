# System Architecture

## Overview
The Order Execution Engine is designed to be a high-performance, asynchronous system that handles user orders, routes them to the best DEX (Decentralized Exchange), and executes them on the Solana blockchain (simulated).

## Components

### 1. API Server (Fastify)
- **Role**: Entry point for all user requests.
- **Responsibility**:
  - Validates incoming Orders (Schema Validation).
  - Pushes Order Job to the **BullMQ Queue**.
  - Returns an `orderId` immediately (Non-blocking).
  - Handles WebSocket connections for real-time status updates.

### 2. Message Queue (Redis + BullMQ)
- **Role**: Buffer between API and Worker.
- **Responsibility**:
  - Persists orders in Redis.
  - Ensures First-In-First-Out (FIFO) processing.
  - Handles retries if processing fails.

### 3. Worker (Order Processor)
- **Role**: The "Brain" that processes orders.
- **Responsibility**:
  - **Routing**: Queries `DexService` (Mock Raydium/Meteora) to find the best price.
  - **Execution**: Simulates a blockchain transaction.
  - **Notification**: Pushes status updates ('routing', 'confirmed') back to the API/WebSocket.

## Data Flow
1. **User** `POST /execute` -> **API**
2. **API** -> **Redis Queue** (Status: `pending`)
3. **API** returns `orderId` to **User**.
4. **User** connects to `ws://.../ws/:orderId`.
5. **Worker** picks up Job -> **DexService**.
6. **DexService** compares prices -> Returns Best Route.
7. **Worker** -> Execute Swap.
8. **Worker** -> Send WebSocket Message (`confirmed`).
