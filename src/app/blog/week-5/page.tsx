import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week5Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 4
          </Button>
        </Link>
        <Link href="/blog/week-6">
          <Button variant="ghost" size="sm">
            Week 6
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 5: Bringing the Roadmap to Life
        </h1>
        <p className="text-muted-foreground mb-4">
          October 22 - October 28, 2025
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
            This week, Panday started feeling real. We integrated our designs
            with ReactFlow, implemented interactive features, and received
            invaluable feedback from Anna, a Master Electrician and our project
            advisor. Her insights will make Panday truly useful for people in
            the trades.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Design Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Reagan</strong> finished the logo and mascot, adding changes
            to the chatbox design and map structure. She worked on the midterm
            presentation and storyboard for our video presentation, then met
            with Anna to gather feedback. Anna&apos;s suggestions included:
            save-your-resources functionality, progress bars, roadblock
            indicators, zoom sliders, time estimates, better nodes with pictures
            and info.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Bruno</strong> worked on ad ideation, presented the
            storyboard, and started on presentation slides.{" "}
            <strong>Darrel</strong> created the onboarding storyboard, drawing
            up concepts for how new users will first experience Panday.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Nikita</strong> successfully integrated ReactFlow with
            shadcn UI components, creating a test app that demonstrates custom
            node creation. The implementation allows for flexible, beautiful
            node designs that match our visual system. <strong>Ozem</strong> got
            the chatbot feature working with nodes, added floating animations to
            purple checklist nodes, fixed the grid background for better
            zoom-out visibility, and matched the chat interface with the hi-fi
            design.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Josh</strong> sent our survey to Reddit communities
            (SurveyExchange and SampleSize) to gather broader feedback and began
            researching reinforcement learning concepts. <strong>Peter</strong>{" "}
            added a web interface for chat interaction and deployed it to a
            public server, making the LlamaIndex corpus accessible to the entire
            team for testing.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We integrated ReactFlow with our design system, implemented
            interactive chatbot features with animated nodes, and received
            critical feedback from a Master Electrician that will guide our
            feature development.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 6 will focus on implementing Anna&apos;s feedback: adding
            resource-saving functionality, progress tracking, and improving node
            information displays. We&apos;ll also continue preparing for our
            midterm presentation.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 4: Deployment and Design
          </Button>
        </Link>
        <Link href="/blog/week-6">
          <Button>
            Week 6: Refining the Experience
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
