"use client";

import Image from "next/image";

export function LandingTargetAudience() {
  return (
    <section className="border-b-4 border-white bg-[#1D2740] py-12 md:border-b-6 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:gap-12 lg:grid-cols-2">
          {/* Left Image - Jobsite workers with rounded corners and shadow */}
          <div className="relative h-[300px] overflow-hidden rounded-2xl shadow-xl md:h-[400px]">
            <Image
              src="/landing_page_imgs/jobsite.png"
              alt="Trades workers collaborating"
              fill
              className="object-cover"
            />
          </div>

          {/* Right Content */}
          <div className="flex flex-col gap-4 md:gap-6">
            <h2 className="font-inria-sans text-2xl font-bold text-white md:text-3xl lg:text-4xl">
              The Perfect Career Tool for:
            </h2>

            <ul className="font-inria-sans space-y-3 text-lg leading-relaxed text-white md:text-xl">
              <li>• Graduated students exploring trades</li>
              <li>• Trades students currently planning their career</li>
              <li>• Trades apprentices</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
