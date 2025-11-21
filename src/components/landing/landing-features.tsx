"use client";

import { Map, MessageSquare, Brain } from "lucide-react";

export function LandingFeatures() {
  return (
    <section className="border-b-4 border-white bg-[#0B101D] py-12 md:border-b-6 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <h2 className="font-inria-sans mb-10 text-center text-2xl font-bold text-white md:mb-12 md:text-3xl lg:text-4xl">
          AI Roadmap Features
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          {/* Visual Career Roadmaps */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white shadow-lg md:h-24 md:w-24">
              <Map className="h-10 w-10 text-[#1D2740] md:h-12 md:w-12" />
            </div>
            <div>
              <h3 className="font-inria-sans mb-3 text-xl font-bold text-white md:text-2xl">
                Visual Career Roadmaps
              </h3>
              <p className="font-inria-sans text-base leading-relaxed text-white md:text-lg">
                Node roadmaps create simplified but informative paths towards
                trade certifications.
              </p>
            </div>
          </div>

          {/* AI Career Guide */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white shadow-lg md:h-24 md:w-24">
              <MessageSquare className="h-10 w-10 text-[#1D2740] md:h-12 md:w-12" />
            </div>
            <div>
              <h3 className="font-inria-sans mb-3 text-xl font-bold text-white md:text-2xl">
                AI Career Guide
              </h3>
              <p className="font-inria-sans text-base leading-relaxed text-white md:text-lg">
                Our Panday AI provides quick and accurate answers for all your
                questions on your journey.
              </p>
            </div>
          </div>

          {/* Resource Hub */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white shadow-lg md:h-24 md:w-24">
              <Brain className="h-10 w-10 text-[#1D2740] md:h-12 md:w-12" />
            </div>
            <div>
              <h3 className="font-inria-sans mb-3 text-xl font-bold text-white md:text-2xl">
                Resource Hub
              </h3>
              <p className="font-inria-sans text-base leading-relaxed text-white md:text-lg">
                Panday connects you to the top resources for helping you reach
                key details to help with questions or course material.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
