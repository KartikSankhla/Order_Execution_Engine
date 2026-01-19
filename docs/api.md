# API Documentation

## Base URL
`http://localhost:3000/api/orders`

---

## Endpoints

### 1. Execute Order
Submit a new order for execution.

- **URL**: `/execute`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "type": "MARKET",
    "side": "buy",
    "inputToken": "SOL",
    "outputToken": "USDC",
    "amount": 10
  }
  ```
- **Response**:
  ```json
  {
    "message": "Order received",
    "orderId": "uuid-string...",
    "status": "pending",
    "wsUrl": "ws://localhost:3000/api/orders/ws/uuid-string..."
  }
  ```

---

### 2. Order Status (WebSocket)
Stream real-time updates for a specific order.

- **URL**: `ws://localhost:3000/api/orders/ws/:orderId`
- **Events**:
  - `connected`: Initial connection.
  - `routing`: System is searching for best price.
    - Data: `{ "message": "Best Route: Raydium", "price": 102.5 }`
  - `processing`: Worker has started.
  - `confirmed`: Order executed on blockchain.
    - Data: `{ "txHash": "Ax...", "finalPrice": 102.5 }`
  - `failed`: Error occurred.
