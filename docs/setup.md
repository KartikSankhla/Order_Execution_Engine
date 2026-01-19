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
