import { Aptos, AptosConfig, Ed25519PrivateKey, Network, PrivateKey, PrivateKeyVariants } from "@aptos-labs/ts-sdk"
import { ChatOpenAI } from "@langchain/openai"
import { AIMessage, BaseMessage, ChatMessage, HumanMessage } from "@langchain/core/messages"
import { MemorySaver } from "@langchain/langgraph"
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { Message as VercelChatMessage } from "ai"
import { AgentRuntime, LocalSigner, createAptosTools } from "move-agent-kit"
import { NextResponse } from "next/server"
import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"

// Import the LLMTradingAnalyzer
import LLMTradingAnalyzer from "@/tools/twitter/llm-analyzer"



// TODO: make a key at openrouter.ai/keys and put it in .env
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"

const textDecoder = new TextDecoder()

// Create a trading analyzer tool
function createTradingAnalyzerTool(analyzer: LLMTradingAnalyzer) {
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
			// Create a ScraperResult object from the inputs with default values
			const scraperResult = {
				query,
				// The AND is not going to get trigger due to generation in TradingAnalyzerTool.ts
				totalTweets: totalTweets ?? 2000, // Default to 5000 if undefined
				analysis: {
					totalCryptoTweets: totalCryptoTweets ?? 1800, // Default to 1800 if undefined
					potentiallyPositiveTweets: positiveCount ?? 1000, // Default to 1000 if undefined
					topHashtags: hashtags
				}
			};


			// Use the analyzer to get a recommendation
			const recommendation = await analyzer.analyzeTradingDecision(scraperResult, cryptoSymbol);

			// Return the recommendation as a formatted string
			return JSON.stringify(recommendation, null, 2);
		}
	});
}

// Function to read and process the stream
async function readStream(stream: any) {
	try {
		// Create a reader from the stream
		const reader = stream.getReader()

		let result = ""

		while (true) {
			// Read each chunk from the stream
			const { done, value } = await reader.read()

			// If the stream is finished, break the loop
			if (done) {
				break
			}

			// Decode the chunk and append to result
			result += textDecoder.decode(value, { stream: true })
		}

		// Final decode to handle any remaining bytes
		result += textDecoder.decode()

		return result
	} catch (error) {
		console.error("Error reading stream:", error)
		throw error
	}
}

const convertVercelMessageToLangChainMessage = (message: VercelChatMessage) => {
	if (message.role === "user") {
		return new HumanMessage(message.content)
	} else if (message.role === "assistant") {
		return new AIMessage(message.content)
	} else {
		return new ChatMessage(message.content, message.role)
	}
}

const convertLangChainMessageToVercelMessage = (message: BaseMessage) => {
	if (message._getType() === "human") {
		return { content: message.content, role: "user" }
	} else if (message._getType() === "ai") {
		return {
			content: message.content,
			role: "assistant",
			tool_calls: (message as AIMessage).tool_calls,
		}
	} else {
		return { content: message.content, role: message._getType() }
	}
}

