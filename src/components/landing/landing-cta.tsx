"use client";

import Image from "next/image";
import { SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function LandingCTA() {
    return (
        <section className="bg-[#1D2740] py-12 md:py-20 border-b-8 md:border-b-[15px] border-white">
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Left Content */}
                    <div className="max-w-2xl">
                        <h2 className="text-white text-2xl md:text-3xl lg:text-[39px] font-bold font-inria-sans mb-4 md:mb-6">
                            Sign-up now to create an account to save your roadmap.
                        </h2>

                        <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans mb-6 md:mb-8">
                            By signing up and making an account for Panday, you will get full access to the Panday career roadmap AI, such as saving data to your account, completion levels, apprenticeship profile creation and more!
                        </p>

                        <SignUpButton mode="modal">
                            <Button className="bg-[#FF8F27] hover:bg-[#FF8F27]/90 text-white text-lg md:text-xl font-bold font-inria-sans px-6 md:px-8 py-4 md:py-6 rounded-[40px] shadow-lg">
                                Sign-Up Now
                            </Button>
                        </SignUpButton>
                    </div>

                    {/* Right - High Quality Logo */}
                    <div className="relative h-[300px] md:h-[400px] lg:h-[500px] flex items-center justify-center">
                        <div className="relative w-[250px] h-[250px] md:w-[350px] md:h-[350px] lg:w-[450px] lg:h-[450px] rounded-full overflow-hidden shadow-2xl bg-gradient-to-br from-slate-700 to-slate-800">
                            <Image
                                src="/landing_page_imgs/high_quality_Logo.png"
                                alt="Panday Logo"
                                fill
                                className="object-contain p-4"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
