# Setup Guide

## Prerequisites
- Node.js (v18+)
- Docker Desktop

## running the Project

1.  **Start Infrastructure**
    ```bash
    docker-compose up -d
    ```
    This starts Redis (port 6379) and PostgreSQL (port 5432).

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

4.  **Verify**
    Server should start on `http://localhost:3000`.

## 5. View Demo
Run the simulation script to see orders being processed and real-time WebSocket updates:
```bash
# In a new terminal
npx ts-node scripts/demo.ts
```

