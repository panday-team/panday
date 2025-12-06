import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week2Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-1">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 1
          </Button>
        </Link>
        <Link href="/blog/week-3">
          <Button variant="ghost" size="sm">
            Week 3
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 2: Finding Our Direction - RAG Research and User Feedback
        </h1>
        <p className="text-muted-foreground mb-4">
          October 1 - October 7, 2025
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
            Week 2 brought clarity to our vision. After conversations with our
            project advisor Anna, we pivoted from a job-matching platform to
            something more powerful: an interactive career roadmap tool with AI
            guidance. This shift addresses the real problem—information
            fragmentation in skilled trades navigation.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Reagan</strong> made significant progress on the user
            survey, incorporating feedback from both Wim (our design teacher)
            and Anna. She successfully cloned our Git repository and set up her
            local development environment, preparing to contribute to the
            codebase. <strong>Bruno</strong> conducted a crucial feedback
            meeting with Wim and revised the survey based on Anna&apos;s
            insights before sending it out to potential users.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            The team made a strategic decision to focus on one main feature for
            our December 23rd deadline: a career roadmap for electricians with
            centralized resources. <strong>Darrel</strong> continued refining
            survey questions to ensure we capture the right user insights.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Nikita</strong> researched RAG implementation extensively,
            exploring pgvector, PostgreSQL&apos;s pg_trgm, and various embedding
            models including HuggingFace&apos;s all-MiniLM-L6-v2 and
            OpenAI&apos;s text-embedding-3-small. <strong>Ozem</strong>{" "}
            investigated Upstash&apos;s vector database and watched educational
            content on LlamaIndex, while familiarizing himself with AWS services
            (EC2, S3, Lambda).
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Josh</strong> had a breakthrough conversation with Claude
            AI, clarifying Panday&apos;s concept: a roadmap visualization tool
            where users input their goals (e.g., &quot;I want to be an
            entrepreneur in electrical construction&quot;) and receive an
            interactive, AI-guided path with resources at each node.{" "}
            <strong>Peter</strong> created a simple LlamaIndex example,
            demonstrating how we could implement document indexing and
            retrieval.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We pivoted to a career roadmap visualization tool with AI guidance,
            moving away from job matching. The team researched RAG
            implementation, refined our user survey, and defined our core
            feature: interactive career pathways for electricians.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 3 will focus on vector embedding implementation, competitive
            analysis, and developing our first lo-fi wireframes. We&apos;ll also
            begin analyzing survey results as responses come in.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-1">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 1: The Journey Begins
          </Button>
        </Link>
        <Link href="/blog/week-3">
          <Button>
            Week 3: Deep Dive into Embeddings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
