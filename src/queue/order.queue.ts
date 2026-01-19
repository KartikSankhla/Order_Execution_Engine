import { Queue } from 'bullmq';
import { CreateOrderRequest } from '../types';

// Connection to Redis (Mock or Real)
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
};

export const orderQueue = new Queue('order-execution', { connection });

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
