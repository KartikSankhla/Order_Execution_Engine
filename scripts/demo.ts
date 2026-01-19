// Run with: npx ts-node scripts/demo.ts
import WebSocket from 'ws'; // Standard ws client
import { v4 as uuidv4 } from 'uuid';

async function runDemo() {
    console.log('🚀 Starting Order Execution Engine Demo...');

    // 1. Create an Order via HTTP
    const orderData = {
        type: 'MARKET',
        side: 'buy',
        inputToken: 'SOL',
        outputToken: 'USDC',
        amount: 5
    };

    console.log('1️⃣  Submitting Order via API...');
    try {
        const response = await fetch('http://localhost:3000/api/orders/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Order Created:', data);

        const { orderId, wsUrl } = data;

        // 2. Connect to WebSocket
        console.log(`2️⃣  Connecting to WebSocket for Order ${orderId}...`);
        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
            console.log('✅ WebSocket Connected!');
        });

        ws.on('message', (message) => {
            const event = JSON.parse(message.toString());
            const { status } = event;

            // Pretty Print Status
            if (status === 'pending') console.log(`⏳ [Status: PENDING] Order queued.`);
            if (status === 'processing') console.log(`⚙️  [Status: PROCESSING] Worker picked up order.`);
            if (status === 'routing') console.log(`🔍 [Status: ROUTING] ${event.message} Price: ${event.price || '...'}`);
            if (status === 'building') console.log(`🏗️  [Status: BUILDING] Constructing Transaction...`);
            if (status === 'confirmed') {
                console.log(`🎉 [Status: CONFIRMED] Swap Executed!`);
                console.log(`   TxHash: ${event.txHash}`);
                console.log(`   Final Price: ${event.finalPrice}`);
                console.log(`   DEX: ${event.dex}`);
                ws.close();
                process.exit(0);
            }
            if (status === 'failed') {
                console.log(`❌ [Status: FAILED] ${event.error}`);
                ws.close();
                process.exit(1);
            }
        });

        ws.on('error', (err) => {
            console.error('❌ WebSocket Error:', err.message);
        });

    } catch (err) {
        console.error('❌ Demo Failed:', err);
    }
}

// Wait for server to be ready (user should run this in separate terminal)
runDemo();
