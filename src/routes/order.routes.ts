import { FastifyInstance } from 'fastify';
import { CreateOrderRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for active WebSocket connections (mapped by orderId)
export const orderConnections = new Map<string, any>();

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

        // In a real system, we would push to Queue here.
        // For now, we just return the ID so the client can connect via WS.

        return {
            message: 'Order received',
            orderId,
            status: 'pending',
            wsUrl: `ws://localhost:3000/api/orders/ws/${orderId}`
        };
    });

    // WebSocket Endpoint: /ws/:orderId
    fastify.get('/ws/:orderId', { websocket: true }, (connection, req: any) => {
        const { orderId } = req.params;
        fastify.log.info(`Client connected for order ${orderId}`);

        // Store connection
        orderConnections.set(orderId, connection);

        // Send initial status
        connection.socket.send(JSON.stringify({ orderId, status: 'pending', message: 'Connected to updates' }));

        // Cleanup on close
        connection.socket.on('close', () => {
            orderConnections.delete(orderId);
        });
    });
}
