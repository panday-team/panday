import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import type { FaqQuickEntry } from "@/components/chat/types";

interface UseFaqQuickQuestionsProps {
  isExpanded: boolean;
}

interface UseFaqQuickQuestionsReturn {
  faqEntries: FaqQuickEntry[];
  faqLoading: boolean;
  faqError: string | null;
  hasLoadedFaqs: boolean;
}

/**
 * Type guard to check if a value is a record object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Custom hook for loading FAQ quick questions from the API.
 * Fetches top 10 global FAQs (sorted by frequency) for quick access in chat widget.
 */
export function useFaqQuickQuestions({
  isExpanded,
}: UseFaqQuickQuestionsProps): UseFaqQuickQuestionsReturn {
  const [faqEntries, setFaqEntries] = useState<FaqQuickEntry[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [hasLoadedFaqs, setHasLoadedFaqs] = useState(false);

  useEffect(() => {
    if (!isExpanded || hasLoadedFaqs) return;

    const loadFaqs = async () => {
      setFaqLoading(true);
      setFaqError(null);

      try {
        // First try global FAQs (platform-wide highlights)
        const globalResponse = await fetch("/api/faq?global=true", {
          cache: "no-store",
        });

        if (!globalResponse.ok) {
          throw new Error("Failed to load FAQs");
        }

        const globalJson: unknown = await globalResponse.json();
        if (!Array.isArray(globalJson)) {
          throw new Error("FAQ response is not an array");
        }

        let entries = globalJson
          .map((value): FaqQuickEntry | null => {
            if (!isRecord(value)) return null;
            const { id, question, frequency } = value;
            if (typeof id !== "string" || typeof question !== "string") {
              return null;
            }
            return {
              id,
              question,
              frequency: typeof frequency === "number" ? frequency : 1,
            };
          })
          .filter((entry): entry is FaqQuickEntry => entry !== null);

        // If no global FAQs are flagged yet, fall back to category entries
        if (entries.length === 0) {
          const categoriesResponse = await fetch("/api/faq", {
            cache: "no-store",
          });

          if (!categoriesResponse.ok) {
            throw new Error("Failed to load category FAQs");
          }

          const categoriesJson: unknown = await categoriesResponse.json();
          if (!Array.isArray(categoriesJson)) {
            throw new Error("FAQ categories response is not an array");
          }

          const fromCategories: FaqQuickEntry[] = [];

          for (const category of categoriesJson) {
            if (!isRecord(category)) continue;
            const { faqEntries } = category;
            if (!Array.isArray(faqEntries)) continue;

            for (const value of faqEntries) {
              if (!isRecord(value)) continue;
              const { id, question, frequency } = value;
              if (typeof id !== "string" || typeof question !== "string") {
                continue;
              }
              fromCategories.push({
                id,
                question,
                frequency: typeof frequency === "number" ? frequency : 1,
              });
            }
          }

          entries = fromCategories;
        }

        const topEntries = entries
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 10);

        setFaqEntries(topEntries);
      } catch (err) {
        setFaqError(err instanceof Error ? err.message : "Failed to load FAQs");
        logger.error(
          "Failed to load FAQ quick questions",
          err instanceof Error ? err : new Error("Failed to load FAQs"),
        );
      } finally {
        setFaqLoading(false);
        setHasLoadedFaqs(true);
      }
    };

    void loadFaqs();
  }, [hasLoadedFaqs, isExpanded]);

  return {
    faqEntries,
    faqLoading,
    faqError,
    hasLoadedFaqs,
  };
}
