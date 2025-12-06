import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week3Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-2">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 2
          </Button>
        </Link>
        <Link href="/blog/week-4">
          <Button variant="ghost" size="sm">
            Week 4
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 3: Deep Dive into Embeddings and User Flows
        </h1>
        <p className="text-muted-foreground mb-4">
          October 8 - October 14, 2025
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
            This week, our team went deep on both technical implementation and
            user experience design. We&apos;re moving from concept to concrete
            prototypes, understanding how vector embeddings work while
            simultaneously mapping out user flows and wireframes.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Reagan</strong> continued working on lo-fi designs and user
            flows, receiving valuable feedback from Henry about the hi-fi
            direction. <strong>Bruno</strong> started documenting user personas,
            creating detailed profiles of our target users to guide design
            decisions. <strong>Darrel</strong> completed a competitive analysis
            and finished survey edits, then began working on user flow diagrams
            to map the journey through our application.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            The design team is building a comprehensive understanding of who
            will use Panday and how they&apos;ll interact with it.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Nikita</strong> made significant progress understanding
            vector embeddings, reading an excellent Cloudflare article on the
            topic and exploring pgvector Docker images, embedding model
            leaderboards, and Neon&apos;s AI concepts documentation.{" "}
            <strong>Ozem</strong> created a mind map using ReactFlow framework
            to visualize the project structure, showing how clicking timeline
            nodes could display generated roadmaps or job requirements.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Josh</strong> analyzed the SkilledTradesBC website with
            Claude AI, discovering that while the content is comprehensive, the
            navigation is challenging—validating our mission to make this
            information more digestible. <strong>Peter</strong> crawled the
            SkilledTradesBC electrician construction site, extracting
            approximately 3,200 JSON files and uploading them to GitHub for
            processing.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We deepened our understanding of vector embeddings and began
            implementing them with pgvector. The design team created user
            personas and flows while developers built prototypes and gathered
            data from skilled trades resources.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 4 will see us deploying our first embedding API, refining our
            visual designs based on feedback, and beginning to connect our
            frontend prototypes with backend services.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-2">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 2: Finding Our Direction
          </Button>
        </Link>
        <Link href="/blog/week-4">
          <Button>
            Week 4: Deployment and Design
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
