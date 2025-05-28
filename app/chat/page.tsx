"use client";

import React, { useState, useCallback, useEffect, Suspense } from "react";
import { ChatWindow } from "@/components/ChatWindow";
import { useSearchParams, useRouter } from "next/navigation";

const ChatPageContent = () => {
    const userName: string = "John";
    const [walletAddress, setWalletAddress] = useState<string>("");
    const searchParams = useSearchParams();
    const router = useRouter();

    // State for chat functionality
    const [questionToSubmit, setQuestionToSubmit] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Check wallet connection on component mount
    useEffect(() => {
        const checkWalletConnection = async () => {
            try {
                // First check URL parameters
                const addressFromParams = searchParams.get("address");
                console.log("Address from params:", addressFromParams);

                if (addressFromParams) {
                    setWalletAddress(addressFromParams);
                    localStorage.setItem("walletAddress", addressFromParams);
                    return;
                }

                // Then check localStorage
                const storedAddress = localStorage.getItem("walletAddress");
                console.log("Stored address:", storedAddress);

                if (storedAddress) {
                    setWalletAddress(storedAddress);
                    return;
                }

                // Finally check if wallet is still connected
                if (typeof window !== "undefined" && window.petra) {
                    const isConnected = await window.petra.isConnected();
                    if (isConnected) {
                        const account = await window.petra.account();
                        if (account) {
                            setWalletAddress(account.address);
                            localStorage.setItem("walletAddress", account.address);
                            return;
                        }
                    }
                }

                // If no wallet is connected, redirect to home
                console.log("No wallet connected, redirecting...");
                router.push("/");
            } catch (error) {
                console.error("Error checking wallet connection:", error);
                router.push("/");
            }
        };

        checkWalletConnection();
    }, [searchParams, router]);

    const currentTime: number = new Date().getHours();
    const greeting: string = currentTime >= 17 ? "Good Evening" : "Good Morning";

    const handleQuestionClick = useCallback((question: string) => {
        setQuestionToSubmit(question);
    }, []);

    const handleNewChatClick = useCallback(() => {
        setRefreshKey((prev) => prev + 1);
    }, []);

    const formatWalletAddress = (address: string) => {
        if (address.length > 10) {
            return `${address.slice(0, 6)}...${address.slice(-4)}`;
        }
        return address;
    };

    const InfoCard: React.ReactElement = (
        <section className="p-2 md:p-8 w-full max-h-[85%] overflow-hidden bg-transparent">
            <div className="text-center mb-20">
                <div className="flex justify-center">
                    <h3 className="flex flex-row text-4xl font-normal text-white max-[930px]:text-3xl max-[600px]:text-2xl">
                        {greeting}. <p className="text-[#A76BFF] ml-2.5">{userName}</p>
                    </h3>
                </div>
                <h2 className="text-6xl font-medium text-white max-[930px]:text-4xl max-[600px]:text-3xl">
                    How can I help you?
                </h2>
                <p className="text-2xl my-4 font-medium text-[#747474] max-[930px]:text-base max-[600px]:text-xs">
                    It all starts with a question. Ask anything from prices to trading
                    strategies. Kaisen turns your words into DeFi action.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-base">
                <button
                    onClick={() =>
                        handleQuestionClick("What's the current price of $BTC and $APT?")
                    }
                    className="p-3 rounded-lg border border-[#2A2F3C] text-[#E8EAED] hover:bg-[#2A2F3C] transition-colors max-[600px]:text-xs"
                    style={{
                        background: "linear-gradient(135deg, #2B2B2B, #151515, #202020)",
                    }}
                >
                    What's the current price of $BTC and $APT?
                </button>
                <button
                    onClick={() =>
                        handleQuestionClick("Show me the top 5 gainers on Aptos today")
                    }
                    className="p-3 rounded-lg border border-[#2A2F3C] text-[#E8EAED] hover:bg-[#2A2F3C] transition-colors max-[600px]:text-xs"
                    style={{
                        background: "linear-gradient(135deg, #2B2B2B, #151515, #202020)",
                    }}
                >
                    Show me the top 5 gainers on Aptos today
                </button>
                <button
                    onClick={() =>
                        handleQuestionClick("Any trending tokens I should watch?")
                    }
                    className="p-3 rounded-lg border border-[#2A2F3C] text-[#E8EAED] hover:bg-[#2A2F3C] transition-colors max-[600px]:text-xs"
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
        <section className="flex h-screen">
            <aside className="w-1/4 bg-[#121212] p-4 overflow-y-auto border-r border-[#2A2F3C] opacity-70">
                <div className="flex flex-col items-center mb-12">
                    <img
                        src="/kaisen_logo_chat_window.svg"
                        alt="kaisen-logo-ChatHistory"
                        className="mb-4"
                    />
                    <div className="px-4 py-2 bg-[#1E1E1E] rounded-lg text-white text-sm">
                        {walletAddress ? formatWalletAddress(walletAddress) : "Not Connected"}
                    </div>
                </div>
                <button
                    onClick={handleNewChatClick}
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

            <main className="w-3/4 p-6">
                <ChatWindow
                    endpoint="api/hello"
                    emoji="🤖"
                    titleText="KAISEN ASSISTANT"
                    placeholder="Ask about crypto trends and Twitter analysis..."
                    emptyStateComponent={InfoCard}
                    suggestedQuestion={questionToSubmit}
                    onQuestionSubmitted={() => setQuestionToSubmit(null)}
                    key={refreshKey}
                />
            </main>
        </section>
    );
};

export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChatPageContent />
        </Suspense>
    );
}
