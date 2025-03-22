import { ChatWindow } from "@/components/ChatWindow"

export default function Home() {
	const InfoCard = (
		<div className="p-4 md:p-8 rounded-lg w-full max-h-[85%] overflow-hidden border border-[#2A2F3C]" 
			style={{
				background: "linear-gradient(145deg, #151A24, #1A2235)",
				boxShadow: "0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(104, 71, 255, 0.05)"
			}}
		>
			<div className="mb-6 flex items-center">
				<div className="w-10 h-10 rounded-full bg-[#6847FF] flex items-center justify-center mr-4">
					<span className="text-xl">₿</span>
				</div>
				<h1 className="text-3xl md:text-4xl font-semibold accent-glow">Welcome to Kaisen</h1>
			</div>
			
			<p className="text-l mb-6 text-[#E8EAED]">
				I'm KAISEN, your specialized crypto AI companion designed to analyze Twitter data. Powered by advanced language models, I help you make informed decisions in the cryptocurrency market through social media analysis.
			</p>
			
			<div className="p-3 rounded-lg bg-[#27303F] border border-[#2A2F3C]">
				<p className="text-sm text-[#A7A7B8]">
					<span className="text-[#6847FF] font-medium">TIP:</span> Ask me about current crypto trends, sentiment analysis, or specific cryptocurrency performance on Twitter!
				</p>
			</div>
		</div>
	)
	return (
		<ChatWindow
			endpoint="api/hello"
			emoji="🤖"
			titleText="KAISEN ASSISTANT"
			placeholder="Ask about crypto trends and Twitter analysis..."
			emptyStateComponent={InfoCard}
		></ChatWindow>
	)
}
