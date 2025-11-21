"use client";

import Image from "next/image";

export function LandingAISection() {
    return (
        <section className="bg-[#1D2740] py-12 md:py-20 border-b-8 md:border-b-[15px] border-white">
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Left Content */}
                    <div className="flex flex-col gap-4 md:gap-6">
                        <h2 className="text-white text-2xl md:text-3xl lg:text-[39px] font-bold font-inria-sans">
                            Using AI to Expand Learning
                        </h2>

                        <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans">
                            Panday AI is built to understand and adapt to new and changing questions relating to the trades journey. We at Panday want to create a clear and informative experience for anyone looking into joining trades, and are continuously developing the site to reach that goal.
                        </p>
                    </div>

                    {/* Right Image - Chatbot with narrower rectangle wrapper */}
                    <div className="relative h-[350px] md:h-[450px] lg:h-[500px] flex items-center justify-center">
                        <div className="relative w-[240px] md:w-[300px] lg:w-[340px] h-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4">
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
