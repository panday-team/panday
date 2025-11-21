"use client";

import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t-4 border-white bg-[#0B101D] py-12 md:border-t-6 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="font-inria-sans text-center text-white">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-base md:gap-6">
            <Link href="/about" className="transition hover:text-orange-500">
              About Us
            </Link>
            <span className="text-white/50">•</span>
            <Link href="/contact" className="transition hover:text-orange-500">
              Contact
            </Link>
            <span className="text-white/50">•</span>
            <Link href="/privacy" className="transition hover:text-orange-500">
              Privacy Policy
            </Link>
          </div>
          <div className="text-sm text-white/70">
            Copyright © 2025 Panday. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
