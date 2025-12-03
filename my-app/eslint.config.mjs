import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // TypeScript - Allow any type usage
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      
      // TypeScript - Allow unused vars (common during development)
      "@typescript-eslint/no-unused-vars": "off",
      
      // TypeScript - Allow ts-ignore comments
      "@typescript-eslint/ban-ts-comment": "off",
      
      // TypeScript - Allow empty functions
      "@typescript-eslint/no-empty-function": "off",
      
      // TypeScript - Allow non-null assertions
      "@typescript-eslint/no-non-null-assertion": "off",
      
      // React/Next.js - Allow unescaped entities
      "react/no-unescaped-entities": "off",
      
      // Next.js - Allow <img> instead of requiring Next Image
      "@next/next/no-img-element": "off",
      
      // General - Allow console statements
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
