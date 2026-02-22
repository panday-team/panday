"use client";

import Image from "next/image";

export function LandingAISection() {
  return (
    <section className="border-b-4 border-white bg-[#1D2740] py-12 md:border-b-6 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="flex flex-col gap-4 md:gap-6">
            <h2 className="font-inria-sans text-2xl font-bold text-white md:text-3xl lg:text-4xl">
              AI help that stays grounded
            </h2>

            <p className="font-inria-sans text-base leading-relaxed text-white md:text-lg">
              The chat assistant answers questions in plain language and points
              to source material when it responds. That means users can move
              faster while still seeing where the guidance comes from.
            </p>
          </div>

          {/* Right Image - Chatbot with narrower rectangle wrapper */}
          <div className="relative flex h-[350px] items-center justify-center md:h-[450px] lg:h-[500px]">
            <div className="relative h-full w-[240px] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-2xl md:w-[300px] lg:w-[340px]">
              <Image
                src="/landing_page_imgs/chatbotimg.png"
                alt="AI Chatbot"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
