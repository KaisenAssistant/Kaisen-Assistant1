// tools/coingecko/CoinGeckoTool.ts
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import axios from "axios";

/**
 * Tool for fetching official Aptos token addresses from CoinGecko
 */
export class CoinGeckoTool extends DynamicStructuredTool {
  schema = z.object({
    tokenName: z.string().describe("The name or symbol of the token (e.g., 'APT', 'USDT', 'BTC')")
  });

  constructor() {
    super({
      name: "coin_gecko_aptos_contract_tool",
      description: "Fetches official contract addresses for tokens specifically on the Aptos blockchain from CoinGecko.",
      schema: z.object({
        tokenName: z.string().describe("The name or symbol of the token (e.g., 'APT', 'USDT', 'BTC')")
      }),
      func: async ({ tokenName }: { tokenName: string }): Promise<string> => {
        try {
          // Search for the coin ID using the token name
          const searchResponse = await axios.get(
            `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(tokenName)}`
          );
          
          const coins = searchResponse.data.coins;
          if (!coins || coins.length === 0) {
            return JSON.stringify({
              success: false,
              message: `No token found with name '${tokenName}'`
            });
          }
          
          // Filter and check each coin for Aptos platform support
          let aptosTokens = [];
          
          for (const coin of coins) {
            try {
              const coinId = coin.id;
              // Fetch coin data to get the contract address
              const response = await axios.get(
                `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`
              );
              
              const platforms = response.data.platforms;
              
              // Check if the token has an Aptos address
              if (platforms && platforms.aptos) {
                aptosTokens.push({
                  name: coin.name,
                  symbol: coin.symbol.toUpperCase(),
                  address: platforms.aptos
                });
              }
            } catch (error) {
              // Continue to next coin if there's an error with this one
              console.error(`Error fetching data for ${coin.id}: ${error}`);
            }
          }
          
          if (aptosTokens.length === 0) {
            return JSON.stringify({
              success: false,
              message: `No tokens on Aptos blockchain found for '${tokenName}'`
            });
          } else if (aptosTokens.length === 1) {
            return JSON.stringify({
              success: true,
              ...aptosTokens[0]
            });
          } else {
            // If we have multiple matching tokens on Aptos, return them all
            return JSON.stringify({
              success: true,
              message: `Found ${aptosTokens.length} tokens on Aptos blockchain for '${tokenName}'`,
              tokens: aptosTokens
            });
          }
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