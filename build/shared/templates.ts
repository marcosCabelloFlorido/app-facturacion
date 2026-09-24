import { z } from 'zod';
export const templateSettingsSchema = z.object({
  language: z.enum(['es', 'en']).default('es'),
  accent: z.enum(['#171717', '#334155', '#1e40af']).default('#171717'),
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
  footer: z.string().trim().max(500).default(''),
  logoFileId: z.uuid().nullable().default(null),
});
export const templateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  kind: z.enum(['invoice', 'quote', 'purchase', 'credit']),
  settings: templateSettingsSchema,
});
export type TemplateSettings = z.infer<typeof templateSettingsSchema>;
export type DocumentTemplate = z.infer<typeof templateSchema> & { id: string; version: number; active: boolean };
export const defaultTemplate = templateSettingsSchema.parse({});
