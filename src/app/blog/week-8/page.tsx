import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week8Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-7">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 7
          </Button>
        </Link>
        <Link href="/blog/week-9">
          <Button variant="ghost" size="sm">
            Week 9
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 8: RAG Integration and User Profiles
        </h1>
        <p className="text-muted-foreground mb-4">
          November 12 - November 18, 2025
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
            This week marked a significant milestone: integrating our RAG
            (Retrieval-Augmented Generation) agent into the live application.
            Panday can now intelligently answer questions using our curated
            knowledge base while staying on topic and admitting when it
            doesn&apos;t know something.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Reagan</strong> checked over the current tutorial and
            roadmap, brainstorming ideas to increase UX flow. She started
            working on guest and profile views, sign-in flows, and began
            designing the home page and profile page. <strong>Bruno</strong>{" "}
            planned the presentation structure: team intro, problem and
            passions, solution demonstration with tutorial, future prospects,
            and additional app features.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Darrel</strong> designed the landing page for Panday and
            worked on brochure design, completing edits based on team feedback.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Nikita</strong> successfully implemented the LlamaIndex RAG
            agent into the app with a test document, demonstrating good
            performance at staying on topic and acknowledging knowledge
            limitations. He updated the UI and switched from the FastAPI server
            with SentenceTransformers to OpenAI&apos;s text-embedding-3-small
            model, creating a working prototype.
          </p>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Ozem</strong> got the tutorial system fully functional and
            began improving resource and roadblock checklist nodes to display
            helpful information. <strong>Josh</strong> helped Darrel with hi-fi
            designs and pondered the future of voice-assisted AI for
            Panday—imagining conversational interfaces that spawn nodes and
            information dynamically.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Peter</strong> added chat history functionality and FAQ
            integration to the chat interface, allowing users to click FAQ
            questions to populate the chat input. He created a
            chat-history-merge branch with basic functionality published.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We integrated the LlamaIndex RAG agent into our live application,
            enabling intelligent question-answering. Design work progressed on
            user profiles, landing pages, and marketing materials.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 9 will focus on collecting and indexing more documents,
            improving node information displays, and finalizing our marketing
            materials for submission.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-7">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 7: Tutorials and Polish
          </Button>
        </Link>
        <Link href="/blog/week-9">
          <Button>
            Week 9: Content Collection
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
