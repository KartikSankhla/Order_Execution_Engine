import { Worker } from 'bullmq';
import { orderConnections } from '../websocket.store';
import { DexService } from '../services/dex.service';

const connection = {
    // Prefer IPv4 to avoid ::1 issues on some Windows setups
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    connectTimeout: 5000,
    // BullMQ requires this to be null (it will override otherwise, with warnings)
    maxRetriesPerRequest: null,
    family: 4,
    retryStrategy: (times: number) => null, // Don't retry, fail fast
    enableReadyCheck: false,
    lazyConnect: true
};

// Notify helper shared by BullMQ and memory mode
function notifyUser(orderId: string, status: string, data: Record<string, any> = {}) {
    const conn = orderConnections.get(orderId);
    // #region agent log
    const allOrderIds = Array.from(orderConnections.keys());
    const connReadyState = conn ? (conn as any).readyState : null;
    fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C',location:'order.worker.ts:notifyUser',message:'notify user',data:{orderId,status,hasConnection:!!conn,allOrderIds,mapSize:orderConnections.size,connReadyState},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.log(`[Worker] Notify ${orderId} (${status}): Connection found? ${!!conn}, ReadyState: ${connReadyState}`);
    if (conn) {
        try {
            // Check if connection is still open (readyState: 1 = OPEN, 0 = CONNECTING, 2 = CLOSING, 3 = CLOSED)
            const readyState = (conn as any).readyState;
            if (readyState === 1) { // OPEN
                conn.send(JSON.stringify({ orderId, status, ...data }));
            } else {
                console.warn(`[Worker] Connection for ${orderId} is not open (readyState: ${readyState}), removing from map`);
                orderConnections.delete(orderId);
            }
        } catch (err: any) {
            console.error(`[Worker] Failed to send message to ${orderId}:`, err.message);
            orderConnections.delete(orderId);
        }
    } else {
        console.warn(`[Worker] No WebSocket connection found for order ${orderId}. Available orders: ${allOrderIds.join(', ') || 'none'}`);
    }
}

// Logic extracted for re-use in Memory Mode
export const processJob = async (job: any) => {
    const { id, type, inputToken, outputToken, amount } = job.data;
    const orderId = id;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'order.worker.ts:processJob:start',message:'process job start',data:{orderId,type},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    try {
        console.log(`[Worker] Processing Order ${orderId}`);
        notifyUser(orderId, 'processing', { message: 'Order picked up by worker' });

        // Step 1: Routing
        notifyUser(orderId, 'routing', { message: 'Fetching quotes...' });
        const bestRoute = await DexService.getBestQuote(inputToken, outputToken, amount);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D',location:'order.worker.ts:processJob:route',message:'selected route',data:{orderId,dex:bestRoute.dex,price:bestRoute.price},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        console.log(`[Worker] Route selected: ${bestRoute.dex} @ ${bestRoute.price}`);
        notifyUser(orderId, 'routing', { message: `Best Route: ${bestRoute.dex}`, price: bestRoute.price });

        // Step 2: Execution
        notifyUser(orderId, 'building', { message: 'Creating transaction...' });
        const result = await DexService.executeSwap(bestRoute.dex, { ...job.data, type });

        // Step 3: Confirmation
        console.log(`[Worker] Order ${orderId} Confirmed: ${result.txHash}`);
        notifyUser(orderId, 'confirmed', {
            txHash: result.txHash,
            finalPrice: bestRoute.price,
            dex: bestRoute.dex
        });

        return result;

    } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E',location:'order.worker.ts:processJob:error',message:'process job error',data:{orderId,error:error?.message},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        console.error(`[Worker] Order ${orderId} Failed`, error);
        notifyUser(orderId, 'failed', { error: error.message });
        throw error;
    }
};

export const orderWorker = new Worker('order-execution', processJob, {
    connection,
    concurrency: 10
});

// #region agent log
fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'order.worker.ts:worker:init',message:'worker init',data:{host:connection.host,port:connection.port},timestamp:Date.now()})}).catch(()=>{});
// #endregion

orderWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});

orderWorker.on('error', err => {
    // Suppress crash on Redis connection failure, as we have memory fallback
    if ((err as any).code === 'ECONNREFUSED') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'order.worker.ts:worker:error',message:'worker redis error',data:{code:(err as any).code},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        // console.warn('Worker Redis disconnected (Memory fallback active)');
    } else {
        console.error('Worker Error:', err);
    }
});
