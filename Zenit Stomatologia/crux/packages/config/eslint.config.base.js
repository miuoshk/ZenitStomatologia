import path from "node:path";
import { fileURLToPath } from "node:url";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import("eslint").Linter.Config[]} */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/.turbo/**",
      "**/podrecznik/**",
      "**/manifest/**",
      "**/design/**",
      "**/storybook-static/**",
      "packages/ui/scripts/**",
      "packages/ui/brand/manifest.json",
    ],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "*.mjs", "*.cjs"],
        },
        tsconfigRootDir: rootDir,
      },
    },
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    plugins: {
      boundaries,
      "import-x": importX,
    },
    settings: {
      "boundaries/include": ["apps/**/*", "packages/**/*", "tools/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "apps/*" },
        {
          type: "module-domain",
          pattern: "packages/modules/*/src/domain",
          capture: ["module"],
        },
        {
          type: "module-application",
          pattern: "packages/modules/*/src/application",
          capture: ["module"],
        },
        {
          type: "module-infrastructure",
          pattern: "packages/modules/*/src/infrastructure",
          capture: ["module"],
        },
        {
          type: "module-public",
          pattern: "packages/modules/*",
          capture: ["module"],
        },
        { type: "package", pattern: "packages/*", capture: ["package"] },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: [
                { to: { element: { type: "module-public" } } },
                { to: { element: { type: "package" } } },
              ],
            },
            {
              from: { element: { type: "module-domain" } },
              allow: [
                {
                  to: {
                    element: {
                      type: "module-domain",
                      captured: { module: "{{from.captured.module}}" },
                    },
                  },
                },
                { to: { element: { type: "package" } } },
              ],
            },
            {
              from: { element: { type: "module-application" } },
              allow: [
                {
                  to: {
                    element: {
                      type: "module-domain",
                      captured: { module: "{{from.captured.module}}" },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "module-application",
                      captured: { module: "{{from.captured.module}}" },
                    },
                  },
                },
                { to: { element: { type: "package" } } },
              ],
            },
            {
              from: { element: { type: "module-infrastructure" } },
              allow: [
                {
                  to: {
                    element: {
                      type: "module-domain",
                      captured: { module: "{{from.captured.module}}" },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "module-application",
                      captured: { module: "{{from.captured.module}}" },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "module-infrastructure",
                      captured: { module: "{{from.captured.module}}" },
                    },
                  },
                },
                { to: { element: { type: "package" } } },
              ],
            },
            {
              from: { element: { type: "module-public" } },
              allow: [
                {
                  to: {
                    element: {
                      type: "module-domain",
                      captured: { module: "{{from.captured.module}}" },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "module-application",
                      captured: { module: "{{from.captured.module}}" },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "module-infrastructure",
                      captured: { module: "{{from.captured.module}}" },
                    },
                  },
                },
                { to: { element: { type: "package" } } },
              ],
            },
            {
              from: { element: { type: "package" } },
              allow: [
                { to: { element: { type: "package" } } },
                { to: { element: { type: "module-public" } } },
              ],
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            "Użyj ctx.clock / @crux/shared/time — new Date() zabronione poza packages/shared/src/time.ts (ADR-022).",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/packages/modules/*/src/**", "@crux/*/src", "@crux/*/src/**"],
              message: "Importuj tylko publiczne @crux/<pakiet> (index.ts), nigdy wnętrza modułu.",
            },
          ],
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["packages/shared/src/time.ts", "packages/shared/src/time/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui/src/**/*.{ts,tsx}"],
    ignores: ["packages/ui/brand/**", "packages/ui/src/tokens.extra.css"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            "Użyj ctx.clock / @crux/shared/time — new Date() zabronione poza packages/shared/src/time.ts (ADR-022).",
        },
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Bez HEX w UI — użyj tokenów CSS (var(--zenit-*), ui.no-hex).",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Bez HEX w UI — użyj tokenów CSS (var(--zenit-*), ui.no-hex).",
        },
      ],
    },
  },
  {
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    rules: {
      // Wymiary SVG / layout — String() wszędzie byłby szumem.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    files: ["packages/ui/.storybook/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
);
