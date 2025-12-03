/**
 * Verified URL Registry for BC Trades Resources
 *
 * This module provides URL validation and correction for common BC trades websites.
 * The AI sometimes generates incorrect URLs - this system catches common mistakes
 * and corrects them to valid URLs.
 */

/**
 * Known valid base URLs for BC trades resources
 */
export const VERIFIED_DOMAINS = {
  skilledtradesbc: "https://skilledtradesbc.ca",
  redSeal: "https://www.red-seal.ca",
  workbc: "https://www.workbc.ca",
  bcit: "https://www.bcit.ca",
  ejtc: "https://www.ejtc.org",
  canada: "https://www.canada.ca",
  worksafebc: "https://www.worksafebc.com",
  studentaidbc: "https://studentaidbc.ca",
  tradestrainingbc: "https://www.tradestrainingbc.ca",
} as const;

/**
 * Common URL patterns and their corrections
 * Maps incorrectly generated URLs to valid URLs
 *
 * Last verified: December 2024
 */
const URL_CORRECTIONS: Record<string, string> = {
  // SkilledTradesBC corrections - trade pages
  "skilledtradesbc.ca/trade/construction-electrician":
    "skilledtradesbc.ca/electrician-construction",
  "skilledtradesbc.ca/trades/electrician":
    "skilledtradesbc.ca/electrician-construction",
  "skilledtradesbc.ca/trades/construction-electrician":
    "skilledtradesbc.ca/electrician-construction",
  "skilledtradesbc.ca/find-training-program":
    "skilledtradesbc.ca/find-your-trade",
  "skilledtradesbc.ca/find-training":
    "skilledtradesbc.ca/all-approved-training-providers-list",
  "skilledtradesbc.ca/training-providers":
    "skilledtradesbc.ca/all-approved-training-providers-list",

  // SkilledTradesBC corrections - old /become-an-apprentice/* paths now at root
  "skilledtradesbc.ca/become-an-apprentice/foundation-programs":
    "skilledtradesbc.ca/foundation-programs",
  "skilledtradesbc.ca/become-an-apprentice/start-an-apprenticeship":
    "skilledtradesbc.ca/start-an-apprenticeship",
  "skilledtradesbc.ca/become-an-apprentice/youth-programs":
    "skilledtradesbc.ca/youth",
  "skilledtradesbc.ca/become-an-apprentice/financial-support":
    "skilledtradesbc.ca/financial-support",
  "skilledtradesbc.ca/apprentice": "skilledtradesbc.ca/become-an-apprentice",
  "skilledtradesbc.ca/apprenticeship":
    "skilledtradesbc.ca/become-an-apprentice",

  // SkilledTradesBC corrections - old /get-certified/* paths
  "skilledtradesbc.ca/get-certified/about-exams/exam-schedule":
    "skilledtradesbc.ca/exam-schedule",
  "skilledtradesbc.ca/get-certified/about-exams/exam-study-support":
    "skilledtradesbc.ca/get-certified-about-exams/exam-study-support",
  "skilledtradesbc.ca/get-certified/challenge-a-skilled-trade":
    "skilledtradesbc.ca/challenge-skilled-trade",
  "skilledtradesbc.ca/exam-info":
    "skilledtradesbc.ca/get-certified/about-exams",
  "skilledtradesbc.ca/exams": "skilledtradesbc.ca/get-certified/about-exams",

  // SkilledTradesBC corrections - common AI mistakes
  "skilledtradesbc.ca/foundation": "skilledtradesbc.ca/foundation-programs",
  "skilledtradesbc.ca/youth-programs": "skilledtradesbc.ca/youth",
  "skilledtradesbc.ca/financial-aid": "skilledtradesbc.ca/financial-support",
  "skilledtradesbc.ca/grants": "skilledtradesbc.ca/financial-support",
  "skilledtradesbc.ca/red-seal": "skilledtradesbc.ca/get-certified",
  "skilledtradesbc.ca/certification": "skilledtradesbc.ca/get-certified",
  "skilledtradesbc.ca/challenge-exam":
    "skilledtradesbc.ca/challenge-skilled-trade",

  // Red Seal corrections - common patterns
  "red-seal.ca/eng/trades/electric": "red-seal.ca/trades/elec-eng.html",
  "red-seal.ca/eng/trades/electrician": "red-seal.ca/trades/elec-eng.html",
  "red-seal.ca/trades/electrician": "red-seal.ca/trades/elec-eng.html",
  "red-seal.ca/trades/construction-electrician":
    "red-seal.ca/trades/elec-eng.html",

  // WorkBC corrections
  "workbc.ca/jobs": "workbc.ca/jobs-careers",
  "workbc.ca/career-explorer": "workbc.ca/jobs-careers/explore-careers",
  "workbc.ca/trades": "workbc.ca/jobs-careers/explore-careers",
};

