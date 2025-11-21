"use client";

import Image from "next/image";
import Link from "next/link";
import { SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function LandingCTA() {
  return (
    <section className="border-b-4 border-white bg-[#1D2740] py-12 md:border-b-6 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="max-w-2xl">
            <SignedOut>
              <h2 className="font-inria-sans mb-5 text-2xl font-bold text-white md:text-3xl lg:text-4xl">
                Sign up now to save your roadmap
              </h2>

              <p className="font-inria-sans mb-6 text-base leading-relaxed text-white md:text-lg">
                By signing up and making an account for Panday, you will get
                full access to the Panday career roadmap AI, such as saving data
                to your account, completion levels, apprenticeship profile
                creation and more!
              </p>

              <SignUpButton mode="modal">
                <Button className="font-inria-sans rounded-full bg-[#FF8F27] px-8 py-5 text-base font-bold text-white shadow-lg hover:bg-[#FF8F27]/90 md:text-lg">
                  Sign Up Now
                </Button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <h2 className="font-inria-sans mb-5 text-2xl font-bold text-white md:text-3xl lg:text-4xl">
                Ready to continue your journey?
              </h2>

              <p className="font-inria-sans mb-6 text-base leading-relaxed text-white md:text-lg">
                Explore your personalized career roadmap, track your progress,
                and get AI-powered guidance to help you achieve your Red Seal
                certification and beyond.
              </p>

              <Link href="/roadmap">
                <Button className="font-inria-sans rounded-full bg-[#FF8F27] px-8 py-5 text-base font-bold text-white shadow-lg hover:bg-[#FF8F27]/90 md:text-lg">
                  View Your Roadmap
                </Button>
              </Link>
            </SignedIn>
          </div>

          {/* Right - High Quality Logo */}
          <div className="relative flex h-[300px] items-center justify-center md:h-[400px] lg:h-[500px]">
            <div className="relative h-[250px] w-[250px] overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-slate-800 shadow-2xl md:h-[350px] md:w-[350px] lg:h-[450px] lg:w-[450px]">
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
