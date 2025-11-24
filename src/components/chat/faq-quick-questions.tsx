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
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-gray-400 uppercase dark:text-white/40">
            Popular questions
          </p>
          <div className="flex flex-wrap gap-2">
            {faqEntries.map((faq) => (
              <button
                key={faq.id}
                type="button"
                disabled={isLoading || !isSignedIn}
                onClick={() => onFaqClick(faq.question)}
                className="max-w-full truncate rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
              >
                {faq.question}
              </button>
            ))}
          </div>
        </div>
      )}
      {faqError && !faqLoading && faqEntries.length === 0 && (
        <p className="mt-2 text-[11px] text-red-500">{faqError}</p>
      )}
    </>
  );
}
