"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b-4 border-white bg-[#1D2740] pt-20 pb-12 md:border-b-6 md:pt-24 md:pb-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="flex flex-col gap-4 md:gap-6">
            <h1 className="font-inria-sans text-3xl leading-tight font-bold text-white md:text-4xl lg:text-5xl">
              Your AI-Powered Guide to a Career in BC Skilled Trades
            </h1>

            <p className="font-inria-sans text-lg leading-relaxed text-white md:text-xl">
              Visually map your journey, discover resources, and get
              personalized guidance to achieve your Red Seal certification and
              beyond.
            </p>

            <Link href="/roadmap">
              <Button className="font-inria-sans w-fit rounded-lg bg-[#FF8F27] px-8 py-5 text-base text-white shadow-lg hover:bg-[#FF8F27]/90 md:text-lg">
                Start Your Roadmap
              </Button>
            </Link>

            <p className="font-inria-sans max-w-md text-sm text-white/80">
              Get started as a guest with the career roadmap tool, or sign up
              for free to gain complete access to all features. No payment
              required.
            </p>
          </div>

          {/* Right Image - Happy Guy with rhombus/diamond shape wrapper with rounded corners and top margin on mobile */}
          <div className="relative mt-8 flex h-[300px] items-center justify-center md:mt-0 md:h-[400px] lg:h-[500px] xl:h-[600px]">
            <div className="relative h-[280px] w-[280px] rotate-45 overflow-hidden rounded-3xl shadow-2xl md:h-[380px] md:w-[380px] lg:h-[480px] lg:w-[480px]">
              <Image
                src="/landing_page_imgs/happyguy.png"
                alt="Skilled trades worker"
                fill
                className="scale-150 -rotate-45 object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