/**
 * Regex patterns for URL path corrections
 * These handle dynamic segments like years in URLs
 */
const URL_PATTERN_CORRECTIONS: Array<{
  pattern: RegExp;
  replacement: string;
}> = [
  // Red Seal year-based URLs that don't exist
  {
    pattern: /red-seal\.ca\/eng\/trades\/electric\/\d{4}rs\.\d+\.\d+\.shtml/,
    replacement: "red-seal.ca/trades/elec-eng.html",
  },
  // SkilledTradesBC trade pages with /trade/ prefix
  {
    pattern: /skilledtradesbc\.ca\/trade\/([a-z-]+)/,
    replacement: "skilledtradesbc.ca/$1",
  },
];

/**
 * Normalize a URL to a consistent format for comparison
 */
function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove www. prefix, trailing slashes, and convert to lowercase
    return (parsed.host.replace(/^www\./, "") + parsed.pathname)
      .toLowerCase()
      .replace(/\/$/, "");
  } catch {
    // If it's not a valid URL, just normalize the string
    return url
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?/, "")
      .replace(/\/$/, "");
  }
}

/**
 * Attempt to correct a potentially invalid URL
 * Returns the corrected URL if a correction is found, otherwise returns the original
 */
export function correctUrl(url: string): string {
  if (!url || typeof url !== "string") {
    return url;
  }

  // Ensure URL has protocol
  let normalizedUrl = url;
  if (!/^https?:\/\//i.exec(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    // Validate URL can be parsed
    new URL(normalizedUrl);
    const urlPath = normalizeUrlForComparison(normalizedUrl);

    // Check direct corrections first
    for (const [incorrect, correct] of Object.entries(URL_CORRECTIONS)) {
      if (
        urlPath === incorrect.toLowerCase() ||
        urlPath.includes(incorrect.toLowerCase())
      ) {
        return `https://${correct}`;
      }
    }

    // Check regex pattern corrections
    for (const { pattern, replacement } of URL_PATTERN_CORRECTIONS) {
      if (pattern.test(normalizedUrl)) {
        return `https://${replacement}`;
      }
    }

    // Return the normalized URL (with protocol)
    return normalizedUrl;
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Validate and optionally correct URLs in resource arrays
 * Returns resources with corrected URLs
 */
export function validateAndCorrectResources(
  resources: Array<{ label: string; href: string }> | null | undefined,
): Array<{ label: string; href: string }> | null {
  if (!resources || !Array.isArray(resources)) {
    return null;
  }

  return resources.map((resource) => ({
    label: resource.label,
    href: correctUrl(resource.href),
  }));
}

/**
 * Check if a URL belongs to a known trusted domain
 */
export function isTrustedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.host.replace(/^www\./, "").toLowerCase();

    const trustedDomains = [
      "skilledtradesbc.ca",
      "red-seal.ca",
      "workbc.ca",
      "bcit.ca",
      "ejtc.org",
      "canada.ca",
      "worksafebc.com",
      "studentaidbc.ca",
      "tradestrainingbc.ca",
      "camosun.ca",
      "viu.ca",
      "tru.ca",
      "gov.bc.ca",
      "bc.ca",
      "cnc.bc.ca",
      "bccwitt.ca",
      "ibew213.org",
      "ecabc.org",
      "bcea.bc.ca",
      "bccassn.com",
    ];

    return trustedDomains.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

/**
 * Known valid URLs for common BC trades resources
 * These are confirmed working URLs that the AI can reference
 *
 * Last verified: December 2024
 * Note: SkilledTradesBC restructured their site - pages moved from /become-an-apprentice/* to root level
 */
export const VERIFIED_URLS = {
  // SkilledTradesBC
  skilledtradesbc: {
    home: "https://skilledtradesbc.ca",
    electrician: "https://skilledtradesbc.ca/electrician-construction",
    findYourTrade: "https://skilledtradesbc.ca/find-your-trade",
    becomeApprentice: "https://skilledtradesbc.ca/become-an-apprentice",
    startApprenticeship: "https://skilledtradesbc.ca/start-an-apprenticeship",
    foundationPrograms: "https://skilledtradesbc.ca/foundation-programs",
    youthPrograms: "https://skilledtradesbc.ca/youth",
    financialSupport: "https://skilledtradesbc.ca/financial-support",
    getCertified: "https://skilledtradesbc.ca/get-certified",
    aboutExams: "https://skilledtradesbc.ca/get-certified/about-exams",
    examSchedule: "https://skilledtradesbc.ca/exam-schedule",
    examStudySupport:
      "https://skilledtradesbc.ca/get-certified-about-exams/exam-study-support",
    challengeTrade: "https://skilledtradesbc.ca/challenge-skilled-trade",
    sponsorEmployers: "https://skilledtradesbc.ca/sponsor-employers",
    trainingProviders:
      "https://skilledtradesbc.ca/all-approved-training-providers-list",
    portal: "https://portal.skilledtradesbc.ca",
  },
  // Red Seal
  redSeal: {
    home: "https://www.red-seal.ca",
    electrician: "https://www.red-seal.ca/trades/elec-eng.html",
    selfAssessment:
      "https://www.red-seal.ca/resources/self-assessment-eng.html",
  },
  // WorkBC
  workbc: {
    home: "https://www.workbc.ca",
    exploreCareers: "https://www.workbc.ca/jobs-careers/explore-careers",
    electrician:
      "https://www.workbc.ca/jobs-careers/explore-careers/browse-career-profile/7241",
    resumeBuilder: "https://www.workbc.ca/Jobs-Careers/Build-Your-Resume.aspx",
  },
  // Training Institutions
  training: {
    bcit: "https://www.bcit.ca/programs/electrical-foundation-certificate-full-time-1780cert/",
    bcitApprenticeship:
      "https://www.bcit.ca/programs/electrical-apprenticeship-full-time-3440appr/",
    camosun:
      "https://camosun.ca/programs-courses/find-program/electrical-foundation-certificate",
    viu: "https://www.viu.ca/programs/trades-applied-technology/electrician",
    tru: "https://www.tru.ca/trades/trades-programs/electrician-construction.html",
    tradestrainingbc: "https://www.tradestrainingbc.ca",
    ejtc: "https://www.ejtc.org",
  },
  // Financial Support
  financial: {
    studentaidbc: "https://studentaidbc.ca/",
    apprenticeLoan:
      "https://www.canada.ca/en/employment-social-development/services/student-financial-aid/apprentice-loan.html",
    apprenticeGrants:
      "https://www.canada.ca/en/employment-social-development/services/apprentices/grants.html",
    eiApprentices: "https://www.canada.ca/en/services/benefits/ei.html",
    bcTrainingTaxCredit:
      "https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal/credits/training-tax-credit",
  },
  // Organizations
  organizations: {
    ibew213: "https://www.ibew213.org",
    bccwitt: "https://bccwitt.ca",
    ecabc: "https://www.ecabc.org",
    bccassn: "https://www.bccassn.com/",
    worksafebc: "https://www.worksafebc.com/",
  },
} as const;
