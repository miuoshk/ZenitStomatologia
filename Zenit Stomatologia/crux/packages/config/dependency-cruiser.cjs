/** @type {import("dependency-cruiser").IConfiguration} */
/**
 * Graf z docs/01 §4 — wszystkie moduły (także przyszłe).
 * Strzałka w docs = „może zależeć od”; tu egzekwujemy pathNot.
 */
module.exports = {
  options: {
    doNotFollow: {
      path: "node_modules|\\.next|dist|coverage|playwright-report|test-results|storybook-static",
    },
    exclude: {
      path: "node_modules|\\.next|dist|coverage|playwright-report|test-results|storybook-static",
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
        pathNot: ["(^|/)index\\.ts$", "\\.(test|spec)\\.ts$", "vitest\\.config\\.ts$", "cli\\.ts$"],
      },
      to: {},
    },
    {
      name: "no-deep-module-imports",
      severity: "error",
      comment:
        "Z zewnątrz tylko @crux/<mod> → src/index.ts; nie sięgaj w domain/application/infrastructure.",
      from: {
        // wewnątrz modułu wolno importować sąsiadów; reguła dotyczy importerów z zewnątrz
        pathNot: "^packages/modules/[^/]+/src/",
      },
      to: {
        path: "^packages/modules/[^/]+/src/(?!index\\.ts$)",
      },
    },
    {
      name: "integrations-no-domain",
      severity: "error",
      comment: "integrations nie zależy od modułów domenowych.",
      from: { path: "^packages/modules/integrations/" },
      to: {
        path: "^packages/modules/(platform|identity|org|scheduling|analytics|patients|messaging|catalog|planning|billing|lab|crm|clinical|interop|imaging|ai)/",
      },
    },
    {
      name: "no-depend-on-analytics",
      severity: "error",
      comment: "Inne moduły nie zależą od analytics (odczyt przez widoki).",
      from: {
        path: "^packages/modules/(?!analytics)([^/]+)/",
      },
      to: { path: "^packages/modules/analytics/" },
    },
    // platform → tylko integrations
    moduleDeps("platform", ["integrations"]),
    // identity → platform, integrations
    moduleDeps("identity", ["platform", "integrations"]),
    // org → platform, identity, integrations
    moduleDeps("org", ["platform", "identity", "integrations"]),
    // patients → platform, identity, org, integrations
    moduleDeps("patients", ["platform", "identity", "org", "integrations"]),
    // catalog → org (+ shared stack)
    moduleDeps("catalog", ["platform", "identity", "org", "integrations"]),
    // scheduling → patients, org, catalog (+ stack)
    moduleDeps("scheduling", [
      "platform",
      "identity",
      "org",
      "patients",
      "catalog",
      "integrations",
    ]),
    // messaging → patients, scheduling
    moduleDeps("messaging", [
      "platform",
      "identity",
      "org",
      "patients",
      "scheduling",
      "integrations",
    ]),
    // planning → catalog, patients
    moduleDeps("planning", [
      "platform",
      "identity",
      "org",
      "patients",
      "catalog",
      "integrations",
    ]),
    // billing → planning, scheduling, catalog, patients
    moduleDeps("billing", [
      "platform",
      "identity",
      "org",
      "patients",
      "catalog",
      "scheduling",
      "planning",
      "integrations",
    ]),
    // lab → patients, scheduling
    moduleDeps("lab", [
      "platform",
      "identity",
      "org",
      "patients",
      "scheduling",
      "integrations",
    ]),
    // crm → patients, scheduling, messaging, catalog
    moduleDeps("crm", [
      "platform",
      "identity",
      "org",
      "patients",
      "scheduling",
      "messaging",
      "catalog",
      "integrations",
    ]),
    // clinical → patients, scheduling, catalog
    moduleDeps("clinical", [
      "platform",
      "identity",
      "org",
      "patients",
      "scheduling",
      "catalog",
      "integrations",
    ]),
    // imaging → patients, clinical
    moduleDeps("imaging", [
      "platform",
      "identity",
      "org",
      "patients",
      "clinical",
      "integrations",
    ]),
    // interop → clinical, patients, org
    moduleDeps("interop", [
      "platform",
      "identity",
      "org",
      "patients",
      "clinical",
      "integrations",
    ]),
    // ai → clinical, messaging
    moduleDeps("ai", [
      "platform",
      "identity",
      "org",
      "clinical",
      "messaging",
      "integrations",
    ]),
    // analytics → platform, identity, integrations (tylko odczyt widoków)
    moduleDeps("analytics", ["platform", "identity", "integrations"]),
  ],
};

/**
 * @param {string} mod
 * @param {string[]} allowed
 */
function moduleDeps(mod, allowed) {
  const allow = allowed.join("|");
  return {
    name: `${mod}-deps`,
    severity: "error",
    comment: `${mod} → ${allowed.join(", ")} (docs/01 §4).`,
    from: { path: `^packages/modules/${mod}/` },
    to: {
      path: "^packages/modules/([^/]+)/",
      pathNot: `^packages/modules/(${allow}|${mod})/`,
    },
  };
}
