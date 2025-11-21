"use client";

import Image from "next/image";

export function LandingHowItWorks() {
    return (
        <section className="bg-[#1D2740] py-12 md:py-20 border-b-8 md:border-b-[15px] border-white">
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Left - Roadmap Preview Image */}
                    <div className="relative h-[300px] md:h-[400px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl bg-[#0B101D] p-4">
                        <Image
                            src="/landing_page_imgs/roadmap_preview.png"
                            alt="Roadmap Preview"
                            fill
                            className="object-contain"
                        />
                    </div>

                    {/* Right - How It Works Steps */}
                    <div>
                        <h2 className="text-white text-2xl md:text-3xl lg:text-[39px] font-bold font-inria-sans mb-8 md:mb-12">
                            How It Works
                        </h2>

                        <div className="space-y-6 md:space-y-8">
                            <div className="flex items-start gap-4">
                                <span className="text-[#FF8F27] text-xl md:text-2xl font-bold">1.</span>
                                <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans">
                                    Take a short quiz to help us understand your needs.
                                </p>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="text-[#FF8F27] text-xl md:text-2xl font-bold">2.</span>
                                <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans">
                                    Tell us your goals and questions.
                                </p>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="text-[#FF8F27] text-xl md:text-2xl font-bold">3.</span>
                                <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans">
                                    Explore your personalized roadmap.
                                </p>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="text-[#FF8F27] text-xl md:text-2xl font-bold">4.</span>
                                <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans">
                                    Unlock resources & track progress.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
