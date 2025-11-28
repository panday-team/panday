import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type BlogCardProps = {
  title: string;
  link: string;
};

const BlogCard: React.FC<BlogCardProps> = ({ title, link }) => {
  return (
    <a
      href={link}
      className="flex h-40 flex-col rounded-lg border bg-white p-4 transition-shadow hover:shadow-lg"
    >
      <h2 className="mb-2 text-lg font-bold text-blue-800">{title}</h2>
    </a>
  );
};

const AboutPage: React.FC = () => {
  const blogPosts = [
    {
      title: "Week 1",
      link: "#",
    },
    {
      title: "Week 2",
      link: "#",
    },
    {
      title: "Week 3",
      link: "#",
    },
    {
      title: "Week 4",
      link: "#",
    },
    {
      title: "Week 5",
      link: "#",
    },
    {
      title: "Week 6",
      link: "#",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Back to Home Button */}
      <div className="mb-6">
        <Link href="/">
          <Button
            size="lg"
            className="bg-orange-500 text-white hover:bg-orange-400"
          >
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Page Title */}
      <h1 className="mb-6 text-2xl font-bold">About Us / Blog</h1>

      {/* Blog Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post, index) => (
          <BlogCard key={index} title={post.title} link={post.link} />
        ))}
      </div>
    </div>
  );
};

export default AboutPage;
