import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    ignores: [
      ".next",
      "next-env.d.ts",
      "scripts/embeddings/venv/**",
      "services/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["**/__tests__/**/*.ts", "**/*.test.ts"],
    rules: {
      // ⚠️ RELAXED TYPE SAFETY FOR TEST FILES ⚠️
      // These rules are disabled for test files to reduce friction with mocking libraries.
      // However, this weakens type safety in tests and should be addressed in future:
      //
      // - unbound-method: Vitest's vi.fn() creates unbound methods
      // - no-unsafe-*: Mock return values are often typed as 'any' (e.g., Clerk's auth mock)
      // - no-explicit-any: Used for quick mock typing (e.g., `as any` assertions)
      //
      // TODO: Create proper TypeScript utility types for common mocks:
      //   - ClerkAuthMock type for auth() mocks
      //   - PrismaClientMock type for database mocks
      //   - Replace `as any` with proper type assertions
      //
      // See: https://vitest.dev/guide/mocking.html for better typing patterns
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/api/**/*.ts", "**/roadmap/page.tsx"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  },
);
