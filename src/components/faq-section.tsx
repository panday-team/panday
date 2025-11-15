"use client";

import { useEffect, useState } from "react";

type FAQEntry = {
  id: string;
  question: string;
  answer: string;
  variations: string[];
  frequency: number;
};

type FAQCategory = {
  id: string;
  name: string;
  description?: string | null;
  faqEntries: FAQEntry[];
};

export function FAQSection() {
  const [globalFaqs, setGlobalFaqs] = useState<FAQEntry[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const globalRes = await fetch("/api/faq?global=true");
        const categoriesRes = await fetch("/api/faq");

        if (!globalRes.ok || !categoriesRes.ok) {
          throw new Error("Failed to load FAQ data");
        }

        const globalJson: unknown = await globalRes.json();
        const categoriesJson: unknown = await categoriesRes.json();

        const parsedGlobals = parseFaqEntryArray(globalJson);
        const parsedCategories = parseFaqCategoryArray(categoriesJson);

        setGlobalFaqs(parsedGlobals);
        setCategories(parsedCategories);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load FAQs");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-center text-sm text-muted-foreground">Loading FAQs…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-center text-sm text-red-500">{error}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 space-y-10">
      <header className="space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-400">
          Need quick answers?
        </p>
        <h1 className="text-4xl font-semibold text-white">
          Frequently Asked Questions
        </h1>
        <p className="text-base text-white/70">
          Top questions surfaced from real chat sessions with the Panday assistant.
        </p>
      </header>

      {globalFaqs.length > 0 && (
        <div className="space-y-4 rounded-2xl bg-white/5 p-6 shadow-lg ring-1 ring-white/10">
          <h2 className="text-lg font-semibold text-white">
            Platform-wide highlights
          </h2>
          <div className="divide-y divide-white/10">
            {globalFaqs.map((faq) => (
              <details key={faq.id} className="group py-4">
                <summary className="flex cursor-pointer items-center justify-between text-white">
                  <span className="text-left text-base font-medium">
                    {faq.question}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                    {faq.frequency}× asked
                  </span>
                </summary>
                <div className="mt-3 space-y-3 text-sm text-white/80">
                  <p>{faq.answer}</p>
                  {faq.variations.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                      <p className="mb-2 font-semibold text-white">Similar asks</p>
                      <ul className="list-disc space-y-1 pl-4">
                        {faq.variations.map((variation) => (
                          <li key={variation}>{variation}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {categories.map((category) => (
          <div
            key={category.id}
            className="space-y-4 rounded-2xl bg-white/5 p-6 shadow-lg ring-1 ring-white/10"
          >
            <div>
              <h3 className="text-xl font-semibold text-white">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-white/70">{category.description}</p>
              )}
            </div>
            {category.faqEntries.length === 0 ? (
              <p className="text-sm text-white/60">No questions yet.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {category.faqEntries.map((faq) => (
                  <details key={faq.id} className="group py-4">
                    <summary className="cursor-pointer text-base font-medium text-white">
                      {faq.question}
                    </summary>
                    <div className="mt-3 space-y-3 text-sm text-white/80">
                      <p>{faq.answer}</p>
                      {faq.variations.length > 0 && (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                          <p className="mb-2 font-semibold text-white">Also phrased as</p>
                          <ul className="list-disc space-y-1 pl-4">
                            {faq.variations.map((variation) => (
                              <li key={variation}>{variation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function parseFaqEntryArray(value: unknown): FAQEntry[] {
  if (!Array.isArray(value)) {
    throw new Error("FAQ response is not an array");
  }

  const entries = value
    .map((entry) => parseFaqEntry(entry))
    .filter((entry): entry is FAQEntry => entry !== null);

  if (entries.length === 0 && value.length > 0) {
    throw new Error("FAQ entries are malformed");
  }

  return entries;
}

function parseFaqCategoryArray(value: unknown): FAQCategory[] {
  if (!Array.isArray(value)) {
    throw new Error("FAQ categories response is not an array");
  }

  const categories = value
    .map((entry) => parseFaqCategory(entry))
    .filter((entry): entry is FAQCategory => entry !== null);

  if (categories.length === 0 && value.length > 0) {
    throw new Error("FAQ categories are malformed");
  }

  return categories;
}

function parseFaqEntry(value: unknown): FAQEntry | null {
  if (!isRecord(value)) return null;

  const { id, question, answer, frequency, variations } = value;
  if (
    typeof id !== "string" ||
    typeof question !== "string" ||
    typeof answer !== "string"
  ) {
    return null;
  }

  const parsedVariations = Array.isArray(variations)
    ? variations.filter((item): item is string => typeof item === "string")
    : [];

  return {
    id,
    question,
    answer,
    frequency: typeof frequency === "number" ? frequency : 1,
    variations: parsedVariations,
  };
}

function parseFaqCategory(value: unknown): FAQCategory | null {
  if (!isRecord(value)) return null;

  const { id, name, description, faqEntries } = value;
  if (typeof id !== "string" || typeof name !== "string") {
    return null;
  }

  const parsedEntries = Array.isArray(faqEntries)
    ? faqEntries
        .map((entry) => parseFaqEntry(entry))
        .filter((entry): entry is FAQEntry => entry !== null)
    : [];

  return {
    id,
    name,
    description: typeof description === "string" ? description : null,
    faqEntries: parsedEntries,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
