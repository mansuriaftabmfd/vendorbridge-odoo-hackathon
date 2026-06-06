/**
 * Authentication Controller
 * Handles user registration, login, logout, password reset
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userQueries = require('../db/queries/users.queries');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { validatePasswordStrength } = require('../utils/password-strength');
const { validateGSTIN } = require('../utils/gst-validator');
const { sendEmail } = require('../config/email');
const activityService = require('../services/activity.service');
const notificationService = require('../services/notification.service');
const { 
  createValidationError, 
  createUnauthorizedError, 
  createNotFoundError,
  createConflictError,
  AppError
} = require('../middleware/error-handler');

const authController = {
  /**
   * Register new user
   */
  async register(req, res, next) {
    try {
      const { email, password, full_name, role, organization, organization_id } = req.body;

      // Check if user already exists
      const existingUser = await userQueries.findByEmail(email);
      if (existingUser) {
        return next(createConflictError('User with this email already exists'));
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return next(createValidationError(`Password validation failed: ${passwordValidation.messages.join(', ')}`));
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');

      let finalOrgId = organization_id;

      // Create organization if provided
      if (organization && !organization_id) {
        // Validate GSTIN if provided
        if (organization.gstin && !validateGSTIN(organization.gstin)) {
          return next(createValidationError('Invalid GSTIN format'));
        }

        const orgResult = await query(`
          INSERT INTO organizations (name, gstin, address, phone)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [organization.name, organization.gstin || null, organization.address || null, organization.phone || null]);

        finalOrgId = orgResult.rows[0].id;
        
        logger.info('Organization created during registration', {
          organizationId: finalOrgId,
          organizationName: organization.name,
          email
        });
      }

      // Create user
      const userData = {
        email,
        password_hash: passwordHash,
        full_name,
        role,
        organization_id: finalOrgId,
        email_verification_token: emailVerificationToken
      };

      const newUser = await userQueries.createUser(userData);

      // Send verification email (async)
      setImmediate(async () => {
        try {
          const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;
          
          await sendEmail({
            to: email,
            subject: 'Verify Your Email - VendorBridge ERP',
            html: `
              <h2>Welcome to VendorBridge ERP!</h2>
              <p>Hello ${full_name},</p>
              <p>Thank you for registering with VendorBridge ERP. Please verify your email address by clicking the link below:</p>
              <p><a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p>${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>Best regards,<br>VendorBridge Team</p>
            `
          });
          
          logger.info('Verification email sent', { userId: newUser.id, email });
        } catch (error) {
          logger.error('Failed to send verification email', { error, userId: newUser.id, email });
        }
      });

      // Log activity
      await activityService.logActivity(
        newUser.id,
        'user_registered',
        'user',
        newUser.id,
        { role, organization_id: finalOrgId },
        req.ip,
        req.get('User-Agent')
      );

      logger.info('User registered successfully', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        organizationId: finalOrgId
      });

      // Return success response (without sensitive data)
      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          organization_id: newUser.organization_id,
          email_verified: newUser.email_verified,
          created_at: newUser.created_at
        }
      });

    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  },

  /**
   * Login user — with role verification
   */
  async login(req, res, next) {
    try {
      const { email, password, remember_me, requested_role } = req.body;
      const { rolesMatch } = require('../utils/role-helper');

      // 1. Find user by email
      const user = await userQueries.findByEmail(email);
      if (!user) {
        await activityService.logActivity(
          null, 'login_failed', 'user', null,
          { email, reason: 'user_not_found' }, req.ip, req.get('User-Agent')
        );
        // 404 — account does not exist
        return res.status(404).json({
          success: false,
          code: 'USER_NOT_FOUND',
          error: 'No account found with this email. Please sign up first.'
        });
      }

      // 2. Check if user is active
      if (!user.is_active) {
        await activityService.logActivity(
          user.id, 'login_failed', 'user', user.id,
          { reason: 'account_inactive' }, req.ip, req.get('User-Agent')
        );
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_INACTIVE',
          error: 'Your account has been deactivated. Please contact support.'
        });
      }

      // 3. Verify password FIRST (before role check to avoid user enumeration by role)
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        await activityService.logActivity(
          user.id, 'login_failed', 'user', user.id,
          { reason: 'invalid_password' }, req.ip, req.get('User-Agent')
        );
        // 401 — wrong password
        return res.status(401).json({
          success: false,
          code: 'INVALID_CREDENTIALS',
          error: 'Invalid email or password.'
        });
      }

      // 4. Role mismatch check — only if a requested_role was provided
      if (requested_role && requested_role.trim() !== '') {
        if (!rolesMatch(user.role, requested_role)) {
          await activityService.logActivity(
            user.id, 'login_failed', 'user', user.id,
            { reason: 'role_mismatch', requested_role, actual_role: user.role }, req.ip, req.get('User-Agent')
          );
          // 403 — credentials valid, but wrong role selected
          return res.status(403).json({
            success: false,
            code: 'ROLE_MISMATCH',
            error: 'Your credentials are valid, but you are not registered as this role. Please select your correct role.',
            hint: `Your account role is different from the selected role.`
          });
        }
      }

      // 5. Check org active status
      if (user.organization_id && !user.organization_active) {
        await activityService.logActivity(
          user.id, 'login_failed', 'user', user.id,
          { reason: 'organization_inactive' }, req.ip, req.get('User-Agent')
        );
        return res.status(403).json({
          success: false,
          code: 'ORG_INACTIVE',
          error: 'Your organization account is inactive. Please contact support.'
        });
      }

      // Regenerate session ID for security
      req.session.regenerate((err) => {
        if (err) {
          logger.error('Session regeneration error:', err);
          return next(new AppError('Login failed', 500));
        }

        // Create session data
        req.session.user = {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          organization_id: user.organization_id,
          organization_name: user.organization_name
        };

        // Set session options
        if (remember_me) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
        }

        // Save session
        req.session.save(async (err) => {
          if (err) {
            logger.error('Session save error:', err);
            return next(new AppError('Login failed', 500));
          }

          // Update last login timestamp
          await userQueries.updateLastLogin(user.id);

          // Log successful login
          await activityService.logActivity(
            user.id,
            'user_logged_in',
            'user',
            user.id,
            { remember_me },
            req.ip,
            req.get('User-Agent')
          );

          logger.info('User logged in successfully', {
            userId: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organization_id,
            rememberMe: remember_me,
            ip: req.ip
          });

          // Return success response
          res.json({
            success: true,
            message: 'Login successful',
            data: {
              user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                organization_id: user.organization_id,
                organization_name: user.organization_name,
                email_verified: user.email_verified,
                last_login_at: user.last_login_at
              },
              session_expires_at: new Date(Date.now() + req.session.cookie.maxAge)
            }
          });
        });
      });

    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  },

  /**
   * Logout user
   */
  async logout(req, res, next) {
    try {
      const userId = req.session?.user?.id;

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          logger.error('Session destruction error:', err);
          return next(new AppError('Logout failed', 500));
        }

        // Clear session cookie
        res.clearCookie('vendorbridge.sid');

        // Log logout activity
        if (userId) {
          setImmediate(async () => {
            try {
              await activityService.logActivity(
                userId,
                'user_logged_out',
                'user',
                userId,
                {},
                req.ip,
                req.get('User-Agent')
              );
              
              logger.info('User logged out successfully', { userId, ip: req.ip });
            } catch (error) {
              logger.error('Failed to log logout activity:', error);
            }
          });
        }

        res.json({
          success: true,
          message: 'Logout successful'
        });
      });

    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  },

  /**
   * Get current user profile
   */
  async me(req, res, next) {
    try {
      if (!req.user) {
        return next(createUnauthorizedError('Authentication required'));
      }

      const user = await userQueries.findById(req.user.id);
      if (!user) {
        return next(createNotFoundError('User not found'));
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            organization_id: user.organization_id,
            organization_name: user.organization_name,
            email_verified: user.email_verified,
            is_active: user.is_active,
            last_login_at: user.last_login_at,
            created_at: user.created_at
          }
        }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  },

  /**
   * Forgot password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      // Find user
      const user = await userQueries.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists - return success anyway
        logger.security('Password reset attempted for non-existent email', { email, ip: req.ip });
        
        return res.json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        logger.security('Password reset attempted for inactive user', { userId: user.id, email, ip: req.ip });
        
        return res.json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token
      await userQueries.setResetToken(email, resetToken, resetExpires);

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      await sendEmail({
        to: email,
        subject: 'Password Reset Request - VendorBridge ERP',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hello ${user.full_name},</p>
          <p>We received a request to reset your password. Click the link below to reset your password:</p>
          <p><a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>VendorBridge Team</p>
        `
      });

      // Log activity
      await activityService.logActivity(
        user.id,
        'password_reset_requested',
        'user',
        user.id,
        {},
        req.ip,
        req.get('User-Agent')
      );

      logger.info('Password reset email sent', { userId: user.id, email });

      res.json({
        success: true,
        message: 'Password reset link has been sent to your email address.'
      });

    } catch (error) {
      logger.error('Forgot password error:', error);
      next(error);
    }
  },

  /**
   * Reset password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      // Find user by reset token
      const user = await userQueries.findByResetToken(token);
      if (!user) {
        return next(createValidationError('Invalid or expired reset token'));
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return next(createValidationError(`Password validation failed: ${passwordValidation.messages.join(', ')}`));
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update password
      await userQueries.updatePassword(user.id, passwordHash);

      // Log activity
      await activityService.logActivity(
        user.id,
        'password_reset_completed',
        'user',
        user.id,
        {},
        req.ip,
        req.get('User-Agent')
      );

      logger.info('Password reset completed', { userId: user.id, email: user.email });

      res.json({
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.'
      });

    } catch (error) {
      logger.error('Reset password error:', error);
      next(error);
    }
  },

  /**
   * Change password (authenticated user)
   */
  async changePassword(req, res, next) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      // Get current user
      const user = await userQueries.findById(userId);
      if (!user) {
        return next(createNotFoundError('User not found'));
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        return next(createUnauthorizedError('Current password is incorrect'));
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(new_password);
      if (!passwordValidation.isValid) {
        return next(createValidationError(`Password validation failed: ${passwordValidation.messages.join(', ')}`));
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await userQueries.updatePassword(userId, passwordHash);

      // Log activity
      await activityService.logActivity(
        userId,
        'password_changed',
        'user',
        userId,
        {},
        req.ip,
        req.get('User-Agent')
      );

      logger.info('Password changed successfully', { userId, email: user.email });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      next(error);
    }
  },

  /**
   * Verify email address
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;

      // Find user by verification token
      const user = await userQueries.findByVerificationToken(token);
      if (!user) {
        return next(createValidationError('Invalid or expired verification token'));
      }

      // Check if already verified
      if (user.email_verified) {
        return res.json({
          success: true,
          message: 'Email address has already been verified'
        });
      }

      // Verify email
      await userQueries.verifyEmail(token);

      // Log activity
      await activityService.logActivity(
        user.id,
        'email_verified',
        'user',
        user.id,
        {},
        req.ip,
        req.get('User-Agent')
      );

      // Send welcome notification
      await notificationService.createNotification(
        user.id,
        'welcome',
        'Welcome to VendorBridge ERP!',
        'Your email has been verified successfully. You can now access all features of the platform.',
        'user',
        user.id
      );

      logger.info('Email verified successfully', { userId: user.id, email: user.email });

      res.json({
        success: true,
        message: 'Email address verified successfully'
      });

    } catch (error) {
      logger.error('Email verification error:', error);
      next(error);
    }
  },

  /**
   * Resend verification email
   */
  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;

      // Find user
      const user = await userQueries.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({
          success: true,
          message: 'If an account with this email exists and is not verified, a verification email has been sent.'
        });
      }

      // Check if already verified
      if (user.email_verified) {
        return res.json({
          success: true,
          message: 'Email address is already verified'
        });
      }

      // Generate new verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      
      await query(`
        UPDATE users 
        SET email_verification_token = $1, updated_at = NOW()
        WHERE id = $2
      `, [emailVerificationToken, user.id]);

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;
      
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - VendorBridge ERP',
        html: `
          <h2>Email Verification</h2>
          <p>Hello ${user.full_name},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>Best regards,<br>VendorBridge Team</p>
        `
      });

      logger.info('Verification email resent', { userId: user.id, email });

      res.json({
        success: true,
        message: 'Verification email has been sent'
      });

    } catch (error) {
      logger.error('Resend verification error:', error);
      next(error);
    }
  }
};

module.exports = authController;