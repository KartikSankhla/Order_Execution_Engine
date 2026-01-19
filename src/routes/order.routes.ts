import { FastifyInstance } from 'fastify';
import { CreateOrderRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { addOrderToQueue } from '../queue/order.queue';
// import { SocketStream } from '@fastify/websocket';
import { WebSocket } from 'ws';
import { orderConnections } from '../websocket.store';

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
    // Note: depending on @fastify/websocket version, `connection` might be a SocketStream (with `.socket`)
    // or directly a WebSocket-like object (with `.send` / `.on`).
    fastify.get('/ws/:orderId', { websocket: true }, (connection: any, req: any) => {
        const { orderId } = req.params;
        fastify.log.info(`Client connected for order ${orderId}`);

        // Store WebSocket connection - try both connection.socket and connection itself
        // Fastify WebSocket: connection.socket is the underlying WebSocket instance
        const ws: any = connection?.socket ?? connection;
        orderConnections.set(orderId, ws);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b6057e4f-2fe8-43d7-a580-ca74c88cd245',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C',location:'order.routes.ts:websocket:connect',message:'websocket stored',data:{orderId,connectionsCount:orderConnections.size,hasSocket:!!connection.socket,readyState:ws?.readyState},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        // Send initial status
        try {
            ws.send(JSON.stringify({ orderId, status: 'pending', message: 'Connected to updates' }));
        } catch (err: any) {
            // Fastify logger expects (obj, msg) shape; avoid TS overload error.
            fastify.log.error({ err }, `Failed to send initial message to ${orderId}`);
        }

        // Handle errors
        ws.on('error', (err: any) => {
            fastify.log.error({ err }, `WebSocket error for order ${orderId}`);
            orderConnections.delete(orderId);
        });

        // Cleanup on close
        ws.on('close', () => {
            fastify.log.info(`Client disconnected for order ${orderId}`);
            orderConnections.delete(orderId);
        });
    });
}
