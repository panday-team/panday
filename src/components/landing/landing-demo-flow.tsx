"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Map, MessageSquare, CheckCircle2 } from "lucide-react";

const flowSteps = [
  {
    icon: Map,
    title: "See the full path",
    description:
      "Open one visual roadmap and understand what to do next without digging through scattered pages.",
  },
  {
    icon: MessageSquare,
    title: "Ask questions in context",
    description:
      "Use the built-in AI chat while viewing the roadmap. Responses are grounded in source documents.",
  },
  {
    icon: CheckCircle2,
    title: "Track and keep momentum",
    description:
      "Check off tasks, save custom notes, and return anytime with your progress and history intact.",
  },
];

export function LandingDemoFlow() {
  return (
    <section className="border-b-4 border-white bg-[#0B101D] py-14 md:border-b-6 md:py-20">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="font-inria-sans mb-3 text-xs font-bold tracking-[0.24em] text-[#35C1B9] uppercase">
            Product Walkthrough
          </p>
          <h2 className="font-inria-sans text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            A fast, intuitive user flow
          </h2>
          <p className="font-inria-sans mt-4 text-base leading-relaxed text-white/80 md:text-lg">
            Built for clarity first. Every screen helps users understand what
            they need, what to do now, and what comes next.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {flowSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="rounded-2xl border border-white/15 bg-[#1D2740] p-6 shadow-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-inria-sans text-sm font-bold tracking-wide text-[#FFB830]">
                    STEP {index + 1}
                  </span>
                  <div className="rounded-xl bg-[#35C1B9]/20 p-2">
                    <Icon className="h-5 w-5 text-[#35C1B9]" />
                  </div>
                </div>

                <h3 className="font-inria-sans mb-3 text-xl font-bold text-white">
                  {step.title}
                </h3>
                <p className="font-inria-sans text-base leading-relaxed text-white/85">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/demo">
            <Button className="font-inria-sans rounded-lg bg-[#FF8F27] px-7 py-5 text-base font-bold text-white hover:bg-[#FF8F27]/90">
              Open Guided Demo
            </Button>
          </Link>
          <Link href="/roadmap">
            <Button
              variant="outline"
              className="font-inria-sans rounded-lg border-2 border-white/60 bg-transparent px-7 py-5 text-base text-white hover:bg-white/10"
            >
              Launch Live App
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
