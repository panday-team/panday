"use client";

import { Map, MessageSquare, Brain } from "lucide-react";

export function LandingFeatures() {
    return (
        <section className="bg-[#0B101D] py-12 md:py-20 border-b-8 md:border-b-[15px] border-white">
            <div className="container mx-auto px-4 md:px-8">
                <h2 className="text-white text-2xl md:text-3xl lg:text-[39px] font-bold font-inria-sans text-center mb-8 md:mb-16">
                    AI Roadmap Features
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    {/* Visual Career Roadmaps */}
                    <div className="flex flex-col items-center text-center gap-4 md:gap-6">
                        <div className="w-[80px] h-[80px] md:w-[99px] md:h-[99px] bg-white rounded-lg flex items-center justify-center shadow-lg">
                            <Map className="w-12 h-12 md:w-16 md:h-16 text-[#1D2740]" />
                        </div>
                        <div>
                            <h3 className="text-white text-2xl md:text-3xl lg:text-[39px] font-bold font-inria-sans mb-2 md:mb-4">
                                Visual Career Roadmaps
                            </h3>
                            <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans">
                                Node roadmaps create simplified but informative paths towards trade certifications.
                            </p>
                        </div>
                    </div>

                    {/* AI Career Guide */}
                    <div className="flex flex-col items-center text-center gap-4 md:gap-6">
                        <div className="w-[80px] h-[80px] md:w-[99px] md:h-[99px] bg-white rounded-lg flex items-center justify-center shadow-lg">
                            <MessageSquare className="w-12 h-12 md:w-16 md:h-16 text-[#1D2740]" />
                        </div>
                        <div>
                            <h3 className="text-white text-2xl md:text-3xl lg:text-[39px] font-bold font-inria-sans mb-2 md:mb-4">
                                AI Career Guide
                            </h3>
                            <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans">
                                Our Panday AI provides quick and accurate answers for all your questions on your journey.
                            </p>
                        </div>
                    </div>

                    {/* Resource Hub */}
                    <div className="flex flex-col items-center text-center gap-4 md:gap-6">
                        <div className="w-[80px] h-[80px] md:w-[99px] md:h-[99px] bg-white rounded-lg flex items-center justify-center shadow-lg">
                            <Brain className="w-12 h-12 md:w-16 md:h-16 text-[#1D2740]" />
                        </div>
                        <div>
                            <h3 className="text-white text-2xl md:text-3xl lg:text-[39px] font-bold font-inria-sans mb-2 md:mb-4">
                                Resource Hub
                            </h3>
                            <p className="text-white text-base md:text-lg lg:text-xl font-inria-sans">
                                Panday connects you to the top resources for helping you reach key details to help with questions or course material.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
