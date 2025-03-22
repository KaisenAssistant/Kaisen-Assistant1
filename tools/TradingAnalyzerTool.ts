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
            negativeCount: z.number().optional().describe("Number of potentially negative tweets"),
            neutralCount: z.number().optional().describe("Number of neutral tweets"),
            hashtags: z.array(z.string()).optional().describe("Top hashtags found in the tweets"),
            influencers: z.array(z.string()).optional().describe("Influential accounts discussing the topic"),
            sampleTweets: z.array(z.string()).optional().describe("Sample tweets for analysis"),
            priceData: z.object({
                current: z.number(),
                yesterday: z.number(),
                weekAgo: z.number(),
                percentChange24h: z.number(),
                percentChange7d: z.number()
            }).optional().describe("Price data for the cryptocurrency"),
            confidenceThreshold: z.number().optional().describe("Confidence threshold for recommendations")
        }),
        func: async ({
                         cryptoSymbol,
                         query,
                         totalTweets = 1000,
                         totalCryptoTweets,
                         positiveCount,
                         negativeCount,
                         neutralCount,
                         hashtags = ["#crypto"],
                         influencers = [],
                         sampleTweets = [],
                         priceData,
                         confidenceThreshold
                     }) => {
            const actualTotalCryptoTweets = totalCryptoTweets ||
                Math.floor(totalTweets * (Math.random() * 0.3 + 0.1));

            const actualPositiveCount = positiveCount ||
                Math.floor(actualTotalCryptoTweets * (Math.random() * 0.4 + 0.2));
            const actualNegativeCount = negativeCount ||
                Math.floor(actualTotalCryptoTweets * (Math.random() * 0.3 + 0.1));
            const actualNeutralCount = neutralCount ||
                (actualTotalCryptoTweets - actualPositiveCount - actualNegativeCount);


            let sentimentTrend: "RISING" | "FALLING" | "STABLE";
            if (actualPositiveCount > actualNegativeCount * 1.5) {
                sentimentTrend = "RISING";
            } else if (actualNegativeCount > actualPositiveCount * 1.5) {
                sentimentTrend = "FALLING";
            } else {
                sentimentTrend = "STABLE";
            }

            const processedPriceData = priceData ? {
                current: priceData.current,
                yesterday: priceData.yesterday ?? (priceData.current * (1 - (Math.random() * 0.05 - 0.025))),
                weekAgo: priceData.weekAgo ?? (priceData.current * (1 - (Math.random() * 0.15 - 0.075))),
                percentChange24h: priceData.percentChange24h,
                percentChange7d: priceData.percentChange7d
            } : undefined;


            const scraperResult = {
                query,
                totalTweets,
                sampleTweets,
                timestamp: Date.now(),
                analysis: {
                    totalCryptoTweets: actualTotalCryptoTweets,
                    potentiallyPositiveTweets: actualPositiveCount,
                    potentiallyNegativeTweets: actualNegativeCount,
                    neutralTweets: actualNeutralCount,
                    topHashtags: hashtags,
                    influentialAccounts: influencers,
                    sentimentTrend
                },
                priceData: processedPriceData
            };

            // Call analyzer to get a recommendation with optional confidence threshold
            const recommendation = await analyzer.analyzeTradingDecision(
                scraperResult,
                cryptoSymbol,
                undefined,
                confidenceThreshold
            );

            // Return the recommendation as a formatted string
            return JSON.stringify(recommendation, null, 2);
        }
    });
}