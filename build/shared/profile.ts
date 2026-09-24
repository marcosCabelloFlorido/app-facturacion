import { z } from 'zod';

export const passwordRules = [
  { label: 'Mínimo 8 caracteres', test: (value: string) => value.length >= 8 },
  { label: 'Una mayúscula', test: (value: string) => /\p{Lu}/u.test(value) },
  { label: 'Un número', test: (value: string) => /[0-9]/.test(value) },
  { label: 'Un carácter especial', test: (value: string) => /[^\p{L}\p{N}\s]/u.test(value) },
];
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    password: z
      .string()
      .max(128)
      .refine(
        (value) => passwordRules.every((rule) => rule.test(value)),
        'Usa al menos 8 caracteres, una mayúscula, un número y un carácter especial.',
      ),
    confirmation: z.string().max(128),
  })
  .refine((value) => value.password === value.confirmation, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmation'],
  });
export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    surname: z.string().trim().max(160).optional(),
    secondSurname: z.string().trim().max(160).optional(),
    avatar: z.string().max(350000).nullable(),
  })
  .strict();
