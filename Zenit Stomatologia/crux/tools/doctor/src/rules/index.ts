import {
  analyticsMetricRegistered,
  analyticsNoPii,
} from "./analytics";
import {
  codeModuleImports,
  codeNoAny,
  codeNoAsUnknown,
  codeNoNewDate,
  codeNoSecurityDefiner,
  codeNoServiceRole,
  codeThinServerAction,
  codeUsecaseAuthorize,
  codeVocabulary,
} from "./code-static";
import {
  dbAppendOnlyGrants,
  dbPgtapRequired,
  dbRlsRequired,
  dbTableComment,
} from "./db";
import { depsDocumented } from "./deps";
import { docsRulesChecksum } from "./docs";
import { releaseNoPatientTables } from "./release";
import { specTraceability } from "./specs";
import { uiBrandSeparation, uiBrandSync, uiMetricForm, uiNoHex } from "./ui";
import type { Rule } from "../types";

export const rules: readonly Rule[] = [
  dbRlsRequired,
  dbPgtapRequired,
  dbTableComment,
  dbAppendOnlyGrants,
  codeNoAny,
  codeNoAsUnknown,
  codeNoNewDate,
  codeNoServiceRole,
  codeNoSecurityDefiner,
  codeUsecaseAuthorize,
  codeThinServerAction,
  codeModuleImports,
  codeVocabulary,
  uiNoHex,
  uiBrandSync,
  uiBrandSeparation,
  uiMetricForm,
  analyticsMetricRegistered,
  analyticsNoPii,
  depsDocumented,
  specTraceability,
  docsRulesChecksum,
  releaseNoPatientTables,
];
