import fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { orderRoutes } from '../src/routes/order.routes';
import { orderConnections } from '../src/websocket.store';
import WebSocket from 'ws';

// Mock the queue module
jest.mock('../src/queue/order.queue', () => ({
    addOrderToQueue: jest.fn().mockResolvedValue(undefined),
    orderQueue: {
        add: jest.fn()
    }
}));

describe('Integration Tests - End-to-End Flow', () => {
    let server: FastifyInstance;
    let serverAddress: string;

    beforeAll(async () => {
        server = fastify({ logger: false });
        await server.register(websocket);
        await server.register(orderRoutes, { prefix: '/api/orders' });

        serverAddress = await server.listen({ port: 0, host: '127.0.0.1' });
    });

    afterAll(async () => {
        await server.close();
    });

    beforeEach(() => {
        orderConnections.clear();
    });

    test('End-to-end: Submit order and receive WebSocket updates', async () => {
        // Step 1: Submit order via POST
        const response = await server.inject({
            method: 'POST',
            url: '/api/orders/execute',
            payload: {
                type: 'MARKET',
                side: 'buy',
                inputToken: 'SOL',
                outputToken: 'USDC',
                amount: 10
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('orderId');
        expect(body.status).toBe('pending');

        const orderId = body.orderId;

        // Step 2: Connect via WebSocket
        const wsUrl = serverAddress.replace('http', 'ws') + `/api/orders/ws/${orderId}`;
        const ws = new WebSocket(wsUrl);

        const messages: any[] = [];

        await new Promise<void>((resolve, reject) => {
            ws.on('open', () => {
                // WebSocket connected successfully
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                messages.push(message);

                // Close after receiving initial message
                if (messages.length >= 1) {
                    ws.close();
                    resolve();
                }
            });

            ws.on('error', reject);

            setTimeout(() => reject(new Error('Timeout waiting for WebSocket message')), 5000);
        });

        // Verify we received the initial pending message
        expect(messages.length).toBeGreaterThanOrEqual(1);
        expect(messages[0]).toMatchObject({
            orderId,
            status: 'pending'
        });
    });

    test('Concurrent orders should all be processed', async () => {
        const orderPayloads = [
            { type: 'MARKET', side: 'buy', inputToken: 'SOL', outputToken: 'USDC', amount: 5 },
            { type: 'MARKET', side: 'sell', inputToken: 'USDC', outputToken: 'SOL', amount: 100 },
            { type: 'MARKET', side: 'buy', inputToken: 'SOL', outputToken: 'BONK', amount: 2 }
        ];

        // Submit all orders concurrently
        const responses = await Promise.all(
            orderPayloads.map(payload =>
                server.inject({
                    method: 'POST',
                    url: '/api/orders/execute',
                    payload
                })
            )
        );

        // All should succeed
        responses.forEach(response => {
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body).toHaveProperty('orderId');
            expect(body.status).toBe('pending');
        });

        // All should have unique order IDs
        const orderIds = responses.map(r => JSON.parse(r.payload).orderId);
        const uniqueIds = new Set(orderIds);
        expect(uniqueIds.size).toBe(orderPayloads.length);
    });

    test('Invalid order should return 400 error', async () => {
        const response = await server.inject({
            method: 'POST',
            url: '/api/orders/execute',
            payload: {
                type: 'MARKET',
                side: 'buy',
                inputToken: 'SOL',
                outputToken: 'USDC',
                amount: -10 // Invalid negative amount
            }
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('error');
    });

    test('WebSocket connection cleanup on disconnect', async () => {
        // Submit order
        const response = await server.inject({
            method: 'POST',
            url: '/api/orders/execute',
            payload: {
                type: 'MARKET',
                side: 'buy',
                inputToken: 'SOL',
                outputToken: 'USDC',
                amount: 10
            }
        });

        const { orderId } = JSON.parse(response.payload);
        const wsUrl = serverAddress.replace('http', 'ws') + `/api/orders/ws/${orderId}`;
        const ws = new WebSocket(wsUrl);

        // Wait for connection
        await new Promise<void>((resolve) => {
            ws.on('open', () => {
                // Connection should be stored
                setTimeout(() => {
                    expect(orderConnections.has(orderId)).toBe(true);
                    resolve();
                }, 100);
            });
        });

        // Close connection
        ws.close();

        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));

        // Connection should be removed
        expect(orderConnections.has(orderId)).toBe(false);
    });
});
