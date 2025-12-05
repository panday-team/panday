"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import {
  Code,
  Palette,
  ArrowRight,
  Mail,
  Linkedin,
  Github,
  Instagram,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface TeamMember {
  name: string;
  role: string;
  image: string;
  linkedin?: string;
  email?: string;
  github?: string;
}

const developers: TeamMember[] = [
  {
    name: "Nikita",
    role: "Full Stack Developer",
    image: "/Nikita.png",
    linkedin: "https://www.linkedin.com/in/nikitalobanov",
    email: "nlobanov@my.bcit.ca",
    github: "https://github.com/nikitalobanov12",
  },
  {
    name: "Ozem",
    role: "Full Stack Developer",
    image: "/Ozem.png",
    linkedin: "https://www.linkedin.com/in/naldaguilar/",
    email: "naguilar2@my.bcit.ca",
    github: "https://github.com/aguilarxnldoz",
  },
  {
    name: "Josh",
    role: "Full Stack Developer",
    image: "/Josh.png",
    linkedin: "https://www.linkedin.com/in/joshua-fajardo/",
    email: "jfajardo7@my.bcit.ca",
    github: "https://github.com/Dove167",
  },
  {
    name: "Peter",
    role: "Full Stack Developer",
    image: "/Peter.png",
    linkedin: "https://www.linkedin.com/in/peter-guanghuichen/",
    email: "gchen110@my.bcit.ca",
    github: "https://github.com/cghuisunshine",
  },
  {
    name: "Manraj",
    role: "Full Stack Developer",
    image: "/Manny.png",
    email: "mbains67@my.bcit.ca",
    github: "https://github.com/Manraj-Bains",
  },
];

const designers: TeamMember[] = [
  {
    name: "Bruno",
    role: "UI/UX Designer",
    image: "/Bruno.png",
    linkedin: "https://www.linkedin.com/in/brunoamorimdossantos/",
    email: "bamorimdossantos@my.bcit.ca",
  },
  {
    name: "Darrel",
    role: "UI/UX Designer",
    image: "/Darrel.png",
    email: "dsoriano5@my.bcit.ca",
    linkedin: "https://linkedin.com/in/darrelsoriano",
  },
  {
    name: "Reagan",
    role: "UI/UX Designer",
    image: "/Reagan.png",
    linkedin: "https://www.linkedin.com/in/reaganlung/",
    email: "llung1@my.bcit.ca",
  },
];

