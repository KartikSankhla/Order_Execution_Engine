import { Worker } from 'bullmq';
import { orderConnections } from '../routes/order.routes';
import { DexService } from '../services/dex.service';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
};

// Helper to send WS updates
function notifyUser(orderId: string, status: string, data: any = {}) {
    const conn = orderConnections.get(orderId);
    if (conn) {
        conn.send(JSON.stringify({ orderId, status, ...data }));
    }
}

export const orderWorker = new Worker('order-execution', async (job) => {
    const { id, type, inputToken, outputToken, amount } = job.data;
    const orderId = id;

    try {
        console.log(`[Worker] Processing Order ${orderId}`);
        notifyUser(orderId, 'processing', { message: 'Order picked up by worker' });

        // Step 1: Routing
        notifyUser(orderId, 'routing', { message: 'Fetching quotes...' });
        const bestRoute = await DexService.getBestQuote(inputToken, outputToken, amount);

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
        console.error(`[Worker] Order ${orderId} Failed`, error);
        notifyUser(orderId, 'failed', { error: error.message });
        throw error;
    }

}, { connection, concurrency: 10 }); // Concurrency 10 as per requirements

orderWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});
