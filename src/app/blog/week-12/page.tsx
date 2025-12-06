import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Week12Blog() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/blog/week-11">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 11
          </Button>
        </Link>
        <Link href="/blog/week-13">
          <Button variant="ghost" size="sm">
            Week 13
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">
          Week 12: Database Integration and Final Push
        </h1>
        <p className="text-muted-foreground mb-4">
          December 10 - December 16, 2025
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
            Week 12 was about connections—connecting our mobile app to the
            production database, connecting all our features into a cohesive
            experience, and connecting with our final presentation deadline
            rapidly approaching.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            Development Team Updates
          </h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">
            <strong>Ozem</strong> achieved a crucial milestone: getting the
            production database working with the mobile app using Neon&apos;s
            Data API. This approach bypasses the need for Prisma ORM on mobile,
            using direct HTTP requests to query data. He implemented data
            retrieval from the database, following Neon&apos;s documentation on
            getting started with their Data API and custom authentication
            providers.
          </p>
          <p className="text-foreground/90 leading-relaxed">
            <strong>Josh</strong> completed his assigned tasks for the week,
            focusing on the landing page and ensuring the web application was
            polished for demonstration.
          </p>
        </section>

        <section className="bg-muted/50 mb-12 rounded-lg p-6">
          <h2 className="text-primary mb-4 text-2xl font-semibold">TL;DR</h2>
          <p className="text-foreground/90 leading-relaxed">
            We successfully connected the mobile app to our production database
            using Neon&apos;s Data API, eliminating the need for Prisma ORM on
            mobile. The landing page was completed and core features were
            polished.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-primary mb-4 text-2xl font-semibold">
            What&apos;s Next?
          </h2>
          <p className="text-foreground/90 leading-relaxed">
            Week 13 is our final week—time to polish everything, prepare our
            presentation, and showcase what Panday can do for people navigating
            skilled trades careers.
          </p>
        </section>
      </article>

      {/* Footer Navigation */}
      <footer className="mt-16 flex justify-between border-t pt-8">
        <Link href="/blog/week-11">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Week 11: Advanced AI Memory
          </Button>
        </Link>
        <Link href="/blog/week-13">
          <Button>
            Week 13: The Final Sprint
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </footer>
    </div>
  );
}
