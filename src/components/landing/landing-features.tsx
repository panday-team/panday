"use client";

import {
  Map,
  MessageSquare,
  Brain,
  Sparkles,
  BookOpen,
  Target,
} from "lucide-react";

export function LandingFeatures() {
  return (
    <section className="border-b-4 border-white bg-[#0B101D] py-16 md:border-b-6 md:py-20">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-12 text-center md:mb-16">
          <h2 className="font-inria-sans mb-4 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Powerful Features for Your Success
          </h2>
          <p className="font-inria-sans mx-auto max-w-3xl text-base leading-relaxed text-white/80 md:text-lg">
            Everything you need to navigate your skilled trades journey with
            confidence
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {/* Visual Career Roadmaps */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1D2740] p-6 transition hover:bg-[#1D2740]/80">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#FF8F27] shadow-lg">
              <Map className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-inria-sans mb-3 text-xl font-bold text-white">
                Interactive Visual Roadmaps
              </h3>
              <p className="font-inria-sans text-base leading-relaxed text-white/90">
                Navigate your career path with clear, visual node-based
                roadmaps. Track your progress from foundation programs through
                each apprenticeship level to Red Seal certification.
              </p>
            </div>
          </div>

          {/* Custom Personalized Nodes */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1D2740] p-6 transition hover:bg-[#1D2740]/80">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#FFB830] shadow-lg">
              <Sparkles className="h-8 w-8 text-[#1D2740]" />
            </div>
            <div>
              <h3 className="font-inria-sans mb-3 text-xl font-bold text-white">
                Custom Nodes Tailored to You
              </h3>
              <p className="font-inria-sans text-base leading-relaxed text-white/90">
                Create personalized checklists, reminders, and study notes
                directly on your roadmap. AI automatically positions them near
                relevant milestones with intelligent collision avoidance.
              </p>
            </div>
          </div>

          {/* AI Career Guide */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1D2740] p-6 transition hover:bg-[#1D2740]/80">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#35C1B9] shadow-lg">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-inria-sans mb-3 text-xl font-bold text-white">
                AI-Powered Career Guidance
              </h3>
              <p className="font-inria-sans text-base leading-relaxed text-white/90">
                Get instant, accurate answers to your questions. Our AI chatbot
                understands context and provides personalized guidance for your
                specific career stage.
              </p>
            </div>
          </div>

          {/* Document-Grounded AI */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1D2740] p-6 transition hover:bg-[#1D2740]/80">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#00A67E] shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-inria-sans mb-3 text-xl font-bold text-white">
                Grounded in Official Resources
              </h3>
              <p className="font-inria-sans text-base leading-relaxed text-white/90">
                Every AI response is backed by verified documents from ITA BC,
                government resources, and official trade guides. See source
                citations with every answer for complete transparency.
              </p>
            </div>
          </div>

          {/* Smart Resource Hub */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1D2740] p-6 transition hover:bg-[#1D2740]/80">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#0077CC] shadow-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-inria-sans mb-3 text-xl font-bold text-white">
                Curated Resource Library
              </h3>
              <p className="font-inria-sans text-base leading-relaxed text-white/90">
                Access training materials, certification guides, workplace
                safety resources, and exam prep tools. Everything organized by
                your current level and specialization.
              </p>
            </div>
          </div>

          {/* Progress Tracking */}
          <div className="flex flex-col gap-4 rounded-xl bg-[#1D2740] p-6 transition hover:bg-[#1D2740]/80">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#FF6B35] shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="font-inria-sans mb-3 text-xl font-bold text-white">
                Track Your Journey
              </h3>
              <p className="font-inria-sans text-base leading-relaxed text-white/90">
                Mark milestones complete, save your progress, and visualize how
                far you've come. Your personalized dashboard shows your path
                from entry to certification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
