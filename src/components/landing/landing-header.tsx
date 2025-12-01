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
    <header className="fixed top-0 right-0 left-0 z-50 border-b-4 border-white bg-[#0B101D] md:border-b-6">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 md:px-8 md:py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/landing_page_imgs/high_quality_Logo.png"
            alt="Panday Logo"
            width={40}
            height={40}
            className="h-10 w-10 md:h-12 md:w-12"
          />
          <span className="font-inter text-lg font-bold text-white md:text-xl">
            Panday
          </span>
        </Link>

        {/* Desktop Navigation - Hidden on mobile */}
        <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
          <SignedOut>
            <Link
              href="/roadmap"
              className="font-inria-sans text-base text-white transition hover:text-orange-500"
            >
              Explore
            </Link>
          </SignedOut>

          <SignedIn>
            <Link href="/roadmap">
              <Button className="font-inria-sans rounded-lg bg-[#FF8F27] px-5 py-2 text-base text-white hover:bg-[#FF8F27]/90">
                My Roadmap
              </Button>
            </Link>
          </SignedIn>

          <Link
            href="/about"
            className="font-inria-sans text-base text-white transition hover:text-orange-500"
          >
            About Us
          </Link>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="font-inria-sans text-base font-bold text-white transition hover:text-orange-500">
                Login
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button className="font-inria-sans rounded-lg bg-[#FF8F27] px-5 py-2 text-base text-white hover:bg-[#FF8F27]/90">
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
            <SignedOut>
              <Link
                href="/roadmap"
                className="font-inria-sans py-2 text-lg text-white transition hover:text-orange-500"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Explore
              </Link>
            </SignedOut>

            <SignedIn>
              <Link href="/roadmap" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="font-inria-sans w-full rounded-lg bg-[#FF8F27] px-5 py-2 text-base text-white hover:bg-[#FF8F27]/90">
                  My Roadmap
                </Button>
              </Link>
            </SignedIn>

            <Link
              href="/about"
              className="font-inria-sans py-2 text-lg text-white transition hover:text-orange-500"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About Us
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
