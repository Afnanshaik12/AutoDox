import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(60, 'Name cannot exceed 60 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().optional()
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
);

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address'),
  redirectTo: z.string().url('Invalid redirect URL').optional()
});

export const resetPasswordSchema = z.object({
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().optional(),
  token: z.string().optional(),
  email: z.string().email('Please provide a valid email address').optional(),
  code: z.string().optional()
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
);

export const handoffExchangeSchema = z.object({
  code: z
    .string({ required_error: 'Authorization handoff code is required' })
    .trim()
    .min(1, 'Authorization handoff code is required'),
  expectedUserId: z.string().optional()
});

export const oauthExchangeSchema = z.object({
  code: z
    .string({ required_error: 'OAuth authorization code is required' })
    .trim()
    .min(1, 'OAuth authorization code is required'),
  codeVerifier: z.string().optional()
});

/**
 * Helper to format Zod validation errors into a clean, field-keyed object
 */
export function formatZodErrors(zodError) {
  const errors = {};
  zodError.errors.forEach((err) => {
    const field = err.path.join('.') || 'general';
    if (!errors[field]) {
      errors[field] = err.message;
    }
  });
  return errors;
}
