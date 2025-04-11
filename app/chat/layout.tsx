import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
	variable: "--font-space-grotesk",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
	title: "Kaisen Assistant",
	description: "Your personal futuristic AI assistant",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body className={`${spaceGrotesk.variable} antialiased`}>{children}</body>
		</html>
	)
}