import { z } from "zod";
import { languageTagSchema } from "./common.js";

export const localizedTextSchema = z.object({
  default: z.string().min(1),
  translations: z.record(languageTagSchema, z.string().min(1)).default({}),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const localizedUrlSchema = z.object({
  default: z.string().url(),
  translations: z.record(languageTagSchema, z.string().url()).default({}),
});
export type LocalizedUrl = z.infer<typeof localizedUrlSchema>;

export function textFor(
  text: LocalizedText,
  preferredLanguages: readonly string[],
): string {
  for (const language of preferredLanguages) {
    if (text.translations[language]) return text.translations[language];
    const base = language.split("-")[0];
    if (base && text.translations[base]) return text.translations[base];
  }
  return text.default;
}
