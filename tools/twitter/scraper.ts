import { Scraper, Tweet } from "@the-convocation/twitter-scraper";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// Define the SafeTweet interface
interface SafeTweet extends Tweet {
  text: string;
}

interface TwitterScraperOptions {
  query: string;
  maxTweets?: number;
}

class TwitterScraperTool extends DynamicStructuredTool {
  private scraper: Scraper;

  constructor() {
    super({
      name: "twitter_trend_analyzer",
      description: "Scrapes Twitter for trending topics and crypto-related tweets. Use this to get real-time Twitter data and analyze crypto trends, hashtags, and sentiment patterns.",
      schema: z.object({
        query: z.string().describe("The Twitter search query to analyze (e.g., 'bitcoin', 'ethereum', 'crypto trading')"),
        maxTweets: z.number().optional().describe("Maximum number of tweets to collect (default: 50)")
      }),
      func: async (input: { query: string; maxTweets?: number }) => {
        const scraper = new Scraper();
        try {
          // Validate input
          if (!input.query) {
            throw new Error("Search query is required");
          }
          
          // Set default max tweets if not specified
          const maxTweets = input.maxTweets || 50;
          
          // Collect tweets
          const tweets: SafeTweet[] = [];
          
          // Use getTweets method
          for await (const tweet of scraper.getTweets(input.query, maxTweets)) {
            // Ensure tweet has text property
            if (tweet && typeof tweet.text === 'string') {
              tweets.push(tweet as SafeTweet);
            }
          }
          
          // Analyze tweets for crypto trends
          const analysis = this.analyzeTweets(tweets);
          return JSON.stringify({
            query: input.query,
            totalTweets: tweets.length,
            analysis
          });
        } catch (error) {
          return JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: 'TWITTER_SCRAPE_FAILED'
          });
        }
      }
    });
    this.scraper = new Scraper();
  }

  // Basic sentiment and trend analysis
  private analyzeTweets(tweets: SafeTweet[]): any {
    // Crypto-related keywords to watch
    const cryptoKeywords = [
      'bitcoin', 'crypto', 'ethereum', 'blockchain',
      'altcoin', 'trading', 'defi', 'nft'
    ];
    
    // Analyze tweets with type-safe checks
    const cryptoTweets = tweets.filter(tweet =>
      cryptoKeywords.some(keyword =>
        tweet.text.toLowerCase().includes(keyword)
      )
    );
    
    // Basic sentiment (very simple implementation)
    const sentimentAnalysis = {
      totalCryptoTweets: cryptoTweets.length,
      potentiallyPositiveTweets: cryptoTweets.filter(tweet =>
        tweet.text.includes('🚀') ||
        tweet.text.toLowerCase().includes('bullish') ||
        tweet.text.toLowerCase().includes('moon')
      ).length,
      topHashtags: this.extractTopHashtags(cryptoTweets)
    };
    
    return sentimentAnalysis;
  }

  // Extract top hashtags from tweets
  private extractTopHashtags(tweets: SafeTweet[]): string[] {
    const hashtagCounts: {[key: string]: number} = {};
    
    tweets.forEach(tweet => {
      const hashtags = tweet.text.match(/#\w+/g) || [];
      hashtags.forEach(tag => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    });
    
    // Sort and return top 5 hashtags
    return Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }
}

export default TwitterScraperTool;