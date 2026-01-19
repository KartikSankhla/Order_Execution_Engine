import axios from 'axios';
import { WebSocket } from 'ws';

// Configuration
const BASE_URL = 'http://localhost:3000/api/orders/execute';
const WS_BASE_URL = 'ws://localhost:3000/api/orders/ws';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

const log = (color: string, msg: string) => console.log(`${color}${msg}${colors.reset}`);

// Test Orders
const orders = [
    { type: 'MARKET', side: 'buy', inputToken: 'SOL', outputToken: 'USDC', amount: 5 },
    { type: 'MARKET', side: 'sell', inputToken: 'USDC', outputToken: 'SOL', amount: 100 },
    { type: 'MARKET', side: 'buy', inputToken: 'SOL', outputToken: 'BONK', amount: 2 },
    { type: 'MARKET', side: 'sell', inputToken: 'BONK', outputToken: 'USDC', amount: 5000 },
    { type: 'MARKET', side: 'buy', inputToken: 'USDC', outputToken: 'SOL', amount: 50 }
];

async function runDemo() {
    console.clear();
    log(colors.bright, '\n🎬 ORDER EXECUTION ENGINE - DEMO SIMULATION\n');
    log(colors.cyan, 'Waiting 3 seconds before starting... Get your screen recorder ready!\n');

    await new Promise(r => setTimeout(r, 3000));

    log(colors.yellow, '🚀 Submitting 5 simultaneous orders...\n');

    // Submit all orders concurrently
    const promises = orders.map(async (order, index) => {
        try {
            // 1. Submit Order
            const { data } = await axios.post(BASE_URL, order);
            const { orderId } = data;

            log(colors.green, `[Order ${index + 1}] Submitted: ${order.side.toUpperCase()} ${order.amount} ${order.inputToken} -> ${order.outputToken} (ID: ${orderId.slice(0, 8)}...)`);

            // 2. Connect to WebSocket
            const ws = new WebSocket(`${WS_BASE_URL}/${orderId}`);

            ws.on('open', () => {
                // Connection established
            });

            ws.on('message', (msg) => {
                const update = JSON.parse(msg.toString());
                const statusColor =
                    update.status === 'confirmed' ? colors.green :
                        update.status === 'routing' ? colors.blue :
                            colors.yellow;

                let details = '';
                if (update.status === 'routing') {
                    details = `Checking DEXs...`;
                } else if (update.status === 'confirmed') {
                    details = `✅ Executed on ${update.dex} @ ${update.price} | Tx: ${update.txHash.slice(0, 8)}...`;
                }

                console.log(
                    `${colors.cyan}[WS Update]${colors.reset} Order ${orderId.slice(0, 8)}... ` +
                    `${statusColor}${update.status.toUpperCase()}${colors.reset} ${details}`
                );

                if (update.status === 'confirmed' || update.status === 'failed') {
                    ws.close();
                }
            });

        } catch (error: any) {
            log(colors.red, `[Error] Failed to submit order: ${error.message}`);
        }
    });

    await Promise.all(promises);
}

runDemo();
