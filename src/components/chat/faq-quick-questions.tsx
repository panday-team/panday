import type { FaqQuickEntry } from "./types";

interface FaqQuickQuestionsProps {
  faqEntries: FaqQuickEntry[];
  faqError: string | null;
  faqLoading: boolean;
  isLoading: boolean;
  isSignedIn: boolean | undefined;
  onFaqClick: (question: string) => void;
}

export function FaqQuickQuestions({
  faqEntries,
  faqError,
  faqLoading,
  isLoading,
  isSignedIn,
  onFaqClick,
}: FaqQuickQuestionsProps) {
  if (faqEntries.length === 0 && !faqError) {
    return null;
  }

  return (
    <>
      {faqEntries.length > 0 && (
        <div className="mb-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/70 px-1 py-1 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.07]">
            <div className="flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {faqEntries.map((faq) => (
                <button
                  key={faq.id}
                  type="button"
                  disabled={isLoading || !isSignedIn}
                  onClick={() => onFaqClick(faq.question)}
                  aria-label={`Ask: ${faq.question}`}
                  className="shrink-0 truncate rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 transition hover:-translate-y-[1px] hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                >
                  {faq.question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {faqError && !faqLoading && faqEntries.length === 0 && (
        <p className="mt-2 text-[11px] text-red-500">{faqError}</p>
      )}
    </>
  );
}
