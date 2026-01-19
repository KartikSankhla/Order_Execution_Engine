
import { Queue } from 'bullmq';
import { CreateOrderRequest } from '../types';
import { processJob } from './order.worker';

// Basic In-Memory Queue Fallback
export const memoryQueue: any[] = [];

// Connection to Redis (Mock or Real)
const connection = {
    // Prefer IPv4 to avoid ::1 issues on some Windows setups
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    connectTimeout: 5000, // Increased timeout for better connection handling
    // BullMQ requires this to be null (it will override otherwise, with warnings)
    maxRetriesPerRequest: null,
    family: 4,
    retryStrategy: (times: number) => {
        // Don't retry if Redis is not available, fail fast to memory queue
        return null;
    },
    enableReadyCheck: false, // Disable ready check to fail fast
    lazyConnect: true // Don't connect immediately
};

export const orderQueue = new Queue('order-execution', {
    connection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    }
});

let useMemoryQueue = false;
let redisCheckAttempted = false;

// Check Redis availability on startup (non-blocking)
function checkRedisConnection() {
    if (redisCheckAttempted) return;
    redisCheckAttempted = true;
    
    // Use a timeout to avoid hanging
    const timeout = setTimeout(() => {
        console.warn('⚠️  Redis connection check timed out. Using In-Memory Queue Mode.');
        console.warn('   To use Redis, start it with: docker-compose up -d redis');
        useMemoryQueue = true;
    }, 2000);
    
    // Try to add a test job - if it fails immediately, Redis is not available
    orderQueue.add('test-connection', { test: true }, { 
        jobId: 'test-connection-check',
        removeOnComplete: true 
    }).then(() => {
        clearTimeout(timeout);
        console.log('✅ Redis connection successful');
        useMemoryQueue = false;
    }).catch((err: any) => {
        clearTimeout(timeout);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'order.queue.ts:redisCheck',message:'redis check failed',data:{code:(err as any).code,host:connection.host,port:connection.port},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.warn('⚠️  Redis not available. Using In-Memory Queue Mode.');
        console.warn('   To use Redis, start it with: docker-compose up -d redis');
        useMemoryQueue = true;
    });
}

// Check Redis on module load (non-blocking)
checkRedisConnection();

orderQueue.on('error', (err) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'order.queue.ts:error',message:'orderQueue error',data:{code:(err as any).code,host:connection.host,port:connection.port},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if ((err as any).code === 'ECONNREFUSED' && !useMemoryQueue) {
        console.warn('⚠️  Redis connection failed. Switching to In-Memory Queue Mode.');
        useMemoryQueue = true;
    }
});

export async function addOrderToQueue(orderId: string, orderData: CreateOrderRequest) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'order.queue.ts:addOrderToQueue',message:'enqueue request',data:{orderId,useMemoryQueue},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (useMemoryQueue) {
        console.log(`[Queue] Adding Order ${orderId} to Memory Queue`);
        const jobData = { id: orderId, ...orderData, createdAt: new Date() };
        memoryQueue.push(jobData);
        // Trigger worker immediately for memory mode
        // ADDED DELAY: Wait 2.5s so the WebSocket has time to connect!
        console.log(`[Queue] ⏳ waiting 2.5s for WebSocket to match Order ${orderId}...`);
        setTimeout(() => {
            processJob({ data: jobData } as any).catch(console.error);
        }, 2500);
        return;
    }

    try {
        await orderQueue.add('execute-order', {
            id: orderId,
            ...orderData,
            createdAt: new Date()
        }, {
            jobId: orderId,
            removeOnComplete: true
        });
    } catch (err) {
        console.warn('⚠️  Redis error during add. Switching to memory queue.');
        useMemoryQueue = true;
        await addOrderToQueue(orderId, orderData); // Retry with memory
    }
}

