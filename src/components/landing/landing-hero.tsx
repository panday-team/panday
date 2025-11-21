"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function LandingHero() {
    return (
        <section className="relative bg-[#1D2740] pt-24 md:pt-32 pb-12 md:pb-20 border-b-8 md:border-b-[15px] border-white overflow-hidden">
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Left Content */}
                    <div className="flex flex-col gap-4 md:gap-8">
                        <h1 className="text-white text-2xl md:text-3xl lg:text-[39px] font-bold font-inria-sans leading-tight">
                            Your AI-Powered Guide to a Career in BC Skilled Trades.
                        </h1>

                        <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans">
                            Visually map your journey, discover resources, and get personalized guidance to achieve your Red Seal certification and beyond.
                        </p>

                        <Link href="/roadmap">
                            <Button className="bg-[#FF8F27] hover:bg-[#FF8F27]/90 text-white text-sm md:text-base font-inria-sans px-6 md:px-8 py-4 md:py-6 rounded-[40px] w-fit shadow-lg">
                                Start Your Roadmap
                            </Button>
                        </Link>

                        <p className="text-white text-xs md:text-[13px] font-inria-sans max-w-md">
                            Get started as a guest with the career roadmap tool, or sign up for free to gain complete access to all features. No payment required.
                        </p>
                    </div>

                    {/* Right Image - Happy Guy with rhombus/diamond shape wrapper with rounded corners and top margin on mobile */}
                    <div className="relative h-[300px] md:h-[400px] lg:h-[500px] xl:h-[600px] flex items-center justify-center mt-8 md:mt-0">
                        <div className="relative w-[280px] h-[280px] md:w-[380px] md:h-[380px] lg:w-[480px] lg:h-[480px] rotate-45 overflow-hidden shadow-2xl rounded-3xl">
                            <Image
                                src="/landing_page_imgs/happyguy.png"
                                alt="Skilled trades worker"
                                fill
                                className="object-cover -rotate-45 scale-150"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
