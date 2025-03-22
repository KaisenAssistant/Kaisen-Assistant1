import type { Message } from "ai/react"
import { useState } from "react"

export function IntermediateStep(props: { message: Message }) {
	const parsedInput = JSON.parse(props.message.content)
	const action = parsedInput.action
	const observation = parsedInput.observation
	const [expanded, setExpanded] = useState(false)

	return (
		<div className="max-w-3xl mx-auto px-4 py-2 message-enter">
			<div
				className="rounded-lg p-4 border transition-all backdrop-blur-sm"
				style={{
					backgroundColor: 'var(--background-secondary)',
					borderColor: 'var(--success)',
					color: 'var(--text-primary)',
					boxShadow: '0 2px 12px rgba(52, 199, 89, 0.15)',
				}}
			>
				<div 
					className={`flex items-center gap-3 cursor-pointer ${expanded ? "mb-4" : ""}`} 
					onClick={(e) => setExpanded(!expanded)}
				>
					<div 
						className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-base shadow-md"
						style={{
							background: 'linear-gradient(135deg, var(--success), #26A65B)',
							color: 'white',
						}}
					>
						🛠
					</div>
					<div className="flex-grow">
						<code className="text-sm font-medium">
							<b>{action.name}</b>
						</code>
					</div>
					<button
						className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
						style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
						aria-label={expanded ? 'Collapse details' : 'Expand details'}
					>
						{expanded ? 
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<polyline points="18 15 12 9 6 15"></polyline>
							</svg> : 
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<polyline points="6 9 12 15 18 9"></polyline>
							</svg>
						}
					</button>
				</div>
				<div
					className={`overflow-hidden transition-all duration-300 ease-in-out ${
						expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
					}`}
				>
					<div className="space-y-3">
						<div 
							className="rounded-lg p-3 border border-[#2A2F3C]"
							style={{
								backgroundColor: 'var(--background-primary)',
							}}
						>
							<div className="text-xs mb-2 flex items-center" style={{ color: 'var(--success)' }}>
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
									<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
								</svg>
								Tool Input:
							</div>
							<code 
								className="text-sm block whitespace-pre-wrap"
								style={{ color: 'var(--text-primary)' }}
							>
								{JSON.stringify(action.args, null, 2)}
							</code>
						</div>
						<div 
							className="rounded-lg p-3 border border-[#2A2F3C]"
							style={{
								backgroundColor: 'var(--background-primary)',
							}}
						>
							<div className="text-xs mb-2 flex items-center" style={{ color: 'var(--success)' }}>
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
									<circle cx="12" cy="12" r="10"></circle>
									<polyline points="12 6 12 12 16 14"></polyline>
								</svg>
								Observation:
							</div>
							<code 
								className="text-sm block whitespace-pre-wrap"
								style={{ color: 'var(--text-primary)' }}
							>
								{observation}
							</code>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
