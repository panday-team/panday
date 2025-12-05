import Link from "next/link";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import {
  Code,
  Palette,
  ArrowRight,
  Users,
  AlertTriangle,
  TrendingUp,
  Compass,
  Mail,
  Instagram,
  Zap,
} from "lucide-react";

const teamMembers = {
  developers: [
    { name: "Peter", role: "Full Stack Developer" },
    { name: "Nikita", role: "Full Stack Developer" },
    { name: "Josh", role: "Full Stack Developer" },
    { name: "Ozem", role: "Full Stack Developer" },
    { name: "Manny", role: "Full Stack Developer" },
  ],
  designers: [
    { name: "Bruno", role: "UI/UX Designer" },
    { name: "Darrel", role: "UI/UX Designer" },
    { name: "Reagan", role: "UI/UX Designer" },
  ],
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#1D2740]">
      <LandingHeader />

      {/* Hero Section */}
      <section className="border-b-4 border-white bg-[#0B101D] pt-24 pb-16 md:border-b-6 md:pt-32 md:pb-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-inria-sans mb-6 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              About <span className="text-[#FF8F27]">Panday</span>
            </h1>
            <p className="font-inria-sans mx-auto max-w-3xl text-lg leading-relaxed text-white/80 md:text-xl">
              By 2030, BC will need over{" "}
              <span className="font-bold text-[#FF8F27]">85,000</span> new
              skilled trades workers. Over half of registered apprentices never
              finish their Red Seal certification. Not because they&apos;re not
              capable, but because the journey is confusing, scattered, and
              overwhelming.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="border-b-4 border-white bg-[#1D2740] py-16 md:border-b-6 md:py-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-inria-sans mb-4 text-center text-3xl font-bold text-white md:text-4xl">
              The Problem
            </h2>
            <p className="font-inria-sans mx-auto mb-12 max-w-2xl text-center text-white/70">
              The path isn&apos;t hard because of the work. It&apos;s hard
              because the system was never built with people in mind.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl bg-[#0B101D] p-6">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#FF6B35]">
                  <AlertTriangle className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-inria-sans mb-2 text-xl font-bold text-white">
                  72% Labour Shortage
                </h3>
                <p className="font-inria-sans text-sm leading-relaxed text-white/70">
                  Construction firms report severe labour shortages, yet
                  qualified people remain stuck on waitlists or lost in the
                  system.
                </p>
              </div>

              <div className="rounded-xl bg-[#0B101D] p-6">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#FF6B35]">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-inria-sans mb-2 text-xl font-bold text-white">
                  70% Drop-off Rate
                </h3>
                <p className="font-inria-sans text-sm leading-relaxed text-white/70">
                  For women in the trades, barriers are even steeper. 70% of
                  female apprentices don&apos;t make it to certification.
                </p>
              </div>

              <div className="rounded-xl bg-[#0B101D] p-6">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#FF6B35]">
                  <Compass className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-inria-sans mb-2 text-xl font-bold text-white">
                  Scattered Information
                </h3>
                <p className="font-inria-sans text-sm leading-relaxed text-white/70">
                  People aren&apos;t struggling because they lack drive.
                  They&apos;re surrounded by information that never gives them
                  clarity or confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="border-b-4 border-white bg-[#0B101D] py-16 md:border-b-6 md:py-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-inria-sans mb-4 text-center text-3xl font-bold text-white md:text-4xl">
              Our Solution
            </h2>
            <p className="font-inria-sans mx-auto mb-12 max-w-2xl text-center text-white/70">
              Panday transforms confusion into clarity, giving users a
              structured path with AI-powered support every step of the way.
            </p>

            <div className="rounded-xl bg-[#1D2740] p-8">
              <div className="grid gap-8 md:grid-cols-3">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF8F27]">
                    <Compass className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-inria-sans mb-2 font-bold text-white">
                    Clear Paths
                  </h3>
                  <p className="font-inria-sans text-sm text-white/70">
                    Workers get visual roadmaps to high-paying careers with
                    their Red Seal certification.
                  </p>
                </div>

                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#35C1B9]">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-inria-sans mb-2 font-bold text-white">
                    Qualified Candidates
                  </h3>
                  <p className="font-inria-sans text-sm text-white/70">
                    Employers get access to motivated, well-prepared workers
                    ready for the trades.
                  </p>
                </div>

                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00A67E]">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-inria-sans mb-2 font-bold text-white">
                    Closing the Gap
                  </h3>
                  <p className="font-inria-sans text-sm text-white/70">
                    BC gets closer to filling that 85,000 worker gap by 2030.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="border-b-4 border-white bg-[#1D2740] py-16 md:border-b-6 md:py-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF8F27]">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h2 className="font-inria-sans mb-6 text-3xl font-bold text-white md:text-4xl">
              This is Just the Beginning
            </h2>
            <p className="font-inria-sans mb-6 text-lg leading-relaxed text-white/80">
              We&apos;re starting with electricians, but soon we&apos;re
              expanding to plumbers, HVAC technicians, welders, carpenters, and
              more.
            </p>
            <p className="font-inria-sans text-lg leading-relaxed text-white/80">
              Our vision is bigger than a single trade. We&apos;re building a
              full ecosystem that carries people from training, to job
              placement, to real career advancement.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="border-b-4 border-white bg-[#0B101D] py-16 md:border-b-6 md:py-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-inria-sans mb-12 text-center text-3xl font-bold text-white md:text-4xl">
              Meet the Team
            </h2>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Developers */}
              <div className="rounded-xl bg-[#1D2740] p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#35C1B9]">
                    <Code className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-inria-sans text-xl font-bold text-white">
                    Development
                  </h3>
                </div>
                <div className="space-y-3">
                  {teamMembers.developers.map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="font-inria-sans font-medium text-white">
                        {member.name}
                      </span>
                      <span className="font-inria-sans text-sm text-white/50">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Designers */}
              <div className="rounded-xl bg-[#1D2740] p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FF8F27]">
                    <Palette className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-inria-sans text-xl font-bold text-white">
                    Design
                  </h3>
                </div>
                <div className="space-y-3">
                  {teamMembers.designers.map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="font-inria-sans font-medium text-white">
                        {member.name}
                      </span>
                      <span className="font-inria-sans text-sm text-white/50">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog CTA Section */}
      <section className="bg-[#1D2740] py-16 md:py-20">
        <div className="container mx-auto px-4 text-center md:px-8">
          <h2 className="font-inria-sans mb-4 text-3xl font-bold text-white md:text-4xl">
            Follow Our Journey
          </h2>
          <p className="font-inria-sans mx-auto mb-8 max-w-xl text-white/70">
            Read our weekly development blog to see how Panday evolved from
            concept to launch over 13 weeks.
          </p>
          <Link
            href="/blog"
            className="font-inria-sans inline-flex items-center gap-2 rounded-lg bg-[#FF8F27] px-6 py-3 font-medium text-white transition hover:bg-[#FF8F27]/90"
          >
            Read the Blog
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="border-t-4 border-white bg-[#0B101D] py-16 md:border-t-6 md:py-20">
        <div className="container mx-auto px-4 text-center md:px-8">
          <h2 className="font-inria-sans mb-6 text-3xl font-bold text-white md:text-4xl">
            Get in Touch
          </h2>
          <p className="font-inria-sans mx-auto mb-8 max-w-xl text-white/70">
            Have questions or want to learn more about Panday? We&apos;d love to
            hear from you.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:hello@panday.app"
              className="font-inria-sans inline-flex items-center gap-2 rounded-lg bg-[#FF8F27] px-6 py-3 font-medium text-white transition hover:bg-[#FF8F27]/90"
            >
              <Mail className="h-5 w-5" />
              hello@panday.app
            </a>
            <a
              href="https://www.instagram.com/panday_project"
              target="_blank"
              rel="noopener noreferrer"
              className="font-inria-sans inline-flex items-center gap-2 rounded-lg border-2 border-white/20 px-6 py-3 font-medium text-white transition hover:border-white/40 hover:bg-white/5"
            >
              <Instagram className="h-5 w-5" />
              @panday_project
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
