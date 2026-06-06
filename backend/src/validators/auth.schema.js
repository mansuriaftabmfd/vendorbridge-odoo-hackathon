/**
 * Authentication Validation Schemas
 * Zod schemas for auth endpoints
 */

const { z } = require('zod');
const { validateGSTIN } = require('../utils/gst-validator');

// User registration schema
const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~]/, 'Password must contain at least one special character')
    .max(128, 'Password too long'),
  
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters long')
    .max(255, 'Full name too long')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Full name contains invalid characters'),
  
  role: z.enum(['PROCUREMENT_OFFICER', 'VENDOR', 'MANAGER', 'ADMIN'], 
    'Invalid role. Must be PROCUREMENT_OFFICER, VENDOR, MANAGER, or ADMIN'),
  
  // Organization details (required for non-admin users)
  organization: z.object({
    name: z.string()
      .min(2, 'Organization name must be at least 2 characters long')
      .max(255, 'Organization name too long'),
    
    gstin: z.string()
      .optional()
      .refine(
        (val) => !val || validateGSTIN(val),
        'Invalid GSTIN format'
      ),
    
    address: z.string()
      .max(1000, 'Address too long')
      .optional(),
    
    phone: z.string()
      .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
      .max(20, 'Phone number too long')
      .optional()
  }).optional(),
  
  // Existing organization ID (for users joining existing org)
  organization_id: z.string().uuid('Invalid organization ID').optional()
}).refine(
  (data) => {
    // Admin users don't need organization
    if (data.role === 'ADMIN') return true;
    
    // Other users need either organization details or organization_id
    return data.organization || data.organization_id;
  },
  {
    message: 'Organization details or organization_id is required for non-admin users',
    path: ['organization']
  }
);

// User login schema
const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long'),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),

  // The role the user selected on the login page — must match database role
  requested_role: z.string().optional(),
  
  remember_me: z.boolean().optional().default(false)
});

// Forgot password schema
const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long')
});

// Reset password schema
const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required')
    .max(255, 'Token too long'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~]/, 'Password must contain at least one special character')
    .max(128, 'Password too long'),
  
  confirm_password: z.string()
    .min(1, 'Password confirmation is required')
}).refine(
  (data) => data.password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password']
  }
);

// Change password schema
const changePasswordSchema = z.object({
  current_password: z.string()
    .min(1, 'Current password is required')
    .max(128, 'Password too long'),
  
  new_password: z.string()
    .min(8, 'New password must be at least 8 characters long')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/\d/, 'New password must contain at least one digit')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~]/, 'New password must contain at least one special character')
    .max(128, 'Password too long'),
  
  confirm_password: z.string()
    .min(1, 'Password confirmation is required')
}).refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'New passwords do not match',
    path: ['confirm_password']
  }
).refine(
  (data) => data.current_password !== data.new_password,
  {
    message: 'New password must be different from current password',
    path: ['new_password']
  }
);

// Update profile schema
const updateProfileSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters long')
    .max(255, 'Full name too long')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Full name contains invalid characters')
    .optional(),
  
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long')
    .optional()
});

// Email verification schema
const verifyEmailSchema = z.object({
  token: z.string()
    .min(1, 'Verification token is required')
    .max(255, 'Token too long')
});

// Resend verification schema
const resendVerificationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long')
});

// Session validation schema
const sessionSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    full_name: z.string(),
    role: z.enum(['PROCUREMENT_OFFICER', 'VENDOR', 'MANAGER', 'ADMIN']),
    organization_id: z.string().uuid().nullable(),
    organization_name: z.string().nullable()
  })
});

// Role-based validation
const createUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password too long'),
  
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters long')
    .max(255, 'Full name too long')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Full name contains invalid characters'),
  
  role: z.enum(['PROCUREMENT_OFFICER', 'VENDOR', 'MANAGER', 'ADMIN'], 
    'Invalid role'),
  
  organization_id: z.string().uuid('Invalid organization ID').optional(),
  
  is_active: z.boolean().default(true),
  
  send_welcome_email: z.boolean().default(true)
});

// Bulk user creation schema
const bulkCreateUsersSchema = z.object({
  users: z.array(createUserSchema)
    .min(1, 'At least one user is required')
    .max(50, 'Maximum 50 users can be created at once')
});

// Login attempt tracking schema
const trackLoginAttemptSchema = z.object({
  email: z.string().email(),
  success: z.boolean(),
  ip_address: z.string(),
  user_agent: z.string().optional(),
  failure_reason: z.string().optional()
});

// Rate limiting schemas
const rateLimitSchema = z.object({
  identifier: z.string().min(1), // IP address or user ID
  action: z.enum(['login', 'register', 'forgot_password', 'reset_password']),
  window_ms: z.number().positive(),
  max_attempts: z.number().positive()
});

// Password strength validation (more detailed)
const passwordStrengthSchema = z.object({
  password: z.string()
}).superRefine((val, ctx) => {
  const password = val.password;
  
  if (!password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password is required'
    });
    return;
  }

  const checks = [
    { regex: /.{8,}/, message: 'Must be at least 8 characters long' },
    { regex: /[A-Z]/, message: 'Must contain at least one uppercase letter' },
    { regex: /[a-z]/, message: 'Must contain at least one lowercase letter' },
    { regex: /\d/, message: 'Must contain at least one digit' },
    { regex: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~]/, message: 'Must contain at least one special character' },
    { regex: /^.{0,128}$/, message: 'Must be no more than 128 characters long' }
  ];

  const failedChecks = checks.filter(check => !check.regex.test(password));
  
  failedChecks.forEach(check => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: check.message,
      path: ['password']
    });
  });

  // Check for common weak passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
  if (commonPasswords.includes(password.toLowerCase())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password is too common',
      path: ['password']
    });
  }
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  sessionSchema,
  createUserSchema,
  bulkCreateUsersSchema,
  trackLoginAttemptSchema,
  rateLimitSchema,
  passwordStrengthSchema
};