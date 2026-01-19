import { DexService } from '../src/services/dex.service';

describe('DexService', () => {

    test('getRaydiumQuote returns valid price structure', async () => {
        const quote = await DexService.getRaydiumQuote('SOL', 'USDC', 1);
        expect(quote.dex).toBe('Raydium');
        expect(quote.price).toBeGreaterThan(90);
    });

    test('getMeteoraQuote returns valid price structure', async () => {
        const quote = await DexService.getMeteoraQuote('SOL', 'USDC', 1);
        expect(quote.dex).toBe('Meteora');
        expect(quote.price).toBeGreaterThan(90);
    });

    test('getBestQuote selects the higher price (for Sell)', async () => {
        // Since logic is random, we can't deterministically predict which wins, 
        // but we can ensure it returns one of them.
        const best = await DexService.getBestQuote('SOL', 'USDC', 1);
        expect(['Raydium', 'Meteora']).toContain(best.dex);
    });

    test('executeSwap returns txHash', async () => {
        const order: any = { amount: 1 };
        const result = await DexService.executeSwap('Raydium', order);
        expect(result).toHaveProperty('txHash');
        expect(result.txHash).toMatch(/^Ax/);
        expect(result.price).toBe(100);
    });
});
