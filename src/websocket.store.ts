import { WebSocket } from 'ws';

// In-memory store for active WebSocket connections (mapped by orderId)
export const orderConnections = new Map<string, WebSocket>();
