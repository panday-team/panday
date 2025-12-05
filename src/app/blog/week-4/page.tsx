import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week4Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-3">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 3
          </Button>
        </Link>
        <Link href="/blog/week-5">
          <Button variant="ghost" size="sm">
            Week 5
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 4: Deployment and Design Refinement
        </h1>
        <p className="text-muted-foreground mb-4">
          October 15 - October 21, 2025
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
            Week 4 was about making things real. We deployed our first services
            to the cloud, refined our visual identity, and received critical
            feedback that will shape Panday&apos;s user experience. The gap
            between prototype and product is closing.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Reagan</strong> had a consultation meeting with Henry,
            gaining clarity on design direction. She created paper sketches and
            began developing a new logo and mascot in Illustrator, aiming to
            give Panday a friendly, approachable identity.{" "}
            <strong>Bruno</strong> connected with BCIT trade students to gather
            more survey responses and discussed possible new directions with the
            team over the weekend.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Darrel</strong> finished and submitted the survey findings
            document, then worked on lo-fi wireframes and updated design
            components based on user feedback.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Nikita</strong> achieved a major milestone: deploying a
            FastAPI server running an embedding model locally using sentence
            transformers on an AWS EC2 instance using Terraform. This
            infrastructure will power our AI-driven features.{" "}
            <strong>Ozem</strong> fixed node edges and label positioning to make
            the roadmap visualization cleaner, while reviewing Python and
            FastAPI for backend development.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Josh</strong> continued analyzing the SkilledTradesBC
            website, using Claude to evaluate its usability—confirming that the
            5461-pixel-long page with hidden expandable sections creates
            cognitive overload for users. <strong>Peter</strong> significantly
            enhanced the LlamaIndex implementation, adding a command-line chat
            interface, migrating from JSON to persistent Chroma vector store,
            and hardening the index rebuild logic.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We deployed our first embedding API to AWS, created Panday&apos;s
            visual identity with a new logo and mascot, and completed our user
            survey analysis. The technical infrastructure is taking shape
            alongside refined designs.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 5 will integrate ReactFlow with our design system, implement
            the chatbot feature with node interactions, and prepare for our
            midterm presentation.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-3">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 3: Deep Dive into Embeddings
          </Button>
        </Link>
        <Link href="/blog/week-5">
          <Button>
            Week 5: Bringing the Roadmap to Life
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
