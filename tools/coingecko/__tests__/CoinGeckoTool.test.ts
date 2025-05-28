import { CoinGeckoTool } from '../CoinGeckoTool';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('CoinGeckoTool', () => {
    let mock: MockAdapter;
    let tool: CoinGeckoTool;

    beforeEach(() => {
        mock = new MockAdapter(axios);
        tool = new CoinGeckoTool();
        // Clear the cache before each test
        (CoinGeckoTool as any).cache.clear();
        (CoinGeckoTool as any).pendingRequests.clear();
    });

    afterEach(() => {
        mock.reset();
    });

    it('should return cached result if available and not expired', async () => {
        const cachedData = {
            success: true,
            name: 'Test Token',
            symbol: 'TEST',
            address: '0x123'
        };

        // Set cache manually
        (CoinGeckoTool as any).cache.set('test', {
            data: cachedData,
            timestamp: Date.now()
        });

        const result = await tool.func({ tokenName: 'test' });
        expect(JSON.parse(result)).toEqual(cachedData);
        expect(mock.history.get).toHaveLength(0); // No API calls should be made
    });

    it('should fetch and return token data when not in cache', async () => {
        const mockSearchResponse = {
            coins: [
                {
                    id: 'test-token',
                    name: 'Test Token',
                    symbol: 'test'
                }
            ]
        };

        const mockCoinResponse = {
            platforms: {
                aptos: '0x123'
            }
        };

        mock.onGet(/\/search/).reply(200, mockSearchResponse);
        mock.onGet(/\/coins\/test-token/).reply(200, mockCoinResponse);

        const result = await tool.func({ tokenName: 'test' });
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toEqual({
            success: true,
            name: 'Test Token',
            symbol: 'TEST',
            address: '0x123'
        });
    });

    it('should handle multiple tokens and return all Aptos addresses', async () => {
        const mockSearchResponse = {
            coins: [
                {
                    id: 'token1',
                    name: 'Token One',
                    symbol: 't1'
                },
                {
                    id: 'token2',
                    name: 'Token Two',
                    symbol: 't2'
                }
            ]
        };

        const mockCoinResponses = {
            'token1': {
                platforms: {
                    aptos: '0x123'
                }
            },
            'token2': {
                platforms: {
                    aptos: '0x456'
                }
            }
        };

        mock.onGet(/\/search/).reply(200, mockSearchResponse);
        mock.onGet(/\/coins\/token1/).reply(200, mockCoinResponses.token1);
        mock.onGet(/\/coins\/token2/).reply(200, mockCoinResponses.token2);

        const result = await tool.func({ tokenName: 'token' });
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toEqual({
            success: true,
            message: 'Found 2 tokens on Aptos blockchain for \'token\'',
            tokens: [
                {
                    name: 'Token One',
                    symbol: 'T1',
                    address: '0x123'
                },
                {
                    name: 'Token Two',
                    symbol: 'T2',
                    address: '0x456'
                }
            ]
        });
    });

    it('should handle no tokens found', async () => {
        mock.onGet(/\/search/).reply(200, { coins: [] });

        const result = await tool.func({ tokenName: 'nonexistent' });
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toEqual({
            success: false,
            message: 'No token found with name \'nonexistent\''
        });
    });

    it('should handle no Aptos tokens found', async () => {
        const mockSearchResponse = {
            coins: [
                {
                    id: 'token1',
                    name: 'Token One',
                    symbol: 't1'
                }
            ]
        };

        const mockCoinResponse = {
            platforms: {
                ethereum: '0x123' // No Aptos address
            }
        };

        mock.onGet(/\/search/).reply(200, mockSearchResponse);
        mock.onGet(/\/coins\/token1/).reply(200, mockCoinResponse);

        const result = await tool.func({ tokenName: 'token' });
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toEqual({
            success: false,
            message: 'No tokens on Aptos blockchain found for \'token\''
        });
    });

    it('should handle API errors gracefully', async () => {
        mock.onGet(/\/search/).reply(500);

        const result = await tool.func({ tokenName: 'test' });
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toEqual({
            success: false,
            message: expect.stringContaining('Error fetching contract address')
        });
    });

    it('should deduplicate concurrent requests for the same token', async () => {
        const mockSearchResponse = {
            coins: [
                {
                    id: 'test-token',
                    name: 'Test Token',
                    symbol: 'test'
                }
            ]
        };

        const mockCoinResponse = {
            platforms: {
                aptos: '0x123'
            }
        };

        mock.onGet(/\/search/).reply(200, mockSearchResponse);
        mock.onGet(/\/coins\/test-token/).reply(200, mockCoinResponse);

        // Make two concurrent requests
        const [result1, result2] = await Promise.all([
            tool.func({ tokenName: 'test' }),
            tool.func({ tokenName: 'test' })
        ]);

        expect(JSON.parse(result1)).toEqual(JSON.parse(result2));
        // Should only make one set of API calls
        expect(mock.history.get.filter(req => req.url?.includes('/search'))).toHaveLength(1);
        expect(mock.history.get.filter(req => req.url?.includes('/coins/'))).toHaveLength(1);
    });
});