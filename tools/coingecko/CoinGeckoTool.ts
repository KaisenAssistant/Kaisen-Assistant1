// tools/coingecko/CoinGeckoTool.ts
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from "axios";

interface CoinGeckoCoin {
  id: string;
  name: string;
  symbol: string;
}

interface CoinGeckoPlatforms {
  aptos?: string;
  [key: string]: string | undefined;
}

interface CoinGeckoResponse {
  platforms: CoinGeckoPlatforms;
}

interface AptosToken {
  name: string;
  symbol: string;
  address: string;
}

/**
 * Tool for fetching official Aptos token addresses from CoinGecko
 */
export class CoinGeckoTool extends DynamicStructuredTool {
  schema = z.object({
    tokenName: z.string().describe("The name or symbol of the token (e.g., 'APT', 'USDT', 'BTC')")
  });

  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static cache: Map<string, { data: any, timestamp: number }> = new Map();
  private static pendingRequests: Map<string, Promise<any>> = new Map();

  constructor() {
    super({
      name: "coin_gecko_aptos_contract_tool",
      description: "Fetches official contract addresses for tokens specifically on the Aptos blockchain from CoinGecko.",
      schema: z.object({
        tokenName: z.string().describe("The name or symbol of the token (e.g., 'APT', 'USDT', 'BTC')")
      }),
      func: async ({ tokenName }: { tokenName: string }): Promise<string> => {
        try {
          // Check cache first
          const cacheKey = tokenName.toLowerCase();
          const cachedData = CoinGeckoTool.cache.get(cacheKey);
          if (cachedData && Date.now() - cachedData.timestamp < CoinGeckoTool.CACHE_DURATION) {
            return JSON.stringify(cachedData.data);
          }

          // Check if there's already a pending request for this token
          let pendingRequest = CoinGeckoTool.pendingRequests.get(cacheKey);
          if (pendingRequest) {
            const result = await pendingRequest;
            return JSON.stringify(result);
          }

          // Create new request
          pendingRequest = (async () => {
            try {
              // Search for the coin ID using the token name
              const searchResponse = await axios.get(
                  `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(tokenName)}`
              );

              const coins = searchResponse.data.coins as CoinGeckoCoin[];
              if (!coins || coins.length === 0) {
                const result = {
                  success: false,
                  message: `No token found with name '${tokenName}'`
                };
                CoinGeckoTool.cache.set(cacheKey, { data: result, timestamp: Date.now() });
                return result;
              }

              // Filter and check each coin for Aptos platform support
              let aptosTokens: AptosToken[] = [];

              // Batch process coins in parallel
              const coinPromises = coins.slice(0, 5).map(async (coin: CoinGeckoCoin) => {
                try {
                  const coinId = coin.id;
                  const response = await axios.get<CoinGeckoResponse>(
                      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`
                  );

                  const platforms = response.data.platforms;

                  if (platforms && platforms.aptos) {
                    return {
                      name: coin.name,
                      symbol: coin.symbol.toUpperCase(),
                      address: platforms.aptos
                    };
                  }
                } catch (error) {
                  console.error(`Error fetching data for ${coin.id}: ${error}`);
                }
                return null;
              });

              const results = await Promise.all(coinPromises);
              aptosTokens = results.filter((token): token is AptosToken => token !== null);

              let result;
              if (aptosTokens.length === 0) {
                result = {
                  success: false,
                  message: `No tokens on Aptos blockchain found for '${tokenName}'`
                };
              } else if (aptosTokens.length === 1) {
                result = {
                  success: true,
                  ...aptosTokens[0]
                };
              } else {
                result = {
                  success: true,
                  message: `Found ${aptosTokens.length} tokens on Aptos blockchain for '${tokenName}'`,
                  tokens: aptosTokens
                };
              }

              // Cache the result
              CoinGeckoTool.cache.set(cacheKey, { data: result, timestamp: Date.now() });
              return result;
            } finally {
              // Clean up pending request
              CoinGeckoTool.pendingRequests.delete(cacheKey);
            }
          })();

          // Store the pending request
          CoinGeckoTool.pendingRequests.set(cacheKey, pendingRequest);

          const result = await pendingRequest;
          return JSON.stringify(result);
        } catch (error) {
          return JSON.stringify({
            success: false,
            message: `Error fetching contract address: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
    });
  }
}

// Export an instance of the tool for easy import
export const coinGeckoTool = new CoinGeckoTool();