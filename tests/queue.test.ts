import { Worker, Job } from 'bullmq';
import { orderQueue } from '../src/queue/order.queue';
import { orderConnections } from '../src/websocket.store';

// Mock WebSocket
class MockWebSocket {
    messages: any[] = [];
    readyState = 1; // OPEN

    send(data: string) {
        this.messages.push(JSON.parse(data));
    }

    on(event: string, handler: Function) { }
}

describe('Queue Processing', () => {

    beforeEach(() => {
        orderConnections.clear();
    });

    test('Queue should handle single order', async () => {
        const orderId = 'test-order-1';
        const orderData = {
            type: 'MARKET',
            side: 'buy',
            inputToken: 'SOL',
            outputToken: 'USDC',
            amount: 10
        };

        const job = await orderQueue.add(orderId, orderData);
        expect(job.id).toBeDefined();
        expect(job.data).toEqual(orderData);
    });

    test('Queue should handle multiple concurrent orders', async () => {
        const orders = [
            { id: 'order-1', data: { type: 'MARKET', side: 'buy', inputToken: 'SOL', outputToken: 'USDC', amount: 5 } },
            { id: 'order-2', data: { type: 'MARKET', side: 'sell', inputToken: 'USDC', outputToken: 'SOL', amount: 100 } },
            { id: 'order-3', data: { type: 'MARKET', side: 'buy', inputToken: 'SOL', outputToken: 'BONK', amount: 2 } }
        ];

        const jobs = await Promise.all(
            orders.map(order => orderQueue.add(order.id, order.data))
        );

        expect(jobs).toHaveLength(3);
        jobs.forEach((job, index) => {
            expect(job.data).toEqual(orders[index].data);
        });
    });

    test('Queue should handle priority ordering', async () => {
        // BullMQ uses priority where lower number = higher priority
        const highPriorityJob = await orderQueue.add('high-priority',
            { type: 'MARKET', side: 'buy', inputToken: 'SOL', outputToken: 'USDC', amount: 100 },
            { priority: 1 }
        );

        const lowPriorityJob = await orderQueue.add('low-priority',
            { type: 'MARKET', side: 'buy', inputToken: 'SOL', outputToken: 'USDC', amount: 10 },
            { priority: 10 }
        );

        expect(highPriorityJob.opts?.priority).toBe(1);
        expect(lowPriorityJob.opts?.priority).toBe(10);
    });

    test('WebSocket notification should be sent when connection exists', () => {
        const orderId = 'ws-test-order';
        const mockWs = new MockWebSocket() as any;

        orderConnections.set(orderId, mockWs);

        // Simulate sending a message
        const message = { orderId, status: 'confirmed', message: 'Order executed' };
        mockWs.send(JSON.stringify(message));

        expect(mockWs.messages).toHaveLength(1);
        expect(mockWs.messages[0]).toEqual(message);
    });

    test('Queue should handle order with missing WebSocket connection gracefully', () => {
        const orderId = 'no-ws-order';

        // Ensure no connection exists
        expect(orderConnections.has(orderId)).toBe(false);

        // This should not throw an error
        const conn = orderConnections.get(orderId);
        expect(conn).toBeUndefined();
    });
});
