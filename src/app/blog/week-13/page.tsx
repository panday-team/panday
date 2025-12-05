import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Week13Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-12">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 12
          </Button>
        </Link>
        <Link href="/about">
          <Button variant="ghost" size="sm">
            All Posts
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 13: The Final Sprint - Polishing Panday
        </h1>
        <p className="text-muted-foreground mb-4">
          December 17 - December 23, 2025
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
            We made it. Week 13 represents the culmination of three months of
            research, design, development, and iteration. Panday has evolved
            from a concept to a working platform that can genuinely help people
            navigate skilled trades careers.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What We Built
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            Panday is now a comprehensive career roadmap platform featuring:
          </p>
          <ul className="text-foreground/90 mb-4 list-disc space-y-2 pl-6">
            <li>
              <strong>Interactive Visual Roadmap:</strong> Built with ReactFlow,
              users can explore career paths from apprentice to master
              electrician, with animated nodes and edges showing progression.
            </li>
            <li>
              <strong>AI-Powered Chatbot:</strong> Integrated with LlamaIndex
              RAG, our chatbot answers questions using curated trade resources,
              stays on topic, and admits when it doesn&apos;t know something.
            </li>
            <li>
              <strong>Progress Tracking:</strong> Users can check off completed
              resources and roadblocks, with a visual progress bar showing their
              journey.
            </li>
            <li>
              <strong>Voice Input:</strong> Multilingual voice support with
              automatic transcription and translation.
            </li>
            <li>
              <strong>Mobile Companion:</strong> An Expo-based mobile app
              connected to our production database via Neon&apos;s Data API.
            </li>
            <li>
              <strong>Tutorial System:</strong> First-time users receive guided
              onboarding to understand how to navigate the roadmap.
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            The Journey
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            From Week 1&apos;s foundational research to Week 13&apos;s final
            polish, Team Panday has:
          </p>
          <ul className="text-foreground/90 mb-4 list-disc space-y-2 pl-6">
            <li>Conducted user research with real trade students</li>
            <li>Deployed AI infrastructure on AWS</li>
            <li>Created a comprehensive visual identity</li>
            <li>Indexed thousands of trade resource documents</li>
            <li>Built both web and mobile applications</li>
            <li>
              Established marketing presence with brochures and social media
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">Our Team</h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Full Stack Developers:</strong> Peter, Nikita, Josh, Ozem,
            and Manny brought Panday&apos;s technical vision to life, from
            vector embeddings to mobile apps.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>UI/UX Designers:</strong> Bruno, Darrel, and Reagan crafted
            an intuitive, beautiful experience that makes complex career paths
            understandable.
          </p>
          <p className="text-foreground/90 mt-4 leading-relaxed">
            Together, we built something that matters.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 13 marks the completion of Panday—a working platform with
            interactive roadmaps, AI guidance, progress tracking, voice input,
            and mobile support. Three months of intense collaboration produced a
            tool that can genuinely help people navigate skilled trades careers.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            Panday&apos;s journey doesn&apos;t end here. We envision:
          </p>
          <ul className="text-foreground/90 mb-4 list-disc space-y-2 pl-6">
            <li>Expanding to all Red Seal trades beyond electricians</li>
            <li>Implementing advanced AI memory systems (RCR)</li>
            <li>Building employer partnerships for apprenticeship matching</li>
            <li>Creating community features for mentorship</li>
            <li>Scaling across Canada and beyond</li>
          </ul>
          <p className="text-foreground/90 leading-relaxed">
            The skilled trades need 700,000+ workers by 2028. Panday will help
            them find their way.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Thank You
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            Thank you for following our journey. This is just the beginning.
          </p>
          <p className="text-foreground/90 mb-2">
            <strong>Follow us:</strong>{" "}
            <a
              href="https://www.instagram.com/panday_project"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              @panday_project on Instagram
            </a>
          </p>
          <p className="text-foreground/90">
            <strong>Contact:</strong>{" "}
            <a
              href="mailto:hello@panday.app"
              className="text-primary hover:underline"
            >
              hello@panday.app
            </a>
          </p>
        </section>

        <section className="border-primary/20 text-foreground/80 mt-12 border-t pt-8 text-center italic">
          <p>Panday - Forging Pathways in Skilled Trades</p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-12">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 12: Database Integration
          </Button>
        </Link>
        <Link href="/about">
          <Button>All Blog Posts</Button>
        </Link>
      </footer>
    </div>
  );
}
