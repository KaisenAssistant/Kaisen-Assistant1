import React from "react";
import { ChatWindow } from "@/components/ChatWindow";

export default function Home() {
  // User Data
  const userName: string = "John";
  const walletAddress: string = "0x4f1f6cbf61a6c80b12dc..."; // simulated wallet address

  // Greeting
  const currentTime: number = new Date().getHours();
  const greeting: string = currentTime >= 17 ? "Good Evening" : "Good Morning";

  const InfoCard: React.ReactElement = (
    <section className="p-2 md:p-8 w-full max-h-[85%] overflow-hidden bg-transparent">
      {/* Greeting and Prompt */}
      <div className="text-center mb-20">
        <div className="flex justify-center">
          <h3 className="flex flex-row text-4xl font-normal text-white">
            {greeting}. <p className="text-[#A76BFF] ml-2.5">{userName}</p>
          </h3>
        </div>
        <h2 className="text-6xl font-medium text-white">How can I help you?</h2>
        <p className="text-2xl my-4 font-medium text-[#747474]">
          It all starts with a question. Ask anything from prices to trading
          strategies. Kaisen turns your words into DeFi action.
        </p>
      </div>

      {/* Suggested Questions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button className="p-3 rounded-lg border border-[#2A2F3C] text-[#E8EAED] hover:bg-[#2A2F3C] transition-colors"
		style={{
			background: "linear-gradient(135deg, #2B2B2B, #151515, #202020)",
			}}		
		>
          What's the current price of $BTC and $APT?
        </button>
        <button className="p-3 rounded-lg border border-[#2A2F3C] text-[#E8EAED] hover:bg-[#2A2F3C] transition-colors"
		style={{
			background: "linear-gradient(135deg, #2B2B2B, #151515, #202020)",
			}}		
		>
          Show me the top 5 gainers on Aptos today
        </button>
        <button className="p-3 rounded-lg border border-[#2A2F3C] text-[#E8EAED] hover:bg-[#2A2F3C] transition-colors"
			style={{
				background: "linear-gradient(135deg, #2B2B2B, #151515, #202020)",
				}}		
		>
          Any trending tokens I should watch?
        </button>
      </div>
    </section>
  );

  return (
    <section className="flex h-screen bg-[url('/kaisen-background.svg')] bg-cover bg-no-repeat bg-center">
      {/* Sidebar for Past Chats */}
      <aside className="w-1/4 bg-[#121212] p-4 overflow-y-auto border-r border-[#2A2F3C] opacity-70">
        <div className="flex justify-center mb-12">
          <img src="/kaisen_logo_chat_window.svg" alt="kaisen-logo-ChatHistory" />
        </div>
        <button 
		className="w-full mb-4 p-2 text-white rounded-[9.54px] text-base transition-colors hover:bg-[#5A3FE6]"
		style={{
			background: "linear-gradient(135deg, #8F59E2, #7321EB, #7E45D6)",
			}}
		>
          + New Chat
        </button>
        <div className="flex flex-col gap-2">
          <div className="p-2 bg-[#27303F] rounded-lg border border-[#2A2F3C] text-[#A7A7B8]">
            {/* chat history */}
          </div>
        </div>
      </aside>

      {/* chat input area */}
      <main className="w-3/4 p-6">
        <ChatWindow
          endpoint="api/hello"
          emoji="🤖"
          titleText="KAISEN ASSISTANT"
          placeholder="Ask about crypto trends and Twitter analysis..."
          emptyStateComponent={InfoCard}
        />
      </main>
    </section>
  );
}