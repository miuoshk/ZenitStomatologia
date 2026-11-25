/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  options: {
    doNotFollow: {
      path: "node_modules|\\.next|dist|coverage|playwright-report|test-results",
    },
    exclude: {
      path: "node_modules|\\.next|dist|coverage|playwright-report|test-results",
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Cykle między pakietami są zabronione.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: ["(^|/)index\\.ts$", "\\.(test|spec)\\.ts$", "vitest\\.config\\.ts$"],
      },
      to: {},
    },
    // Graf z docs/01 §4 — K01: platform, identity, org, scheduling, analytics, integrations
    {
      name: "scheduling-deps",
      severity: "error",
      comment: "scheduling → org (+ platform, identity, integrations).",
      from: { path: "^packages/modules/scheduling/" },
      to: {
        path: "^packages/modules/([^/]+)/",
        pathNot: "^packages/modules/(platform|identity|integrations|org)/",
      },
    },
    {
      name: "org-deps",
      severity: "error",
      comment: "org → platform, identity, integrations.",
      from: { path: "^packages/modules/org/" },
      to: {
        path: "^packages/modules/([^/]+)/",
        pathNot: "^packages/modules/(platform|identity|integrations)/",
      },
    },
    {
      name: "identity-deps",
      severity: "error",
      from: { path: "^packages/modules/identity/" },
      to: {
        path: "^packages/modules/([^/]+)/",
        pathNot: "^packages/modules/(platform|integrations)/",
      },
    },
    {
      name: "platform-deps",
      severity: "error",
      from: { path: "^packages/modules/platform/" },
      to: {
        path: "^packages/modules/([^/]+)/",
        pathNot: "^packages/modules/integrations/",
      },
    },
    {
      name: "analytics-deps",
      severity: "error",
      comment: "analytics czyta przez widoki; zależy tylko od platform/identity/integrations.",
      from: { path: "^packages/modules/analytics/" },
      to: {
        path: "^packages/modules/([^/]+)/",
        pathNot: "^packages/modules/(platform|identity|integrations)/",
      },
    },
    {
      name: "integrations-no-domain",
      severity: "error",
      comment: "integrations nie zależy od modułów domenowych.",
      from: { path: "^packages/modules/integrations/" },
      to: { path: "^packages/modules/(platform|identity|org|scheduling|analytics)/" },
    },
    {
      name: "no-depend-on-analytics",
      severity: "error",
      comment: "Inne moduły nie zależą od analytics.",
      from: { path: "^packages/modules/(platform|identity|org|scheduling|integrations)/" },
      to: { path: "^packages/modules/analytics/" },
    },
    {
      name: "no-deep-module-imports",
      severity: "error",
      from: {},
      to: { path: "packages/modules/[^/]+/src/" },
    },
  ],
};
