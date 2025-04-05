import { Message } from "ai"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"

export function ChatMessageBubble(props: { message: Message; aiEmoji?: string; sources?: any[] }) {
	const { message, aiEmoji, sources } = props
	const [isCopied, setIsCopied] = useState(false)

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text)
			setIsCopied(true)
			setTimeout(() => setIsCopied(false), 2000)
		} catch (err) {
			console.error("Failed to copy text: ", err)
		}
	}

	return (
		<div
			className={`flex ${
				message.role === "user" ? "justify-end" : "justify-start"
			} mb-4 message-enter`}
		>
			<div
				className={`flex max-w-[70%] ${
					message.role === "user" ? "flex-row-reverse" : "flex-row"
				} items-start gap-4`}
			>
				<div
					className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-md flex-shrink-0"
					style={{
						background: message.role === "user"
							? "linear-gradient(135deg, #3F51B5, #2196F3)"
							: "linear-gradient(135deg, var(--accent-primary), var(--accent-hover))",
						color: "white",
					}}
				>
					{message.role === "user" ? "👤" : aiEmoji || "₿"}
				</div>

				<div className="flex flex-col gap-2 w-full overflow-hidden">
					<div
						className="prose w-full px-4 py-3 rounded-lg relative group backdrop-blur-sm break-words whitespace-pre-wrap"
						style={{
							backgroundColor: message.role === "user" ? "var(--user-bubble)" : "var(--assistant-bubble)",
							color: "var(--text-primary)",
							border: `1px solid ${message.role === "user" ? "rgba(63, 81, 181, 0.2)" : "rgba(104, 71, 255, 0.2)"}`,
							boxShadow: message.role === "user"
								? "0 2px 8px rgba(33, 150, 243, 0.1)"
								: "0 2px 8px rgba(104, 71, 255, 0.1)",
							wordWrap: "break-word",
							overflowWrap: "break-word",
							hyphens: "auto",
						}}
					>
						{message.role === "assistant" && (
							<button
								onClick={() => copyToClipboard(message.content)}
								className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/10"
								style={{
									color: "var(--text-secondary)",
								}}
								aria-label="Copy message"
							>
								{isCopied ? (
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M20 6L9 17l-5-5"/>
									</svg>
								) : (
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
									</svg>
								)}
							</button>
						)}
						<div className="whitespace-pre-wrap break-words">
							<ReactMarkdown
								components={{
									code(props) {
										const { children, className } = props
										const match = /language-(\w+)/.exec(className || "")
										const language = match ? match[1] : "text"

										if (className) {
											return (
												<SyntaxHighlighter
													language={language}
													style={oneDark}
													PreTag="div"
													customStyle={{
														borderRadius: "0.5rem",
														margin: "1rem 0",
														border: "1px solid var(--border-light)",
													}}
													wrapLines={true}
													wrapLongLines={true}
												>
													{String(children).replace(/\n$/, "")}
												</SyntaxHighlighter>
											)
										}
										return (
											<code
												className="bg-opacity-25 rounded px-1 py-0.5 text-sm"
												style={{
													backgroundColor: "var(--inline-code-background)",
												}}
											>
												{children}
											</code>
										)
									},
									p: ({ children }) => <p className="whitespace-pre-wrap break-words mb-4">{children}</p>,
								}}
							>
								{message.content}
							</ReactMarkdown>
						</div>
					</div>

					{sources && sources.length > 0 && (
						<div
							className="px-4 py-3 rounded-lg text-sm border border-[#2A2F3C]"
							style={{
								backgroundColor: "var(--background-secondary)",
								color: "var(--text-secondary)",
								boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
							}}
						>
							<p className="font-medium mb-2 flex items-center">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
									<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
								</svg>
								Sources:
							</p>
							<ul className="list-disc pl-4 space-y-1">
								{sources.map((source, i) => (
									<li key={i}>
										<a
											href={source.url}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:underline transition-colors"
											style={{ color: "var(--accent-primary)" }}
										>
											{source.title || source.url}
										</a>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
