import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
    variable: "--font-space-grotesk",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
  });

  export const metadata: Metadata = {
  title: "Kaisen Assistant",
  description: "Your personal futuristic AI assistant",
};

// function Starfield() {
//   const stars = Array.from({ length: 100 }, (_, i) => ({
//     id: i,
//     left: `${Math.random() * 100}vw`,
//     size: `${Math.random() * 2 + 1}px`,
//     delay: `${Math.random() * 10}s`,
//   }));

//   return (
//     <div className="starfield">
//       {stars.map((star) => (
//         <div
//           key={star.id}
//           className="star"
//           style={{
//             left: star.left,
//             top: `${Math.random() * 100}vh`,
//             width: star.size,
//             height: star.size,
//             animationDelay: star.delay,
//           }}
//         />
//       ))}
//     </div>
//   );
// }

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
          <body className={`${spaceGrotesk.variable} antialiased `}>
            {/* <Starfield /> */}
            {children}
          </body>
        </html>
      );
    }