"use client";

import Link from "next/link";

export function LandingFooter() {
    return (
        <footer className="bg-[#0B101D] py-20 border-t-[15px] border-white">
            <div className="container mx-auto px-8">
                <div className="text-center text-white text-xl font-inria-sans">
                    <Link href="/about" className="hover:text-orange-500 transition">
                        About Us
                    </Link>
                    {" | "}
                    <Link href="/contact" className="hover:text-orange-500 transition">
                        Contact
                    </Link>
                    {" | "}
                    <Link href="/privacy" className="hover:text-orange-500 transition">
                        Privacy Policy
                    </Link>
                    <div className="mt-4">
                        Copyright © 2025 Panday | All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
