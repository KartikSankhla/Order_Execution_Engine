import { FastifyInstance } from 'fastify';
import { CreateOrderRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { addOrderToQueue } from '../queue/order.queue';

import { SocketStream } from '@fastify/websocket';
// In-memory store for active WebSocket connections (mapped by orderId)
// Storing the actual WebSocket object
import { WebSocket } from 'ws';
export const orderConnections = new Map<string, WebSocket>();

export async function orderRoutes(fastify: FastifyInstance) {

    // POST /execute
    fastify.post<{ Body: CreateOrderRequest }>('/execute', async (request, reply) => {
        const { type, side, inputToken, outputToken, amount } = request.body;

        // Simple Validation
        if (!amount || amount <= 0) {
            return reply.code(400).send({ error: 'Invalid amount' });
        }

        const orderId = uuidv4();
        request.log.info(`Received order ${orderId}`);

        // Add to BullMQ
        await addOrderToQueue(orderId, { type, side, inputToken, outputToken, amount });

        return {
            message: 'Order received',
            orderId,
            status: 'pending',
            wsUrl: `ws://localhost:3000/api/orders/ws/${orderId}`
        };
    });

    // WebSocket Endpoint: /ws/:orderId
    fastify.get('/ws/:orderId', { websocket: true }, (connection: SocketStream, req: any) => {
        const { orderId } = req.params;
        fastify.log.info(`Client connected for order ${orderId}`);

        // Store raw WebSocket connection
        orderConnections.set(orderId, connection.socket);

        // Send initial status
        connection.socket.send(JSON.stringify({ orderId, status: 'pending', message: 'Connected to updates' }));

        // Cleanup on close
        connection.socket.on('close', () => {
            orderConnections.delete(orderId);
        });
    });
}
