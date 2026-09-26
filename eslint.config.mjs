import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/font/google",
              importNames: ["Google_Sans_Code"],
              message:
                "Only Google_Sans is allowed. See docs/TYPOGRAPHY.md and src/lib/typography.ts.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored AI-trader Python tree (includes .venv with third-party JS)
    "services/ai-trader/**",
  ]),
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // Ported dashboards and data hooks load via effects; deferring is noisy without benefit.
      "react-hooks/set-state-in-effect": "off",
      // Marketing and desk copy use natural apostrophes in JSX prose.
      "react/no-unescaped-entities": "off",
      // TanStack Table triggers a known false positive on useReactTable().
      "react-hooks/incompatible-library": "off",
      // Logos and remote screenshots; next/image not always configured for external hosts.
      "@next/next/no-img-element": "off",
      // Chart formatters and legacy broker JSON — tighten incrementally.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
