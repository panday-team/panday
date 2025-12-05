import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week1Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/about">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
        <Link href="/blog/week-2">
          <Button variant="ghost" size="sm">
            Week 2
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 1: The Journey Begins - Building Panday&apos;s Foundation
        </h1>
        <p className="text-muted-foreground mb-4">
          September 24 - September 30, 2025
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
            Welcome to Panday! This week marks the beginning of our journey to
            revolutionize how people navigate skilled trades careers. Our team
            came together with a shared vision: to create a platform that helps
            aspiring tradespeople find their path in an industry that
            desperately needs them. With 700,000+ skilled trades positions
            expected to open by 2028, we knew we had to build something
            meaningful.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            Our design team hit the ground running this week!{" "}
            <strong>Reagan</strong> reorganized our Discord server to create a
            structured workspace and finished our initial user survey, awaiting
            feedback before distribution. <strong>Bruno</strong> took the lead
            on user research, setting up focus groups with trade students and
            developing comprehensive survey questions covering demographics,
            career experience, and apprenticeship backgrounds.{" "}
            <strong>Darrel</strong> contributed to the survey development,
            ensuring we&apos;re asking the right questions to understand our
            users&apos; needs.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            The team also began reaching out to trade students for future user
            research, laying the groundwork for authentic, user-centered design.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            Our developers dove deep into the technical architecture this week.{" "}
            <strong>Nikita</strong> created documentation for Git and Docker
            local development workflows and validated the concept by
            interviewing three people in trades. <strong>Ozem</strong>{" "}
            researched vector embedding databases, exploring MongoDB Atlas and
            Neon&apos;s pgvector extension, while also downloading Xcode to
            explore mobile app possibilities.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Josh</strong> began exploring Model Context Protocol Servers
            for organizing trade school training, certifications, and
            apprenticeship programs. <strong>Peter</strong> analyzed the
            SkilledTradesBC electrician construction website, identifying it as
            a valuable data source for our platform.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 1 was all about foundations: organizing our team structure,
            initiating user research, and exploring technical architectures for
            vector embeddings and data sources. We&apos;re building the
            infrastructure that will support Panday&apos;s mission to guide
            people through skilled trades careers.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Next week, we&apos;ll dive deeper into RAG (Retrieval-Augmented
            Generation) implementation, finalize and distribute our user survey,
            and begin prototyping our core features. The technical team will
            focus on embedding models and database architecture, while design
            continues gathering user insights.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/about">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Posts
          </Button>
        </Link>
        <Link href="/blog/week-2">
          <Button>
            Week 2: Finding Our Direction
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
