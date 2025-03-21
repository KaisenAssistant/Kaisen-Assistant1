import OpenAI from 'openai';

interface TradingRecommendation {
  recommendation: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasoning: string;
  marketSentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  keyInsights: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

interface ScraperResult {
  query: string;
  totalTweets: number;
  sampleTweets: string[];
  timestamp: number;
  analysis: {
    totalCryptoTweets: number;
    potentiallyPositiveTweets: number;
    potentiallyNegativeTweets: number;
    neutralTweets: number;
    topHashtags: string[];
    influentialAccounts: string[];
    sentimentTrend: "RISING" | "FALLING" | "STABLE";
  };
  priceData?: {
    current: number;
    yesterday: number;
    weekAgo: number;
    percentChange24h: number;
    percentChange7d: number;
  };
}

// Interface for model response
interface ModelResponse {
  recommendation: TradingRecommendation;
  model: string;
}

class LLMTradingAnalyzer {
  private openai: OpenAI;
  private siteInfo: {
    url: string;
    name: string;
  };
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 60;
  private readonly DATA_FRESHNESS_THRESHOLD = 60 * 60 * 1000;

  constructor(apiKey: string, siteUrl: string = '', siteName: string = '') {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1'
    });

    this.siteInfo = {
      url: siteUrl,
      name: siteName
    };
  }


  async analyzeTradingDecision(
      scraperResult: ScraperResult,
      cryptoSymbol: string,
      primaryModel: string = 'google/gemini-2.0-flash-001',
      confidenceThreshold: number = this.DEFAULT_CONFIDENCE_THRESHOLD
  ): Promise<TradingRecommendation> {
    try {

      if (!this.validateScraperResult(scraperResult)) {
        console.warn("Scraper data failed validation, returning default recommendation");
        return this.getDefaultRecommendation("Insufficient or low-quality data");
      }

      const modelResponse: ModelResponse = {
        model: primaryModel,
        recommendation: await this.getModelRecommendation(scraperResult, cryptoSymbol, primaryModel)
      };

      return this.applyBusinessRules(modelResponse.recommendation, confidenceThreshold);
    } catch (error) {
      console.error("Error analyzing trading decision:", error);
      return this.getDefaultRecommendation("Error in analysis process");
    }
  }

  // Get a recommendation from a specific model
  private async getModelRecommendation(
      scraperResult: ScraperResult,
      cryptoSymbol: string,
      modelName: string
  ): Promise<TradingRecommendation> {
    try {
      // Create an enriched prompt with more context
      const prompt = this.createEnhancedTradingPrompt(scraperResult, cryptoSymbol);

      // Call the OpenRouter API with improved system prompt
      const response = await this.openai.chat.completions.create({
        model: modelName,
        max_tokens: 1200,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You are a cryptocurrency trading expert analyzing Twitter sentiment and market data. 
            
            Your analysis must be:
            - Balanced and evidence-based
            - Skeptical of hype or excessive negativity
            - Conservative in confidence scores (only >80 for strong signals)
            
            Guidelines for recommendation:
            - BUY: Recommend only with strong positive signals AND price not recently pumped
            - SELL: Recommend only with strong negative signals AND declining sentiment
            - HOLD: Default position when signals are mixed or weak
            
            Confidence scoring:
            - 80-100: Very strong conviction with multiple confirming signals
            - 60-79: Moderate conviction with some confirming signals
            - 0-59: Low conviction or mixed signals
            
            Risk assessment:
            - HIGH: Volatile sentiment, contradictory signals, thin data
            - MEDIUM: Some uncertainty but consistent trends
            - LOW: Clear signals, strong consensus, abundant data
            
            You MUST respond ONLY with the JSON object as specified in the prompt, no other text.`
          },
          { role: "user", content: prompt }
        ]
      }, {
        headers: {
          'HTTP-Referer': this.siteInfo.url,
          'X-Title': this.siteInfo.name
        }
      });

      // Get the response text
      const responseText = response.choices[0]?.message?.content || '';

      // Parse the JSON response
      try {
        // Extract JSON from the response (in case there's additional text)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }

        const recommendation = JSON.parse(jsonMatch[0]) as TradingRecommendation;
        return this.validateRecommendation(recommendation);
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);

        return this.getDefaultRecommendation("Error parsing model response");
      }
    } catch (error) {
      console.error("Error calling API:", error);
      return this.getDefaultRecommendation("API call failed");
    }
  }

  private createEnhancedTradingPrompt(scraperResult: ScraperResult, cryptoSymbol: string): string {
    const { query, totalTweets, sampleTweets, analysis, priceData } = scraperResult;
    const {
      totalCryptoTweets,
      potentiallyPositiveTweets,
      potentiallyNegativeTweets,
      neutralTweets,
      topHashtags,
      influentialAccounts,
      sentimentTrend
    } = analysis;

    const positiveRatio = totalCryptoTweets > 0 ? (potentiallyPositiveTweets / totalCryptoTweets) * 100 : 0;
    const negativeRatio = totalCryptoTweets > 0 ? (potentiallyNegativeTweets / totalCryptoTweets) * 100 : 0;
    const neutralRatio = totalCryptoTweets > 0 ? (neutralTweets / totalCryptoTweets) * 100 : 0;

    const sentimentBreakdown = `
    - Positive tweets: ${potentiallyPositiveTweets} (${Math.round(positiveRatio)}%)
    - Negative tweets: ${potentiallyNegativeTweets} (${Math.round(negativeRatio)}%)
    - Neutral tweets: ${neutralTweets} (${Math.round(neutralRatio)}%)
    - Overall sentiment trend: ${sentimentTrend}`;

    const priceContext = priceData ? `
    PRICE DATA:
    - Current price: $${priceData.current}
    - 24h change: ${priceData.percentChange24h > 0 ? '+' : ''}${priceData.percentChange24h}%
    - 7d change: ${priceData.percentChange7d > 0 ? '+' : ''}${priceData.percentChange7d}%` : '';

    const tweetSamples = sampleTweets && sampleTweets.length > 0
        ? `
    SAMPLE TWEETS:
    ${sampleTweets.slice(0, 5).map(tweet => `- "${tweet}"`).join('\n')}`
        : '';

    const influencers = influentialAccounts && influentialAccounts.length > 0
        ? `
    INFLUENTIAL ACCOUNTS DISCUSSING:
    ${influentialAccounts.join(', ')}`
        : '';

    return `
CRYPTO SYMBOL: ${cryptoSymbol}
TWITTER SENTIMENT ANALYSIS:
- Query: "${query}"
- Total tweets analyzed: ${totalTweets}
- Crypto-related tweets: ${totalCryptoTweets}${sentimentBreakdown}
- Top hashtags: ${topHashtags.join(', ')}${influencers}${tweetSamples}${priceContext}

Based on this Twitter data and any available market information, provide a trading recommendation in the following JSON format:
{
  "recommendation": "BUY" or "SELL" or "HOLD",
  "confidence": [number between 0-100],
  "reasoning": [concise explanation with specific evidence from data],
  "marketSentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "keyInsights": [array of 3-5 key observations from the data],
  "riskLevel": "LOW" or "MEDIUM" or "HIGH"
}

Remember to balance social media sentiment with market factors. Be conservative in your recommendation and confidence level when data is limited or contradictory.

Respond ONLY with the JSON object, no other text.
    `;
  }

  private validateScraperResult(result: ScraperResult): boolean {

    if (!result || !result.analysis) {
      return false;
    }

    if (result.totalTweets < 50 || result.analysis.totalCryptoTweets < 20) {
      console.warn("Insufficient tweet volume for reliable analysis");
      return false;
    }

    // Check data freshness
    const currentTime = Date.now();
    if (currentTime - result.timestamp > this.DATA_FRESHNESS_THRESHOLD) {
      console.warn("Data is stale, over 1 hour old");
      return false;
    }

    return true;
  }

  // Validate and sanitize the recommendation
  private validateRecommendation(rec: TradingRecommendation): TradingRecommendation {

    if (rec.recommendation === "BUY" && rec.marketSentiment === "BEARISH") {
      console.warn("Inconsistent recommendation: BUY with BEARISH sentiment");
      rec.confidence = Math.min(rec.confidence, 40);
    }

    if (rec.recommendation === "SELL" && rec.marketSentiment === "BULLISH") {
      console.warn("Inconsistent recommendation: SELL with BULLISH sentiment");
      rec.confidence = Math.min(rec.confidence, 40);
    }

    rec.confidence = Math.max(0, Math.min(100, rec.confidence));

    if (!rec.keyInsights || rec.keyInsights.length === 0) {
      rec.keyInsights = ["Limited data available for analysis"];
    }

    return rec;
  }

  // Apply business rules to finalize recommendation
  private applyBusinessRules(
      recommendation: TradingRecommendation,
      confidenceThreshold: number
  ): TradingRecommendation {

    if (recommendation.confidence < confidenceThreshold &&
        recommendation.recommendation !== "HOLD") {
      return {
        ...recommendation,
        recommendation: "HOLD",
        reasoning: `Original ${recommendation.recommendation} recommendation had insufficient confidence (${recommendation.confidence}%). ${recommendation.reasoning}`,
        keyInsights: [...recommendation.keyInsights, `Confidence below threshold of ${confidenceThreshold}%`]
      };
    }

    if (recommendation.riskLevel === "HIGH" &&
        recommendation.confidence < 80 &&
        recommendation.recommendation !== "HOLD") {
      return {
        ...recommendation,
        recommendation: "HOLD",
        reasoning: `High risk situation with moderate confidence. Original recommendation: ${recommendation.recommendation}. ${recommendation.reasoning}`,
        keyInsights: [...recommendation.keyInsights, "High risk situation suggests caution"]
      };
    }

    return recommendation;
  }

  private getDefaultRecommendation(reason: string = "Insufficient data"): TradingRecommendation {
    return {
      recommendation: "HOLD",
      confidence: 0,
      reasoning: `Default HOLD recommendation due to: ${reason}`,
      marketSentiment: "NEUTRAL",
      keyInsights: [reason, "System defaulted to conservative position"],
      riskLevel: "HIGH"
    };
  }
}

export default LLMTradingAnalyzer;
