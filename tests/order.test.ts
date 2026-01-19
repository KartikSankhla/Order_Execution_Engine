import fastify from 'fastify';
import websocket from '@fastify/websocket';
import { orderRoutes } from '../src/routes/order.routes';
import { orderConnections } from '../src/websocket.store';
import { WebSocket } from 'ws';

// Mock Queue
jest.mock('../src/queue/order.queue', () => ({
    addOrderToQueue: jest.fn().mockImplementation(async (id, data) => {
        // Mock Queue processing immediately
        setTimeout(() => {
            // We can't easily simulate the worker here without spinning up Redis
            // So we will just test the API Flow and WS connection
        }, 100);
    }),
    orderQueue: {
        add: jest.fn()
    }
}));

describe('Order Execution Engine', () => {
    let server: any;

    beforeAll(async () => {
        server = fastify();
        server.register(websocket);
        server.register(orderRoutes, { prefix: '/api/orders' });
        await server.ready();
    });

    afterAll(async () => {
        await server.close();
    });

    test('POST /execute should return orderId and wsUrl', async () => {
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
        expect(body).toHaveProperty('wsUrl');
        expect(body.status).toBe('pending');
    });

    test('POST /execute should reject zero amount', async () => {
        const response = await server.inject({
            method: 'POST',
            url: '/api/orders/execute',
            payload: {
                type: 'MARKET',
                side: 'buy',
                inputToken: 'SOL',
                outputToken: 'USDC',
                amount: 0
            }
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('error');
    });

    test('POST /execute should reject negative amount', async () => {
        const response = await server.inject({
            method: 'POST',
            url: '/api/orders/execute',
            payload: {
                type: 'MARKET',
                side: 'buy',
                inputToken: 'SOL',
                outputToken: 'USDC',
                amount: -5
            }
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body).toHaveProperty('error');
        expect(body.error).toBe('Invalid amount');
    });

    test('POST /execute should handle different token pairs', async () => {
        const tokenPairs = [
            { inputToken: 'SOL', outputToken: 'USDC' },
            { inputToken: 'USDC', outputToken: 'SOL' },
            { inputToken: 'SOL', outputToken: 'BONK' }
        ];

        for (const pair of tokenPairs) {
            const response = await server.inject({
                method: 'POST',
                url: '/api/orders/execute',
                payload: {
                    type: 'MARKET',
                    side: 'buy',
                    ...pair,
                    amount: 10
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body).toHaveProperty('orderId');
        }
    });

    // Note: Testing WebSockets required a real running server or a specialized mock.
    // server.inject handles HTTP but not full WS handshake easily in mock mode.
    // We verify the HTTP part here.
});
