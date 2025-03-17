import { Scraper, Tweet } from "@the-convocation/twitter-scraper";
import { Tool } from "langchain/tools";

// Define the SafeTweet interface
interface SafeTweet extends Tweet {
  text: string;
}

interface TwitterScraperOptions {
  query: string;
  maxTweets?: number;
}

class TwitterScraperTool extends Tool {
  name = "twitter_trend_analyzer";
  description = "Scrapes Twitter for trending topics and crypto-related tweets";
  private scraper: Scraper;

  constructor() {
    super();
    this.scraper = new Scraper();
  }

  async _call(args: string): Promise<string> {
    try {
      // Parse input arguments
      const options: TwitterScraperOptions = JSON.parse(args);
      
      // Validate input
      if (!options.query) {
        throw new Error("Search query is required");
      }
      
      // Set default max tweets if not specified
      const maxTweets = options.maxTweets || 50;
      
      // Collect tweets
      const tweets: SafeTweet[] = [];
      
      // Use getTweets method
      for await (const tweet of this.scraper.getTweets(options.query, maxTweets)) {
        // Ensure tweet has text property
        if (tweet && typeof tweet.text === 'string') {
          tweets.push(tweet as SafeTweet);
        }
      }
      
      // Analyze tweets for crypto trends
      const analysis = this.analyzeTweets(tweets);
      return JSON.stringify({
        query: options.query,
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