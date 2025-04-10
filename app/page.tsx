import Image from "next/image";
import pattern from "../public/bg-pattern.svg";
import gradient from "../public/purple-gradient.svg";
import composition from "../public/purple-composition.svg";

// navbar
const Navbar = () => {
  return (
    <nav className="relative z-30 flex items-center justify-between mt-[30px] px-[80px] bg-transparent text-white">
        <div className="flex justify-center align-middle">
            <img src="/kaisen_logo_chat_window.svg" alt="kaisen-logo" />
        </div>
        <div className="flex flex-1 justify-evenly text-xl text-[#9C9C9C] px-32">
            <a href="#features" className="hover:text-gray-300">
            Features
            </a>
            <a href="#developers" className="hover:text-gray-300">
            Developers
            </a>
            <a href="#blog" className="hover:text-gray-300">
            Blog
            </a>
            <a href="#about" className="hover:text-gray-300">
            About Us
            </a>
        </div>
        <button 
        className="px-6 py-2 rounded-lg text-white text-base font-medium hover:opacity-90 transition"
        style={{
            background: "linear-gradient(90deg, #8F59E2, #7321EB, #7E45D6)",
          }}
        >
            Sign Up
        </button>
    </nav>
  );
};

export default function Home() {
  return (
    <>
      <main className="relative max-h-screen overflow-hidden text-white bg-transparent">
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
          width={600}
          height={600}
          className="absolute right-0 bottom-0 top-32 z-20 pointer-events-none mr-12 mb-12"
        />

        <Navbar />

        <div className="relative z-30 flex flex-col items-start justify-center h-screen max-w-5xl ml-16 px-12 max-[768px]:px-6 max-[1024px]:px-10">
          <h1 className="text-[106.5px] max-[1024px]:text-7xl max-[768px]:text-4xl font-medium leading-tight">
            <span className="block">Talk DeFi.</span>
            <span className="block text-white">Trade Smarter.</span>
          </h1>

          <p className="mt-6 text-[32px] max-[1024px]:text-2xl max-[768px]:text-base text-[#D4D4D4]">
            Cut the noise. Use AI to lend, borrow, and trade — just by chatting.
            Built on Aptos. Backed by real-time data.
          </p>

          <div className="flex justify-center items-center">
            <button className="mt-10 px-12 py-3 text-2xl font-medium rounded-lg bg-gradient-to-r from-[#7B61FF] to-[#BA4EFF] hover:opacity-90 transition">
              Connect your wallet
            </button>
          </div>
          <div className="flex h-24">
          </div>
        </div>
      </main>
    </>
  );
}