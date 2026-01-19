import { Queue } from 'bullmq';
import { CreateOrderRequest } from '../types';

// Connection to Redis (Mock or Real)
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
};

export const orderQueue = new Queue('order-execution', {
    connection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    }
});

orderQueue.on('error', (err) => {
    // Log typical connection error gracefully
    if ((err as any).code === 'ECONNREFUSED') {
        console.warn('⚠️  Redis connection failed. Ensure Docker is running (docker-compose up). Queues will not work.');
    } else {
        console.error('Queue Error:', err);
    }
});

export async function addOrderToQueue(orderId: string, orderData: CreateOrderRequest) {
    await orderQueue.add('execute-order', {
        id: orderId,
        ...orderData,
        createdAt: new Date()
    }, {
        jobId: orderId, // Use orderId as JobId for easy lookup
        removeOnComplete: true
    });
}
