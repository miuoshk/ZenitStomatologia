import { sentryBaseOptions } from "@crux/shared/sentry-before-send";
import * as Sentry from "@sentry/nextjs";

/** Sentry w runtime edge (bez PII; pusty DSN → no-op). */
const base = sentryBaseOptions(process.env);
Sentry.init({ ...base, enabled: base.dsn !== undefined });
