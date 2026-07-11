import { z } from "zod";

const localizedTextSchema = z.object({
  es: z.string().trim().min(1).max(200),
  en: z.string().trim().min(1).max(200),
});

export const changelogChangeTypeSchema = z.enum(["added", "changed", "fixed", "removed"]);
export type ChangelogChangeType = z.infer<typeof changelogChangeTypeSchema>;

const changelogChangeSchema = z.object({
  type: changelogChangeTypeSchema,
  text: localizedTextSchema,
});

const changelogEntrySchema = z.object({
  version: z.string().trim().min(1).max(20),
  /** Fecha en formato ISO (YYYY-MM-DD). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date (YYYY-MM-DD)"),
  changes: z.array(changelogChangeSchema).min(1).max(20),
});
export type ChangelogEntry = z.infer<typeof changelogEntrySchema>;

export const changelogSchema = z.array(changelogEntrySchema);
export type Changelog = z.infer<typeof changelogSchema>;
