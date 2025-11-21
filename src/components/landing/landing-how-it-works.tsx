"use client";

import Image from "next/image";

export function LandingHowItWorks() {
  return (
    <section className="border-b-4 border-white bg-[#1D2740] py-12 md:border-b-6 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:gap-12 lg:grid-cols-2">
          {/* Left - Roadmap Preview Image */}
          <div className="relative h-[300px] overflow-hidden rounded-2xl bg-[#0B101D] p-4 shadow-xl md:h-[400px]">
            <Image
              src="/landing_page_imgs/roadmap_preview.png"
              alt="Roadmap Preview"
              fill
              className="object-contain"
            />
          </div>

          {/* Right - How It Works Steps */}
          <div>
            <h2 className="font-inria-sans mb-8 text-2xl font-bold text-white md:text-3xl lg:text-4xl">
              How It Works
            </h2>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <span className="text-xl font-bold text-[#FF8F27]">1.</span>
                <p className="font-inria-sans text-base leading-relaxed text-white md:text-lg">
                  Take a short quiz to help us understand your needs.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-xl font-bold text-[#FF8F27]">2.</span>
                <p className="font-inria-sans text-base leading-relaxed text-white md:text-lg">
                  Tell us your goals and questions.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-xl font-bold text-[#FF8F27]">3.</span>
                <p className="font-inria-sans text-base leading-relaxed text-white md:text-lg">
                  Explore your personalized roadmap.
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-xl font-bold text-[#FF8F27]">4.</span>
                <p className="font-inria-sans text-base leading-relaxed text-white md:text-lg">
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