function TeamMemberCard({
  member,
  accentColor,
}: {
  member: TeamMember;
  accentColor: string;
}) {
  return (
    <div className="mx-auto w-[540px] max-w-full rounded-2xl border border-white/10 bg-[#0B101D] p-6 md:p-10">
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
        {/* Image - Left Side */}
        <div
          className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-full md:h-48 md:w-48"
          style={{ backgroundColor: accentColor }}
        >
          <Image
            src={member.image}
            alt={member.name}
            fill
            className="scale-[1.25] object-cover"
            style={{
              objectPosition: "calc(50% - 4px) calc(50% + 6px)",
            }}
          />
        </div>

        {/* Content - Right Side */}
        <div className="text-center md:text-left">
          {/* Name & Role */}
          <div className="mb-6">
            <h3 className="font-inria-sans mb-2 text-3xl font-bold text-white md:text-4xl">
              {member.name}
            </h3>
            <p className="font-inria-sans text-lg text-white/60 md:text-xl">
              {member.role}
            </p>
          </div>

          {/* Contact Links */}
          <div className="flex items-center justify-center gap-4 md:justify-start">
            {member.linkedin && (
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                aria-label={`${member.name}'s LinkedIn`}
              >
                <Linkedin className="h-5 w-5" />
              </a>
            )}
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                aria-label={`Email ${member.name}`}
              >
                <Mail className="h-5 w-5" />
              </a>
            )}
            {member.github && (
              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                aria-label={`${member.name}'s GitHub`}
              >
                <Github className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamCarousel({
  members,
  title,
  icon: Icon,
  accentColor,
}: {
  members: TeamMember[];
  title: string;
  icon: typeof Code;
  accentColor: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const changeSlide = (newIndex: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 150);
  };

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? members.length - 1 : currentIndex - 1;
    changeSlide(newIndex);
  };

  const goToNext = () => {
    const newIndex = currentIndex === members.length - 1 ? 0 : currentIndex + 1;
    changeSlide(newIndex);
  };

  return (
    <div className="mb-16 last:mb-0">
      {/* Section Header */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg"
          style={{ backgroundColor: accentColor }}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-inria-sans text-2xl font-bold text-white md:text-3xl">
          {title}
        </h3>
      </div>

      {/* Carousel */}
      <div className="relative mx-auto max-w-4xl">
        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute top-1/2 left-0 z-10 flex h-12 w-12 -translate-x-2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:-translate-x-16"
          aria-label="Previous team member"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={goToNext}
          className="absolute top-1/2 right-0 z-10 flex h-12 w-12 translate-x-2 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 md:translate-x-16"
          aria-label="Next team member"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Card with transition */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            isTransitioning ? "scale-95 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <TeamMemberCard
            member={members[currentIndex]!}
            accentColor={accentColor}
          />
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {members.map((_, index) => (
          <button
            key={index}
            onClick={() => changeSlide(index)}
            className="h-3 w-3 rounded-full transition"
            style={{
              backgroundColor:
                index === currentIndex ? accentColor : "rgba(255,255,255,0.2)",
            }}
            aria-label={`Go to team member ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#1D2740]">
      <LandingHeader />

      {/* Hero Section */}
      <section className="border-b-4 border-white bg-[#0B101D] pt-24 pb-16 md:border-b-6 md:pt-32 md:pb-20">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-inria-sans mb-6 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              Meet the <span className="text-[#FF8F27]">Team</span>
            </h1>
            <p className="font-inria-sans mx-auto max-w-3xl text-lg leading-relaxed text-white/80 md:text-xl">
              We&apos;re a team of developers and designers passionate about
              making skilled trades careers more accessible. Together,
              we&apos;re building tools to help workers navigate their path to
              Red Seal certification.
            </p>
          </div>
        </div>
      </section>

      {/* Team Carousels Section */}
      <section className="border-b-4 border-white bg-[#1D2740] py-16 md:border-b-6 md:py-20">
        <div className="container mx-auto px-4 md:px-8">
          <TeamCarousel
            members={developers}
            title="Development"
            icon={Code}
            accentColor="#35C1B9"
          />
          <TeamCarousel
            members={designers}
            title="Design"
            icon={Palette}
            accentColor="#FF8F27"
          />
        </div>
      </section>

      {/* Mission CTA Section */}
      <section className="border-b-4 border-white bg-[#0B101D] py-16 md:border-b-6 md:py-20">
        <div className="container mx-auto px-4 text-center md:px-8">
          <h2 className="font-inria-sans mb-4 text-3xl font-bold text-white md:text-4xl">
            Our Mission
          </h2>
          <p className="font-inria-sans mx-auto mb-8 max-w-xl text-white/70">
            Learn about the problem we&apos;re solving and our vision for the
            future of skilled trades in BC.
          </p>
          <Link
            href="/mission"
            className="font-inria-sans inline-flex items-center gap-2 rounded-lg bg-[#FF8F27] px-6 py-3 font-medium text-white transition hover:bg-[#FF8F27]/90"
          >
            Read Our Mission
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Blog CTA Section */}
      <section className="bg-[#1D2740] py-16 md:py-20">
        <div className="container mx-auto px-4 text-center md:px-8">
          <h2 className="font-inria-sans mb-4 text-3xl font-bold text-white md:text-4xl">
            Follow Our Journey
          </h2>
          <p className="font-inria-sans mx-auto mb-8 max-w-xl text-white/70">
            Read our weekly development blog to see how Panday evolved from
            concept to launch over 13 weeks.
          </p>
          <Link
            href="/blog"
            className="font-inria-sans inline-flex items-center gap-2 rounded-lg bg-[#FF8F27] px-6 py-3 font-medium text-white transition hover:bg-[#FF8F27]/90"
          >
            Read the Blog
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="border-t-4 border-white bg-[#0B101D] py-16 md:border-t-6 md:py-20">
        <div className="container mx-auto px-4 text-center md:px-8">
          <h2 className="font-inria-sans mb-6 text-3xl font-bold text-white md:text-4xl">
            Get in Touch
          </h2>
          <p className="font-inria-sans mx-auto mb-8 max-w-xl text-white/70">
            Have questions or want to learn more about Panday? We&apos;d love to
            hear from you.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:hello@panday.app"
              className="font-inria-sans inline-flex items-center gap-2 rounded-lg bg-[#FF8F27] px-6 py-3 font-medium text-white transition hover:bg-[#FF8F27]/90"
            >
              <Mail className="h-5 w-5" />
              hello@panday.app
            </a>
            <a
              href="https://www.instagram.com/panday_project"
              target="_blank"
              rel="noopener noreferrer"
              className="font-inria-sans inline-flex items-center gap-2 rounded-lg border-2 border-white/20 px-6 py-3 font-medium text-white transition hover:border-white/40 hover:bg-white/5"
            >
              <Instagram className="h-5 w-5" />
              @panday_project
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
