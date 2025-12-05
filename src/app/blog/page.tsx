import Link from "next/link";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ArrowRight } from "lucide-react";

const blogPosts = [
  {
    title: "The Journey Begins",
    subtitle: "Building Panday's foundation - organizing our team, initiating user research, and exploring technical architectures.",
    date: "September 24 - 30, 2025",
  },
  {
    title: "Finding Our Direction",
    subtitle: "RAG research and user feedback - pivoting to an interactive career roadmap tool with AI guidance.",
    date: "October 1 - 7, 2025",
  },
  {
    title: "Deep Dive into Embeddings",
    subtitle: "Understanding vector embeddings and user flows while mapping out wireframes and personas.",
    date: "October 8 - 14, 2025",
  },
  {
    title: "Deployment and Design",
    subtitle: "Making things real - deploying first services to the cloud and refining our visual identity.",
    date: "October 15 - 21, 2025",
  },
  {
    title: "Bringing the Roadmap to Life",
    subtitle: "Integrating designs with ReactFlow and receiving invaluable feedback from a Master Electrician.",
    date: "October 22 - 28, 2025",
  },
  {
    title: "Refining the Experience",
    subtitle: "Implementing streaming AI responses and redesigning nodes based on expert feedback.",
    date: "October 29 - November 4, 2025",
  },
  {
    title: "Tutorials and Polish",
    subtitle: "Making Panday accessible with tutorial systems, progress tracking, and marketing materials.",
    date: "November 5 - 11, 2025",
  },
  {
    title: "RAG Integration",
    subtitle: "Integrating our RAG agent into the live application with intelligent question-answering.",
    date: "November 12 - 18, 2025",
  },
  {
    title: "Content Collection",
    subtitle: "Collecting comprehensive documentation, fixing node displays, and establishing marketing presence.",
    date: "November 19 - 25, 2025",
  },
  {
    title: "Mobile Exploration",
    subtitle: "Exploring mobile development with Swift, filming advertisement scenes, and improving chatbot context.",
    date: "November 26 - December 2, 2025",
  },
  {
    title: "Advanced AI Memory",
    subtitle: "Designing Relationship Context Recognition and pivoting mobile development to Expo.",
    date: "December 3 - 9, 2025",
  },
  {
    title: "Database Integration",
    subtitle: "Connecting mobile app to production database using Neon's Data API.",
    date: "December 10 - 16, 2025",
  },
  {
    title: "The Final Sprint",
    subtitle: "Polishing Panday - the culmination of three months of research, design, and development.",
    date: "December 17 - 23, 2025",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#1D2740]">
      <LandingHeader />

      {/* Hero Section */}
      <section className="border-b-4 border-white bg-[#0B101D] pt-24 pb-12 md:border-b-6 md:pt-32 md:pb-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-inria-sans mb-4 text-4xl font-bold text-white md:text-5xl">
              Development Blog
            </h1>
            <p className="font-inria-sans text-lg text-white/70">
              13 weeks of building Panday, from concept to launch.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="bg-[#0B101D] py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-white/20 md:left-[31px]" />

              {blogPosts.map((post, index) => (
                <Link
                  key={index}
                  href={`/blog/week-${index + 1}`}
                  className="group relative mb-8 flex gap-4 last:mb-0 md:gap-6"
                >
                  {/* Week number circle */}
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF8F27] text-lg font-bold text-white transition-transform group-hover:scale-110 md:h-16 md:w-16 md:text-xl">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-xl bg-[#1D2740] p-4 transition-all group-hover:bg-[#1D2740]/80 md:p-6">
                    <div className="mb-1 text-sm text-white/50">{post.date}</div>
                    <h2 className="font-inria-sans mb-2 text-lg font-bold text-white group-hover:text-[#FF8F27] md:text-xl">
                      Week {index + 1}: {post.title}
                    </h2>
                    <p className="font-inria-sans mb-3 text-sm leading-relaxed text-white/70 md:text-base">
                      {post.subtitle}
                    </p>
                    <div className="flex items-center gap-1 text-sm font-medium text-[#FF8F27]">
                      Read more
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
