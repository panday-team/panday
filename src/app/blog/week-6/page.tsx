import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week6Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-5">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 5
          </Button>
        </Link>
        <Link href="/blog/week-7">
          <Button variant="ghost" size="sm">
            Week 7
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 6: Refining the Experience
        </h1>
        <p className="text-muted-foreground mb-4">
          October 29 - November 4, 2025
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
            Armed with Anna&apos;s feedback, we spent Week 6 refining every
            aspect of the user experience. From streaming AI responses to
            redesigning nodes, we&apos;re making Panday more intuitive and
            powerful with each iteration.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Reagan</strong> adjusted wireframes with new features
            including different chat logs, redesigned nodes, slider bars for
            zooming, and improved layouts. She worked on redesigning the node
            appearance and overall roadmap structure. <strong>Bruno</strong>{" "}
            planned a meeting for November 24th to discuss presentation
            strategy, splitting responsibilities: team intro, problem statement,
            solution demonstration with tutorial, future prospects, and
            showcasing the app&apos;s capabilities.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Darrel</strong> made design changes to the hi-fi that
            reflect the main app, worked on scripts and slideshows, and helped
            write the storyboard for our advertisement concept.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Nikita</strong> worked on porting designs to code and
            implementing AI features with LlamaIndex. <strong>Ozem</strong>{" "}
            achieved a major UX improvement: making the chatbot stream responses
            with a typewriter effect and live progress updates (showing
            &quot;retrieving augmented info&quot; and &quot;generating
            response&quot; states). He also changed the rate limiter to use
            userId instead of cookieId in Redis and added auto-scroll to the
            chatbox.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Josh</strong> attempted to create lo-fi designs using Figma
            Make (admittedly with limited success—we all have our strengths!).{" "}
            <strong>Peter</strong> worked on MCP (Model Context Protocol)
            implementation for embeddings, creating a workflow that works across
            different LLM agents, though some bugs remain to be fixed.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We implemented streaming AI responses with live progress indicators,
            redesigned nodes based on Master Electrician feedback, and continued
            refining the user interface. The app is becoming more responsive and
            intuitive.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 7 will focus on implementing the tutorial system for first-time
            users, adding progress bars, and continuing to build robustness into
            our features.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-5">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 5: Bringing the Roadmap to Life
          </Button>
        </Link>
        <Link href="/blog/week-7">
          <Button>
            Week 7: Tutorials and Polish
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
