import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const demoHighlights = [
  {
    title: "Visual roadmap canvas",
    description:
      "Interactive node graph that helps users understand requirements and next steps at a glance.",
  },
  {
    title: "Context-aware AI chat",
    description:
      "Users ask questions while viewing roadmap nodes and get source-grounded guidance.",
  },
  {
    title: "Progress and continuity",
    description:
      "Checklist completion, profile state, and conversation history keep the experience continuous.",
  },
];

const userFlow = [
  "Choose your current level and entry path.",
  "Explore milestone nodes and checklist details.",
  "Ask questions in chat and follow source-backed recommendations.",
  "Track completion and move to the next stage with confidence.",
];

export default function DemoPage() {
  return (
    <main className="min-h-dvh bg-[#0B101D] text-white">
      <section className="border-b-4 border-white bg-[#1D2740] pt-24 pb-14 md:border-b-6 md:pt-28 md:pb-16">
        <div className="container mx-auto px-4 md:px-8">
          <Badge className="font-inria-sans bg-[#35C1B9]/20 text-[#35C1B9] hover:bg-[#35C1B9]/20">
            Guided Demo
          </Badge>
          <h1 className="font-inria-sans mt-4 max-w-3xl text-3xl font-bold md:text-4xl lg:text-5xl">
            See how Panday works in under 2 minutes
          </h1>
          <p className="font-inria-sans mt-4 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
            This is a quick walkthrough of the real product flow. Built to make
            a complex trades journey feel simple, clear, and actionable.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/roadmap">
              <Button className="font-inria-sans rounded-lg bg-[#FF8F27] px-7 py-5 text-base font-bold text-white hover:bg-[#FF8F27]/90">
                Open Live Roadmap
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                className="font-inria-sans rounded-lg border-2 border-white/60 bg-transparent px-7 py-5 text-base text-white hover:bg-white/10"
              >
                Back to Landing Page
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b-4 border-white py-12 md:border-b-6 md:py-16">
        <div className="container mx-auto grid grid-cols-1 gap-8 px-4 md:px-8 lg:grid-cols-2">
          <div className="relative min-h-[300px] overflow-hidden rounded-2xl border border-white/15 bg-[#1D2740] shadow-2xl md:min-h-[420px]">
            <Image
              src="/landing_page_imgs/roadmap_preview.png"
              alt="Roadmap and chat preview"
              fill
              className="object-contain p-4"
              priority
            />
          </div>

          <div className="space-y-5">
            <h2 className="font-inria-sans text-2xl font-bold md:text-3xl">
              Core product highlights
            </h2>
            {demoHighlights.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-white/15 bg-[#1D2740] p-5"
              >
                <h3 className="font-inria-sans text-lg font-bold text-[#FFB830] md:text-xl">
                  {item.title}
                </h3>
                <p className="font-inria-sans mt-2 text-base leading-relaxed text-white/85">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="rounded-2xl border border-white/15 bg-[#1D2740] p-6 md:p-8">
            <h2 className="font-inria-sans text-2xl font-bold md:text-3xl">
              Typical user flow
            </h2>
            <ol className="mt-6 space-y-4">
              {userFlow.map((step, index) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="font-inria-sans inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#35C1B9]/20 text-sm font-bold text-[#35C1B9]">
                    {index + 1}
                  </span>
                  <p className="font-inria-sans pt-0.5 text-base leading-relaxed text-white/90 md:text-lg">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
