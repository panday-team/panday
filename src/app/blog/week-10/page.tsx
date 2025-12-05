import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week10Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-9">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 9
          </Button>
        </Link>
        <Link href="/blog/week-11">
          <Button variant="ghost" size="sm">
            Week 11
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 10: Mobile Exploration and Video Production
        </h1>
        <p className="text-muted-foreground mb-4">
          November 26 - December 2, 2025
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
            Week 10 expanded Panday&apos;s reach. We began exploring mobile
            development with Swift, filmed scenes for our advertisement, and
            improved the contextual intelligence of our chatbot.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Darrel</strong> filmed several scenes for our advertisement,
            though the team identified that some audio needs to be re-recorded
            for clarity. The visual storytelling is coming together to showcase
            Panday&apos;s impact on real users&apos; lives.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Ozem</strong> started exploring mobile development using
            Swift, getting a welcome page completed. He learned a significant
            amount of Swift fundamentals, laying groundwork for a potential
            mobile companion app. <strong>Josh</strong> worked on improving the
            chatbot&apos;s contextual awareness, proposing that when users click
            a node, the chatbot should automatically open with relevant
            suggestions and FAQs about that specific topic.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            He also began researching advanced memory systems for AI, exploring
            Relationship Context Recognition (RCR) as a way to make the chatbot
            remember user knowledge levels and conversation history across
            sessions.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We began mobile app development with Swift, filmed advertisement
            scenes, and explored advanced AI memory systems to make
            Panday&apos;s chatbot more contextually aware and personalized.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 11 will continue mobile development, potentially switching to
            Expo for cross-platform compatibility, and implementing the
            Relationship Context Recognition system.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-9">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 9: Content Collection
          </Button>
        </Link>
        <Link href="/blog/week-11">
          <Button>
            Week 11: Advanced AI Memory
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
