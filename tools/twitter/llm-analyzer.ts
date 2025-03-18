import OpenAI from 'openai';

// Define the trading recommendation interface
interface TradingRecommendation {
  recommendation: "BUY" | "SELL" | "HOLD";
  confidence: number; // 0-100
  reasoning: string;
  marketSentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  keyInsights: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

// The ScraperResult interface
interface ScraperResult {
  query: string;
  totalTweets: number;
  analysis: {
    totalCryptoTweets: number;
    potentiallyPositiveTweets: number;
    topHashtags: string[];
  };
}

class LLMTradingAnalyzer {
  private openai: OpenAI;
  private siteInfo: {
    url: string;
    name: string;
  };
  private readonly DEFAULT_CONFIDENCE_THRESHOLD = 60;

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
      modelName: string = 'google/gemini-2.0-flash-001',
      confidenceThreshold: number = this.DEFAULT_CONFIDENCE_THRESHOLD
  ): Promise<TradingRecommendation> {
    try {
      // Create a prompt for the API
      const prompt = this.createTradingPrompt(scraperResult, cryptoSymbol);

      // Call the OpenRouter API
      const response = await this.openai.chat.completions.create({
        model: modelName,
        max_tokens: 1200,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: "You are a cryptocurrency trading expert analyzing Twitter sentiment. " + "Your analysis must be Balanced and evidence-based,Skeptical of hype " +
                "or excessive negativity,Conservative in confidence scores (only >80 for strong signals)" + "The guidelines for recommendation are  BUY: Recommend " +
                "only with strong positive signals AND price not recently pumped ,  SELL : Recommend only with strong negative signals AND declining sentiment, " +
                "HOLD: Default position when signals are mixed or weak" + "Confidence scoring:\n" +
                "            - 80-100: Very strong conviction with multiple confirming signals\n" +
                "            - 60-79: Moderate conviction with some confirming signals\n" +
                "            - 0-59: Low conviction or mixed signals\n" +
                "  you must answer in great detail and give a very detailed resposnse       "+

                "You MUST respond ONLY with the JSON object as specified in the prompt, no other text."
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

        return JSON.parse(jsonMatch[0]) as TradingRecommendation;
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);
        // Return a default recommendation if parsing fails
        return this.getDefaultRecommendation();
      }
    } catch (error) {
      console.error("Error calling API:", error);
      return this.getDefaultRecommendation();
    }
  }

  private createTradingPrompt(scraperResult: ScraperResult, cryptoSymbol: string): string {
    const { query, totalTweets, analysis } = scraperResult;
    const { totalCryptoTweets, potentiallyPositiveTweets, topHashtags } = analysis;

    // Calculate a basic sentiment score based on positive tweets
    const sentimentScore = totalCryptoTweets > 0
        ? (potentiallyPositiveTweets / totalCryptoTweets) * 100
        : 0;

    // Create the prompt
    return `
CRYPTO SYMBOL: ${cryptoSymbol}
TWITTER SENTIMENT ANALYSIS:
- Query: "${query}"
- Total tweets analyzed: ${totalTweets}
- Crypto-related tweets: ${totalCryptoTweets}
- Potentially positive tweets: ${potentiallyPositiveTweets}
- Sentiment score (0-100): ${Math.round(sentimentScore)}
- Top hashtags: ${topHashtags.join(', ')}

Based on this Twitter data, provide a trading recommendation in the following JSON format:
{
  "recommendation": "BUY" or "SELL" or "HOLD",
  "confidence": [number between 0-100],
  "reasoning": [concise explanation],
  "marketSentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "keyInsights": [array of key observations from the data],
  "riskLevel": "LOW" or "MEDIUM" or "HIGH"
}

Respond ONLY with the JSON object, no other text.
    `;
  }

  private getDefaultRecommendation(): TradingRecommendation {
    return {
      recommendation: "HOLD",
      confidence: 0,
      reasoning: "Error processing sentiment analysis",
      marketSentiment: "NEUTRAL",
      keyInsights: ["Error in analysis"],
      riskLevel: "HIGH"
    };
  }
}

export default LLMTradingAnalyzer;
