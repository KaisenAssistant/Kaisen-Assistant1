"use client"

import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

import { Message } from "ai"
import { useChat } from "ai/react"
import { ReactElement, useRef, useState, useEffect } from "react"
import type { FormEvent } from "react"

import { ChatMessageBubble } from "@/components/ChatMessageBubble"
import { IntermediateStep } from "./IntermediateStep"

export function ChatWindow(props: {
	endpoint: string
	emptyStateComponent: ReactElement
	placeholder?: string
	titleText?: string
	emoji?: string
	showIntermediateStepsToggle?: boolean
}) {
	const messageContainerRef = useRef<HTMLDivElement | null>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const {
		messages,
		input,
		setInput,
		handleInputChange,
		handleSubmit,
		isLoading: chatEndpointIsLoading,
		setMessages,
	} = useChat({
		api: props.endpoint,
		onResponse(response) {
			const sourcesHeader = response.headers.get("x-sources")
			const sources = sourcesHeader ? JSON.parse(Buffer.from(sourcesHeader, "base64").toString("utf8")) : []
			const messageIndexHeader = response.headers.get("x-message-index")
			if (sources.length && messageIndexHeader !== null) {
				setSourcesForMessages({
					...sourcesForMessages,
					[messageIndexHeader]: sources,
				})
			}
		},
		streamMode: "text",
		onError: (e) => {
			toast(e.message, {
				theme: "dark",
			})
		},
	})

	// Auto-resize textarea
	useEffect(() => {
		const textarea = textareaRef.current
		if (textarea) {
			textarea.style.height = 'auto'
			textarea.style.height = textarea.scrollHeight + 'px'
		}
	}, [input])

	const { endpoint, emptyStateComponent, placeholder, titleText = "An LLM", showIntermediateStepsToggle, emoji } = props

	const [showIntermediateSteps, setShowIntermediateSteps] = useState(false)
	const [intermediateStepsLoading, setIntermediateStepsLoading] = useState(false)
	const intemediateStepsToggle = showIntermediateStepsToggle && (
		<div>
			<input
				type="checkbox"
				id="show_intermediate_steps"
				name="show_intermediate_steps"
				checked={showIntermediateSteps}
				onChange={(e) => setShowIntermediateSteps(e.target.checked)}
			></input>
			<label htmlFor="show_intermediate_steps"> Show intermediate steps</label>
		</div>
	)

	const [sourcesForMessages, setSourcesForMessages] = useState<Record<string, any>>({})

	async function sendMessage(e: FormEvent<HTMLFormElement>) {
		e.preventDefault()
		if (messageContainerRef.current) {
			messageContainerRef.current.classList.add("grow")
		}
		if (!messages.length) {
			await new Promise((resolve) => setTimeout(resolve, 300))
		}
		if (chatEndpointIsLoading ?? intermediateStepsLoading) {
			return
		}
		if (!showIntermediateSteps) {
			handleSubmit(e)
			// Some extra work to show intermediate steps properly
		} else {
			setIntermediateStepsLoading(true)
			setInput("")
			const messagesWithUserReply = messages.concat({
				id: messages.length.toString(),
				content: input,
				role: "user",
			})
			setMessages(messagesWithUserReply)
			const response = await fetch(endpoint, {
				method: "POST",
				body: JSON.stringify({
					messages: messagesWithUserReply,
					show_intermediate_steps: true,
				}),
			})
			const json = await response.json()
			setIntermediateStepsLoading(false)
			if (response.status === 200) {
				const responseMessages: Message[] = json.messages
				// Represent intermediate steps as system messages for display purposes
				// TODO: Add proper support for tool messages
				const toolCallMessages = responseMessages.filter((responseMessage: Message) => {
					return (
						(responseMessage.role === "assistant" && !!responseMessage.tool_calls?.length) ||
						responseMessage.role === "tool"
					)
				})
				const intermediateStepMessages = []
				for (let i = 0; i < toolCallMessages.length; i += 2) {
					const aiMessage = toolCallMessages[i]
					const toolMessage = toolCallMessages[i + 1]
					intermediateStepMessages.push({
						id: (messagesWithUserReply.length + i / 2).toString(),
						role: "system" as const,
						content: JSON.stringify({
							action: aiMessage.tool_calls?.[0],
							observation: toolMessage.content,
						}),
					})
				}
				const newMessages = messagesWithUserReply
				for (const message of intermediateStepMessages) {
					newMessages.push(message)
					setMessages([...newMessages])
					await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000))
				}
				setMessages([
					...newMessages,
					{
						id: newMessages.length.toString(),
						content: responseMessages[responseMessages.length - 1].content,
						role: "assistant",
					},
				])
			} else {
				if (json.error) {
					toast(json.error, {
						theme: "dark",
					})
					throw new Error(json.error)
				}
			}
		}
	}

	return (
		<div className="flex flex-col w-full max-w-5xl mx-auto h-[calc(100vh-2rem)] my-4">
			<header className="flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm bg-opacity-90" 
				style={{ 
					borderColor: 'var(--border-light)',
					background: 'linear-gradient(to right, var(--background-primary), var(--background-secondary))'
				}}
			>
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-full flex items-center justify-center" 
						style={{ 
							background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
							boxShadow: '0 2px 8px rgba(104, 71, 255, 0.25)'
						}}
					>
						<span className="text-xl">{emoji}</span>
					</div>
					<h1 className="text-xl font-semibold tracking-wide">{titleText}</h1>
				</div>
			</header>

			<main className="flex-1 overflow-auto p-6" style={{ background: 'var(--background-primary)' }}>
				{messages.length === 0 ? (
					<div className="h-full flex items-center justify-center">
						{emptyStateComponent}
					</div>
				) : (
					<div className="space-y-6">
						{[...messages].reverse().map((m, i) => {
							const sourceKey = (messages.length - 1 - i).toString()
							return m.role === "system" ? (
								<IntermediateStep key={m.id} message={m} />
							) : (
								<ChatMessageBubble
									key={m.id}
									message={m}
									aiEmoji={emoji}
									sources={sourcesForMessages[sourceKey]}
								/>
							)
						})}
					</div>
				)}
			</main>

			<footer className="border-t p-6" 
				style={{ 
					borderColor: 'var(--border-light)',
					background: 'linear-gradient(to right, var(--background-primary), var(--background-secondary))'
				}}
			>
				{intemediateStepsToggle && (
					<div className="mb-4 flex items-center gap-2">
						<input
							type="checkbox"
							id="show_intermediate_steps"
							name="show_intermediate_steps"
							checked={showIntermediateSteps}
							onChange={(e) => setShowIntermediateSteps(e.target.checked)}
							className="w-4 h-4 rounded border-2 text-accent-primary focus:ring-accent-primary"
							style={{ borderColor: 'var(--text-secondary)' }}
						/>
						<label 
							htmlFor="show_intermediate_steps" 
							className="text-sm"
							style={{ color: 'var(--text-secondary)' }}
						>
							Show intermediate steps
						</label>
					</div>
				)}

				<form onSubmit={sendMessage} className="flex gap-4">
					<div className="flex-1 relative">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => {
								handleInputChange(e)
								e.target.style.height = 'auto'
								e.target.style.height = e.target.scrollHeight + 'px'
							}}
							placeholder={placeholder ?? "Message..."}
							rows={1}
							className="w-full resize-none rounded-lg py-3 px-4 focus:outline-none focus:ring-2 transition-shadow"
							style={{
								backgroundColor: 'var(--background-secondary)',
								border: '1px solid var(--border-light)',
								color: 'var(--text-primary)',
								maxHeight: '200px',
								boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.1)'
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()
									sendMessage(e as any)
								}
							}}
						/>
					</div>
					<button
						type="submit"
						disabled={chatEndpointIsLoading || intermediateStepsLoading || !input.trim()}
						className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center min-w-[100px]"
						style={{ 
							background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
							color: 'white',
							boxShadow: '0 2px 8px rgba(104, 71, 255, 0.25)'
						}}
					>
						{(chatEndpointIsLoading || intermediateStepsLoading) ? (
							<div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						) : (
							'Send'
						)}
					</button>
				</form>
			</footer>

			<ToastContainer
				position="bottom-right"
				theme="dark"
				toastStyle={{
					backgroundColor: 'var(--background-secondary)',
					color: 'var(--text-primary)',
					borderRadius: '8px',
					boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(104, 71, 255, 0.05)'
				}}
			/>
		</div>
	)
}
