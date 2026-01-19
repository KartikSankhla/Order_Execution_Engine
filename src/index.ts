import fastify from 'fastify';
import websocket from '@fastify/websocket';
import { orderRoutes } from './routes/order.routes';

const server = fastify({ logger: true });

// Register WebSocket support
server.register(websocket);

// Register Routes
server.register(orderRoutes, { prefix: '/api/orders' });

server.get('/', async (request, reply) => {
    return { status: 'online', service: 'Order Execution Engine' };
});

const start = async () => {
    try {
        await server.listen({ port: 3000, host: '0.0.0.0' });
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
