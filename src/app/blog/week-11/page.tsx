import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week11Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-10">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 10
          </Button>
        </Link>
        <Link href="/blog/week-12">
          <Button variant="ghost" size="sm">
            Week 12
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 11: Advanced AI Memory and Mobile Pivot
        </h1>
        <p className="text-muted-foreground mb-4">
          December 3 - December 9, 2025
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
            Week 11 pushed the boundaries of what Panday&apos;s AI can do. We
            designed a Relationship Context Recognition system to make
            conversations progressively more intelligent, though implementation
            proved challenging. We also made strategic decisions about mobile
            development.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Ozem</strong> made a strategic pivot in mobile development,
            switching from native Swift to Expo. The reason? Apple&apos;s $120
            developer fee just to test apps isn&apos;t worth it at this stage.
            Expo provides cross-platform development (iOS and Android) without
            the upfront costs, making it perfect for our prototype phase. He set
            up the panday-native repository and began development.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Josh</strong> attempted to implement Relationship Context
            Recognition (RCR), an advanced AI memory system that would: track
            complete conversation threads and topic progression, build dynamic
            models of each user&apos;s expertise level, adapt explanation depth
            based on demonstrated knowledge, and connect related concepts across
            conversations. While the RCR implementation didn&apos;t succeed this
            week, the research and design work laid important groundwork for
            future iterations. Josh also worked on the landing page and made the
            AI chatbot collapsible to improve screen real estate management.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We pivoted mobile development to Expo for cost-effectiveness and
            cross-platform support. Advanced AI memory systems (RCR) were
            designed but proved too complex for immediate implementation. The
            landing page and chatbot UI received improvements.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 12 will focus on connecting the mobile app to our production
            database, completing the landing page, and finalizing features for
            our final presentation.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-10">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 10: Mobile Exploration
          </Button>
        </Link>
        <Link href="/blog/week-12">
          <Button>
            Week 12: Database Integration
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
