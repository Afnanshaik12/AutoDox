import { z } from 'zod';

export const createProfileSchema = z.object({
  name: z
    .string({ required_error: 'Profile name is required' })
    .trim()
    .min(1, 'Profile name cannot be empty')
    .max(60, 'Profile name cannot exceed 60 characters'),
  type: z
    .enum(['my_info', 'father_info', 'academic', 'professional', 'custom'], {
      invalid_type_error: 'Invalid profile type'
    })
    .default('custom'),
  description: z.string().max(200).optional().default(''),
  is_default: z.boolean().optional().default(false)
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  type: z.enum(['my_info', 'father_info', 'academic', 'professional', 'custom']).optional(),
  description: z.string().max(200).optional(),
  is_default: z.boolean().optional()
});

export const createAttributeSchema = z.object({
  profileId: z.string({ required_error: 'Profile ID is required' }).uuid('Invalid profile ID format'),
  label: z
    .string({ required_error: 'Field label is required' })
    .trim()
    .min(1, 'Field label cannot be empty')
    .max(80, 'Field label cannot exceed 80 characters'),
  key: z.string().trim().max(80).optional(),
  value: z
    .string({ required_error: 'Field value is required' })
    .trim()
    .min(1, 'Field value cannot be empty')
    .max(2000, 'Field value cannot exceed 2000 characters'),
  category: z
    .enum(['Personal', 'Family', 'Academic', 'Professional', 'Contact', 'Identity', 'Financial', 'Other'])
    .default('Personal')
});

export const updateAttributeSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  key: z.string().trim().max(80).optional(),
  value: z.string().trim().min(1).max(2000).optional(),
  category: z
    .enum(['Personal', 'Family', 'Academic', 'Professional', 'Contact', 'Identity', 'Financial', 'Other'])
    .optional()
});

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
