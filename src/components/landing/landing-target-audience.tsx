"use client";

import Image from "next/image";

export function LandingTargetAudience() {
    return (
        <section className="bg-[#1D2740] py-12 md:py-20 border-b-8 md:border-b-[15px] border-white">
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Left Image - Jobsite workers with rounded corners and shadow */}
                    <div className="relative h-[300px] md:h-[425px] rounded-3xl overflow-hidden shadow-2xl">
                        <Image
                            src="/landing_page_imgs/jobsite.png"
                            alt="Trades workers collaborating"
                            fill
                            className="object-cover"
                        />
                    </div>

                    {/* Right Content */}
                    <div className="flex flex-col gap-4 md:gap-6">
                        <h2 className="text-white text-2xl md:text-3xl lg:text-[39px] font-bold font-inria-sans">
                            The Perfect Career Tool for:
                        </h2>

                        <ul className="text-white text-lg md:text-xl lg:text-[25px] font-inria-sans space-y-3 md:space-y-4">
                            <li>• Graduated Students exploring trades.</li>
                            <li>• Trades students currently planning their career.</li>
                            <li>• Trades apprentices</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
