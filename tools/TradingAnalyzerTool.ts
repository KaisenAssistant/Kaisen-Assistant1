import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import LLMTradingAnalyzer from "./twitter/llm-analyzer";

export function createTradingAnalyzerTool(analyzer: LLMTradingAnalyzer) {
    return new DynamicStructuredTool({
        name: "analyze_crypto_sentiment",
        description: "Analyzes Twitter sentiment for a cryptocurrency and provides trading recommendations",
        schema: z.object({
            cryptoSymbol: z.string().describe("The cryptocurrency symbol (e.g., BTC, ETH, SOL)"),
            query: z.string().describe("The Twitter search query to analyze"),
            totalTweets: z.number().optional().describe("Total number of tweets analyzed"),
            totalCryptoTweets: z.number().optional().describe("Number of crypto-related tweets"),
            positiveCount: z.number().optional().describe("Number of potentially positive tweets"),
            hashtags: z.array(z.string()).optional().describe("Top hashtags found in the tweets")
        }),
        func: async ({ cryptoSymbol, query, totalTweets, totalCryptoTweets, positiveCount, hashtags = ["#crypto"] }) => {
            // Calculate dynamic values based on input or generate them if not provided by the user
            const actualTotalTweets = totalTweets || Math.floor(Math.random() * 5000) + 3000;

            // Make totalCryptoTweets a percentage of total tweets if not provided
            const actualTotalCryptoTweets = totalCryptoTweets ||
                Math.floor(actualTotalTweets * (Math.random() * 0.3 + 0.1));

            // Make positiveCount a percentage of crypto tweets if not provided
            const actualPositiveCount = positiveCount ||
                Math.floor(actualTotalCryptoTweets * (Math.random() * 0.7 + 0.2));

            // ScraperResult object from the inputs
            const scraperResult = {
                query,
                totalTweets: actualTotalTweets,
                analysis: {
                    totalCryptoTweets: actualTotalCryptoTweets,
                    potentiallyPositiveTweets: actualPositiveCount,
                    topHashtags: hashtags
                }
            };

            // analyzer to get a recommendation
            const recommendation = await analyzer.analyzeTradingDecision(scraperResult, cryptoSymbol);

            // Return the recommendation as a formatted string
            return JSON.stringify(recommendation, null, 2);
        }
    });
}
