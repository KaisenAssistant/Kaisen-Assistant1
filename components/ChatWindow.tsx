"use client";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Message } from "ai";
import { useChat } from "ai/react";
import { ReactElement, useRef, useState, useEffect } from "react";
import type { FormEvent } from "react";

import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { IntermediateStep } from "@/components/IntermediateStep";

interface ChatWindowProps {
  endpoint: string;
  emptyStateComponent: ReactElement;
  placeholder?: string;
  titleText?: string;
  emoji?: string;
  showIntermediateStepsToggle?: boolean;
  suggestedQuestion?: string | null;
  onQuestionSubmitted?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  endpoint,
  emptyStateComponent,
  placeholder,
  titleText = "An LLM",
  showIntermediateStepsToggle,
  emoji,
  suggestedQuestion,
  onQuestionSubmitted,
}) => {
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Wallet-related states
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if Petra Wallet is installed and fetch wallet address
  useEffect(() => {
    const checkWallet = async () => {
      if (typeof window !== "undefined" && window.petra) {
        setIsInstalled(true);

        try {
          const isConnected = await window.petra?.isConnected();
          if (isConnected) {
            const account = await window.petra?.account();
            if (account) {
              setWalletAddress(account.address);
            }
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
        }
      }
    };

    checkWallet();
  }, []);

  const handleConnect = async () => {
    if (!isInstalled) {
      window.open("https://petra.app/", "_blank");
      return;
    }

    setIsConnecting(true);

    try {
      const response = await window.petra?.connect();
      if (response) {
        setWalletAddress(response.address);
        console.log("Connected to wallet:", response.address);
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!isInstalled || !window.petra) return;

    try {
      await window.petra.disconnect();
      setWalletAddress("");
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };

  // Button text based on wallet state
  const walletDisplayText = isConnecting
    ? "Connecting..."
    : walletAddress
    ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : !isInstalled
    ? "Install Petra Wallet"
    : "Connect your wallet";

  // Shadow design states (removed duplicate declaration)
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    const el = messageContainerRef.current;
    if (el) {
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;

      setIsAtTop(scrollTop <= 0);
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 1);
    }
  };

  useEffect(() => {
    const el = messageContainerRef.current;
    if (el) {
      handleScroll();
      el.addEventListener("scroll", handleScroll);
      return () => el.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const {
    messages,
    input: rawInput,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading: chatEndpointIsLoading,
    setMessages,
  } = useChat({
    api: endpoint,
    onResponse(response: Response) {
      const sourcesHeader = response.headers.get("x-sources");
      const sources: any[] = sourcesHeader
        ? JSON.parse(Buffer.from(sourcesHeader, "base64").toString("utf8"))
        : [];
      const messageIndexHeader = response.headers.get("x-message-index");
      if (sources.length && messageIndexHeader !== null) {
        setSourcesForMessages({
          ...sourcesForMessages,
          [messageIndexHeader]: sources,
        });
      }
    },
    streamMode: "text",
    onError: (e: Error) => {
      toast(e.message, {
        theme: "dark",
      });
    },
  });

  const input = rawInput ?? "";

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  const [showIntermediateSteps, setShowIntermediateSteps] = useState<boolean>(false);
  const [intermediateStepsLoading, setIntermediateStepsLoading] = useState<boolean>(false);
  const [sourcesForMessages, setSourcesForMessages] = useState<Record<string, any>>({});

  // scrolls to latest message
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTo({
        top: messageContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const sendMessage = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (messageContainerRef.current) {
      messageContainerRef.current.classList.add("grow");
    }
    if (!messages.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (chatEndpointIsLoading || intermediateStepsLoading) {
      return;
    }
    if (!showIntermediateSteps) {
      handleSubmit(e);
    } else {
      setIntermediateStepsLoading(true);
      setInput("");
      const messagesWithUserReply = messages.concat({
        id: messages.length.toString(),
        content: input,
        role: "user",
      });
      setMessages(messagesWithUserReply);
      const response = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify({
          messages: messagesWithUserReply,
          show_intermediate_steps: true,
        }),
      });
      const json = await response.json();
      setIntermediateStepsLoading(false);
      if (response.status === 200) {
        const responseMessages: Message[] = json.messages;
        const toolCallMessages = responseMessages.filter((responseMessage: Message) => {
          return (
            (responseMessage.role === "assistant" && !!responseMessage.tool_calls?.length) ||
            responseMessage.role === "tool"
          );
        });
        const intermediateStepMessages: Message[] = [];
        for (let i = 0; i < toolCallMessages.length; i += 2) {
          const aiMessage = toolCallMessages[i];
          const toolMessage = toolCallMessages[i + 1];
          intermediateStepMessages.push({
            id: (messagesWithUserReply.length + i / 2).toString(),
            role: "system" as const,
            content: JSON.stringify({
              action: aiMessage.tool_calls?.[0],
              observation: toolMessage.content,
            }),
          });
        }
        const newMessages = messagesWithUserReply;
        for (const message of intermediateStepMessages) {
          newMessages.push(message);
          setMessages([...newMessages]);
          await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
        }
        setMessages([
          ...newMessages,
          {
            id: newMessages.length.toString(),
            content: responseMessages[responseMessages.length - 1].content,
            role: "assistant",
          },
        ]);
      } else {
        if (json.error) {
          toast(json.error, {
            theme: "dark",
          });
          throw new Error(json.error);
        }
      }
    }
    if (onQuestionSubmitted) {
      onQuestionSubmitted();
    }
  };

  useEffect(() => {
    if (suggestedQuestion) {
      setInput(suggestedQuestion);
      const syntheticEvent = {
        preventDefault: () => {},
        currentTarget: formRef.current,
      } as FormEvent<HTMLFormElement>;
      sendMessage(syntheticEvent);
    }
  }, [suggestedQuestion]);

  const intermediateStepsToggle = showIntermediateStepsToggle && (
    <div className="flex items-center gap-2 mb-4">
      <input
        type="checkbox"
        id="show_intermediate_steps"
        name="show_intermediate_steps"
        checked={showIntermediateSteps}
        onChange={(e) => setShowIntermediateSteps(e.target.checked)}
        className="w-4 h-4 rounded border-2 border-gray-500 focus:ring-2 focus:ring-blue-500"
      />
      <label htmlFor="show_intermediate_steps" className="text-sm text-gray-400">
        Show intermediate steps
      </label>
    </div>
  );

  return (
    <div className="flex flex-col w-full mx-auto h-[calc(100vh-2rem)] items-center">
      <span className="flex justify-end self-end p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={walletAddress ? handleDisconnect : handleConnect}
            className="rounded-[10.65px] py-3 px-5"
            style={{
              background: "linear-gradient(135deg, #8F59E2, #7321EB, #7E45D6)",
            }}
          >
            {walletDisplayText}
          </button>
          <div className="w-10 h-10 overflow-hidden rounded-full">
            <img
              src="/profile_photo.svg"
              alt="User Profile"
              width={40}
              className="rounded-full"
            />
          </div>
        </div>
      </span>

      <main className="flex flex-1 max-w-[85%] justify-center w-full bg-transparent overflow-hidden py-5">
        <div className="relative flex flex-col h-full max-w-5xl w-full bg-transparent overflow-hidden">
          {!isAtTop && (
            <div
              className={`pointer-events-none absolute top-0 left-0 w-full h-2 z-10 transition-opacity duration-500 ${
                isAtTop ? "opacity-0" : "opacity-100"
              }`}
              style={{
                WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
                maskImage: "linear-gradient(to bottom, black, transparent)",
                backgroundColor: "black",
              }}
            />
          )}

          {!isAtBottom && (
            <div
              className={`pointer-events-none absolute bottom-0 left-0 w-full h-2 z-10 transition-opacity duration-500 ${
                isAtBottom ? "opacity-0" : "opacity-100"
              }`}
              style={{
                WebkitMaskImage: "linear-gradient(to bottom, transparent, black)",
                maskImage: "linear-gradient(to bottom, transparent, black)",
                backgroundColor: "black",
              }}
            />
          )}

          {/* Scrollable messages */}
          <div
            ref={messageContainerRef}
            className="flex-1 overflow-auto space-y-6 pr-10 scroll-smooth"
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                {emptyStateComponent}
              </div>
            ) : (
              messages.map((m, i) => {
                const sourceKey = i.toString();
                return m.role === "system" ? (
                  <IntermediateStep key={m.id} message={m} />
                ) : (
                  <ChatMessageBubble
                    key={m.id}
                    message={m}
                    aiEmoji={emoji}
                    sources={sourcesForMessages[sourceKey]}
                  />
                );
              })
            )}
          </div>
        </div>
      </main>

      <footer className="p-6 bg-transparent">
        {showIntermediateStepsToggle && intermediateStepsToggle}

        <form
          onSubmit={sendMessage}
          ref={formRef}
          className="flex px-4 py-1 bg-[#3C3C3C] rounded-3xl gap-4 w-[600px] items-center max-[930px]:w-[500px] max-[768px]:w-[400px] max-[550px]:w-[300px]"
        >
          <div className="flex-1 relative bg-transparent p-0 max-[768px]:text-xs max-[550px]:text-customSmall">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                handleInputChange(e);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !chatEndpointIsLoading && !intermediateStepsLoading) {
                    const syntheticEvent = {
                      preventDefault: () => {},
                      currentTarget: formRef.current,
                    } as FormEvent<HTMLFormElement>;
                    sendMessage(syntheticEvent);
                  }
                }
              }}
              placeholder={placeholder ?? "Message..."}
              rows={1}
              className="w-full resize-none p-3 bg-transparent text-white max-h-[200px] rounded-xl outline-none focus:outline-none focus:ring-0 scrollbar-hidden"
            />
          </div>
          <button
            type="submit"
            disabled={chatEndpointIsLoading || intermediateStepsLoading || !input.trim()}
            className="px-4 py-2 rounded-3xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-100 flex items-center justify-center min-w-[40px] opacity-80"
            style={{
              background: "linear-gradient(135deg, #8F59E2, #7321EB, #7E45D6)",
              boxShadow: "0px 0px 1rem 5px rgba(104, 71, 255, .5)",
              color: "white",
            }}
          >
            {chatEndpointIsLoading || intermediateStepsLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Ask"
            )}
          </button>
        </form>
      </footer>

      <ToastContainer
        position="bottom-right"
        theme="dark"
        toastStyle={{
          backgroundColor: "var(--background-secondary)",
          color: "var(--text-primary)",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(104, 71, 255, 0.05)",
        }}
      />
    </div>
  );
};