export async function POST(request: Request) {
	try {
		// Initialize Aptos configuration
		const aptosConfig = new AptosConfig({
			network: Network.TESTNET,
		})

		const aptos = new Aptos(aptosConfig)

		// Validate and get private key from environment
		const privateKeyStr = process.env.APTOS_PRIVATE_KEY
		if (!privateKeyStr) {
			throw new Error("Missing APTOS_PRIVATE_KEY environment variable")
		}

		// Setup account and signer
		const account = await aptos.deriveAccountFromPrivateKey({
			privateKey: new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyStr, PrivateKeyVariants.Ed25519)),
		})

		const signer = new LocalSigner(account, Network.TESTNET)
		const aptosAgent = new AgentRuntime(signer, aptos, {
			PANORA_API_KEY: process.env.PANORA_API_KEY,
		})

		// Initialize the LLM
		// @ts-ignore
		const llm = await new ChatOpenAI({
			modelName: "google/gemini-2.0-flash-001",
			openAIApiKey: OPENROUTER_API_KEY,
			configuration: {
				baseURL: OPENROUTER_BASE_URL,
			},
			streaming: true,
		})

		// Initialize the Trading Analyzer
		const tradingAnalyzer = new LLMTradingAnalyzer(
			OPENROUTER_API_KEY || "",
			"https://yourwebsite.com", // Your site URL for OpenRouter analytics
			"Crypto Trading Assistant" // Your app name for OpenRouter analytics
		)

		// Get the Aptos tools
		const aptosTools = createAptosTools(aptosAgent)

		// Create the trading analyzer tool
		const tradingAnalyzerTool = createTradingAnalyzerTool(tradingAnalyzer)

		// Combine all tools
		const allTools = [...aptosTools, tradingAnalyzerTool]

		const memory = new MemorySaver()

		// Create React agent with combined tools
		const agent = createReactAgent({
			llm,
			tools: allTools,
			checkpointSaver: memory,
			messageModifier: `
        You are a helpful agent that can interact onchain using the Aptos Agent Kit and analyze cryptocurrency trading sentiment. You are
        empowered to interact onchain using your tools and provide trading recommendations based on Twitter sentiment analysis.
        
        If you ever need funds, you can request them from the faucet. If not, you can provide your wallet details and request funds from the user.
        
        You can analyze Twitter sentiment for cryptocurrencies using the analyze_crypto_sentiment tool, which will provide
        trading recommendations based on social media sentiment. This is useful for users who want to make informed trading decisions.
        
        If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone asks you to do something you
        can't do with your currently available tools, you must say so, and encourage them to implement it
        themselves using the Aptos Agent Kit, recommend they go to https://www.aptosagentkit.xyz for more information. Be
        concise and helpful with your responses. Refrain from restating your tools' descriptions unless it is explicitly requested.

		The response also contains token/token[] which contains the name and address of the token and the decimals.
		WHEN YOU RETURN ANY TOKEN AMOUNTS, RETURN THEM ACCORDING TO THE DECIMALS OF THE TOKEN.
      `,
		})

		// Parse request body
		const body = await request.json()
		const messages = body.messages ?? []
		const showIntermediateSteps = body.show_intermediate_steps ?? false

		if (!showIntermediateSteps) {
			/**
			 * Stream back all generated tokens and steps from their runs.
			 *
			 * We do some filtering of the generated events and only stream back
			 * the final response as a string.
			 *
			 * For this specific type of tool calling ReAct agents with OpenAI, we can tell when
			 * the agent is ready to stream back final output when it no longer calls
			 * a tool and instead streams back content.
			 *
			 * See: https://langchain-ai.github.io/langgraphjs/how-tos/stream-tokens/
			 */
			const eventStream = await agent.streamEvents(
				{ messages },
				{
					version: "v2",
					configurable: {
						thread_id: "Aptos Agent Kit!",
					},
				}
			)

			const textEncoder = new TextEncoder()
			const transformStream = new ReadableStream({
				async start(controller) {
					for await (const { event, data } of eventStream) {
						if (event === "on_chat_model_stream") {
							if (data.chunk.content) {
								if (typeof data.chunk.content === "string") {
									controller.enqueue(textEncoder.encode(data.chunk.content))
								} else {
									for (const content of data.chunk.content) {
										controller.enqueue(textEncoder.encode(content.text ? content.text : ""))
									}
								}
							}
						}
					}
					controller.close()
				},
			})

			return new Response(transformStream)
		} else {
			/**
			 * We could also pick intermediate steps out from `streamEvents` chunks, but
			 * they are generated as JSON objects, so streaming and displaying them with
			 * the AI SDK is more complicated.
			 */
			const result = await agent.invoke({ messages })

			console.log("result", result)

			return NextResponse.json(
				{
					messages: result.messages.map(convertLangChainMessageToVercelMessage),
				},
				{ status: 200 }
			)
		}
	} catch (error: any) {
		console.error("Request error:", error)
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "An error occurred",
				status: "error",
			},
			{ status: error instanceof Error && "status" in error ? 500 : 500 }
		)
	}
}
