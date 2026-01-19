export type OrderType = 'MARKET' | 'LIMIT' | 'SNIPER';
export type OrderStatus = 'pending' | 'routing' | 'processing' | 'confirmed' | 'failed';

export interface Order {
    id: string;
    type: OrderType;
    side: 'buy' | 'sell';
    inputToken: string;
    outputToken: string;
    amount: number;
    status: OrderStatus;
    txHash?: string;
    executionPrice?: number;
    createdAt: Date;
}

export interface CreateOrderRequest {
    type: OrderType;
    side: 'buy' | 'sell';
    inputToken: string;
    outputToken: string;
    amount: number;
}
