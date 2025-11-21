"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Menu, X, User } from "lucide-react";

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b-8 border-white bg-[#0B101D] md:border-b-[15px]">
      <div className="container mx-auto flex items-center justify-between px-4 py-4 md:px-8 md:py-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 md:gap-3">
          <Image
            src="/landing_page_imgs/high_quality_Logo.png"
            alt="Panday Logo"
            width={60}
            height={60}
            className="h-[60px] w-[60px] md:h-[83px] md:w-[83px]"
          />
          <span className="font-inter text-xl font-bold text-white md:text-2xl">
            Panday
          </span>
        </Link>

        {/* Desktop Navigation - Hidden on mobile */}
        <nav className="hidden items-center gap-8 lg:flex xl:gap-12">
          <Link
            href="/roadmap"
            className="font-inria-sans text-lg text-white transition hover:text-orange-500 xl:text-xl"
          >
            Explore
          </Link>
          <Link
            href="/about"
            className="font-inria-sans text-lg text-white transition hover:text-orange-500 xl:text-xl"
          >
            About Us
          </Link>
          <Link
            href="/tools"
            className="font-inria-sans text-lg text-white transition hover:text-orange-500 xl:text-xl"
          >
            Tools
          </Link>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="font-inria-sans text-lg font-bold text-white transition hover:text-orange-500 xl:text-xl">
                Login
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button className="font-inria-sans rounded-lg bg-[#FF8F27] px-4 py-2 text-lg text-white hover:bg-[#FF8F27]/90 xl:px-6 xl:py-3 xl:text-xl">
                Sign Up
              </Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <Link href="/profile">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-orange-500"
              >
                <User className="mr-2 h-5 w-5" />
                Profile
              </Button>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10",
                },
              }}
            />
          </SignedIn>
        </nav>

        {/* Mobile Menu Button & Sign Up */}
        <div className="flex items-center gap-3 lg:hidden">
          <SignedOut>
            <SignUpButton mode="modal">
              <Button className="font-inria-sans rounded-lg bg-[#FF8F27] px-4 py-2 text-base text-white hover:bg-[#FF8F27]/90">
                Sign Up
              </Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            />
          </SignedIn>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-2 text-white transition hover:bg-slate-800"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-slate-700 bg-[#0B101D] lg:hidden">
          <nav className="container mx-auto flex flex-col gap-4 px-4 py-4">
            <Link
              href="/roadmap"
              className="font-inria-sans py-2 text-lg text-white transition hover:text-orange-500"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Explore
            </Link>
            <Link
              href="/about"
              className="font-inria-sans py-2 text-lg text-white transition hover:text-orange-500"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About Us
            </Link>
            <Link
              href="/tools"
              className="font-inria-sans py-2 text-lg text-white transition hover:text-orange-500"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Tools
            </Link>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="font-inria-sans py-2 text-left text-lg font-bold text-white transition hover:text-orange-500">
                  Login
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link
                href="/profile"
                className="font-inria-sans py-2 text-lg text-white transition hover:text-orange-500"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Profile
              </Link>
            </SignedIn>
          </nav>
        </div>
      )}
    </header>
  );
}
