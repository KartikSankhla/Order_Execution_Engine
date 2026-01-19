# Setup Guide

## Prerequisites
- Node.js (v18+)
- Docker Desktop (for local development)
- Git

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/Order_Execution_Engine.git
cd Order_Execution_Engine
```

### 2. Start Infrastructure
```bash
docker-compose up -d
```
This starts Redis (port 6379) and PostgreSQL (port 5432).

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Variables (Optional)
Create a `.env` file in the root directory:
```bash
PORT=3000
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### 5. Run Development Server
```bash
npm run dev
```

Server should start on `http://localhost:3000`

### 6. Run Tests
```bash
npm test
```

### 7. View Demo
Run the simulation script to see orders being processed and real-time WebSocket updates:
```bash
# In a new terminal
npx ts-node scripts/demo.ts
```

## Production Deployment

### Option 1: Render (Recommended)

**Why Render?**
- Free tier available
- Redis addon included
- Automatic deployments from GitHub
- Easy environment variable management

**Steps:**

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create Redis Instance**
   - Click "New +" → "Redis"
   - Name: `order-engine-redis`
   - Plan: Free
   - Click "Create Redis"
   - Copy the "Internal Redis URL"

3. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `order-execution-engine`
     - **Environment**: Node
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Plan**: Free

4. **Set Environment Variables**
   - In the web service settings, add:
     - `REDIS_URL`: (paste Internal Redis URL from step 2)
     - `NODE_ENV`: `production`
     - `PORT`: `3000` (optional, Render sets this automatically)

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy
   - Your app will be available at: `https://your-app-name.onrender.com`

6. **Test Deployment**
   ```bash
   curl -X POST https://your-app-name.onrender.com/api/orders/execute \
     -H "Content-Type: application/json" \
     -d '{"type":"MARKET","side":"buy","inputToken":"SOL","outputToken":"USDC","amount":10}'
   ```

### Option 2: Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Initialize**
   ```bash
   railway login
   railway init
   ```

3. **Add Redis**
   ```bash
   railway add redis
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Set Environment Variables**
   ```bash
   railway variables set NODE_ENV=production
   ```

### Option 3: Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Launch App**
   ```bash
   fly launch
   ```

4. **Add Redis**
   ```bash
   fly redis create
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | Yes (production) |
| `NODE_ENV` | Environment | `development` | No |

## Troubleshooting

### Redis Connection Issues

**Problem**: `ECONNREFUSED 127.0.0.1:6379`

**Solution**:
1. Ensure Docker is running: `docker ps`
2. Start Redis: `docker-compose up -d redis`
3. Check Redis logs: `docker logs order_execution_engine-redis-1`

**Fallback**: The app will use in-memory queue if Redis is unavailable (development only)

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

Or change the port:
```bash
PORT=3001 npm run dev
```

### Tests Failing

**Problem**: Tests fail with timeout errors

**Solution**:
1. Ensure no other instance is running on port 3000
2. Clear Jest cache: `npx jest --clearCache`
3. Run tests with increased timeout: `npm test -- --testTimeout=10000`

### WebSocket Connection Fails

**Problem**: WebSocket connection refused

**Solution**:
1. Ensure server is running
2. Check firewall settings
3. For deployed apps, ensure WebSocket support is enabled (Render supports this by default)

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure Redis with persistence
- [ ] Set up monitoring and logging
- [ ] Configure CORS for your frontend domain
- [ ] Add rate limiting
- [ ] Set up SSL/TLS (handled by hosting platforms)
- [ ] Configure health check endpoint
- [ ] Set up CI/CD pipeline
- [ ] Add error tracking (e.g., Sentry)
- [ ] Configure backup strategy for Redis

## Performance Optimization

### Redis Configuration
For production, configure Redis with:
- Persistence: RDB + AOF
- Max memory policy: `allkeys-lru`
- Connection pooling

### Node.js Configuration
```bash
# Increase memory limit if needed
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

### Scaling
- **Horizontal**: Deploy multiple instances with shared Redis
- **Vertical**: Increase instance resources (CPU/RAM)
- **Queue Workers**: Run separate worker instances for queue processing

## Monitoring

### Logs
```bash
# Local
npm run dev

# Production (Render)
# View logs in Render dashboard

# Production (Railway)
railway logs

# Production (Fly.io)
fly logs
```

### Health Check
Add to your deployment:
```bash
curl https://your-app.com/health
```

## Next Steps

After successful deployment:
1. Update README.md with your public URL
2. Test all endpoints with Postman collection
3. Record demo video
4. Monitor logs for errors
5. Set up alerts for downtime


