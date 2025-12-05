import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week9Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-8">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 8
          </Button>
        </Link>
        <Link href="/blog/week-10">
          <Button variant="ghost" size="sm">
            Week 10
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 9: Content Collection and Node Improvements
        </h1>
        <p className="text-muted-foreground mb-4">
          November 19 - November 25, 2025
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
            Week 9 was about content and polish. We began collecting
            comprehensive documentation for our knowledge base, improved how
            nodes display information, and finalized our marketing presence with
            brochures and social media.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Reagan</strong> submitted the brochure and business card
            designs for printing. <strong>Darrel</strong> set up a Proton email
            for Panday and created our Instagram page (@panday_project),
            establishing our social media presence. He finalized the brochure
            design, ready for distribution.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Nikita</strong> updated the embedding generation system to
            avoid re-indexing already processed files, significantly improving
            efficiency. He started collecting documents for our knowledge base,
            storing them in a Notion database for organization.{" "}
            <strong>Ozem</strong> fixed the Application Materials node in the
            Direct Entry path where the info panel wasn&apos;t displaying
            information, then systematically checked all nodes for similar
            issues.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            He added animations to node edges to display roadmap direction and
            cleaned up branches, deleting everything up to November 20th to keep
            the repository organized. Checking off resources now contributes to
            the progression bar, giving users a sense of accomplishment.{" "}
            <strong>Peter</strong> added voice input support to the chat: when
            input is in English, it gets transcribed; when in other languages,
            it gets translated to English. He also changed the FAQ list to a
            carousel above the chat input to save space.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We optimized document indexing, fixed all broken node information
            panels, added voice input to chat, and established Panday&apos;s
            marketing presence with finalized brochures and social media
            accounts.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 10 will focus on mobile development exploration, filming our
            advertisement, and implementing contextual chatbot responses when
            users click nodes.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-8">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 8: RAG Integration
          </Button>
        </Link>
        <Link href="/blog/week-10">
          <Button>
            Week 10: Mobile Exploration
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
