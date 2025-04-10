import Image from "next/image";
import pattern from "../public/bg-pattern.svg";
import gradient from "../public/purple-gradient.svg";
import composition from "../public/purple-composition.svg";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white bg-transparent">
    
      <Image
        src={pattern}
        alt="Grid Pattern"
        fill
        className="absolute object-cover z-0 opacity-50"
      />

    
      <Image
        src={gradient}
        alt="Purple Gradient"
        fill
        className="absolute object-cover z-10"
      />

      <Image
        src={composition}
        alt="3D Composition"
        width={700}
        height={700}
        className="absolute right-0 bottom-0 z-20 pointer-events-none mr-12 mb-12"
      />

    
      <div className="relative z-30 flex flex-col items-start justify-center h-screen max-w-5xl ml-16 px-6 md:px-12 lg:px-10">
        <h1 className="text-9xl md:text-9xl font-medium leading-tight">
          <span className="block">Talk DeFi.</span>
          <span className="block text-white">Trade Smarter.</span>
        </h1>

        <p className="mt-6  text-3xl text-[#D4D4D4]">
          Cut the noise. Use AI to lend, borrow, and trade — just by chatting. Built on Aptos. Backed by real-time data.
        </p>

        <div className="flex justify-center items-center">
        <button className="mt-10 px-12 py-3 text-2xl font-medium  rounded-lg bg-gradient-to-r from-[#7B61FF] to-[#BA4EFF] hover:opacity-90 transition">
          Connect your wallet
        </button>
        </div>
      </div>
    </main>
  );
}
