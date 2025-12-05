import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week7Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-6">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 6
          </Button>
        </Link>
        <Link href="/blog/week-8">
          <Button variant="ghost" size="sm">
            Week 8
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 7: Tutorials and Polish
        </h1>
        <p className="text-muted-foreground mb-4">
          November 5 - November 11, 2025
        </p>
        <p className="text-muted-foreground">By Panday Team</p>
      </header>

      {/* Content */}
      <article className="prose prose-invert max-w-none">
        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Introduction
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            Week 7 was about making Panday accessible to everyone. We
            implemented tutorial systems, added progress tracking, and worked on
            marketing materials to share our vision with the world.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Reagan</strong> updated the node look and overall roadmap
            improvements, working on the progress bar design and redesigning the
            main map. She began researching landing page designs and started
            working on the tutorial system. <strong>Bruno</strong> made the
            script for Panday&apos;s advertisement storyboard, worked on
            business cards and trifold posters, filmed ad scenes, and uploaded
            videos to our shared Google Drive.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Darrel</strong> created new components for wireframes,
            including resource and checklist nodes with their information boxes,
            designing the onboarding, landing, and other informational pages for
            the roadmap feature.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Nikita</strong> continued working on porting designs to code
            and implementing AI features with LlamaIndex, making steady progress
            on the roadmap implementation. <strong>Ozem</strong> got the
            tutorial system working for first-time users, with plans to improve
            the visual design once hi-fi designs are ready. He also fixed
            linting errors to make features mergeable.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Josh</strong> worked on OCR (Optical Character Recognition)
            for fun, setting up Tesseract.js with TypeScript—exploring how we
            might extract text from images of trade documents in the future.{" "}
            <strong>Peter</strong> made the cron pipeline reliable end-to-end,
            implementing FAQ extraction, clustering, and consolidation using
            LLM-powered generateObject with Zod validation (though ultimately
            decided it was too complex for current implementation).
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We implemented a tutorial system for first-time users, added
            progress tracking functionality, and created marketing materials
            including business cards and advertisement storyboards.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 8 will see us implementing the LlamaIndex RAG agent into the
            app, refining the tutorial experience, and continuing work on our
            public-facing materials.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-6">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 6: Refining the Experience
          </Button>
        </Link>
        <Link href="/blog/week-8">
          <Button>
            Week 8: RAG Integration
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
