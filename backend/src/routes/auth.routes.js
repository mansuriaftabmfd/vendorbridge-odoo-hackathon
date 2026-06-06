/**
 * Authentication Routes
 * Public routes for user authentication
 */

const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/auth.controller');

// Import middleware
const { validateBody } = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');

// Import validation schemas
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  updateProfileSchema
} = require('../validators/auth.schema');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  validateBody(registerSchema),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', 
  validateBody(loginSchema),
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public (but checks for session)
 */
router.post('/logout', 
  optionalAuth,
  authController.logout
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', 
  authController.me
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', 
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', 
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post('/change-password', 
  validateBody(changePasswordSchema),
  authController.changePassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', 
  validateBody(verifyEmailSchema),
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post('/resend-verification', 
  validateBody(resendVerificationSchema),
  authController.resendVerification
);

/**
 * @route   GET /api/auth/session
 * @desc    Check session status
 * @access  Public
 */
router.get('/session', (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      success: true,
      authenticated: true,
      user: req.session.user,
      expires_at: new Date(Date.now() + req.session.cookie.maxAge)
    });
  } else {
    res.json({
      success: true,
      authenticated: false,
      user: null
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh session
 * @access  Private
 */
router.post('/refresh', (req, res) => {
  if (req.session && req.session.user) {
    // Touch session to refresh expiry
    req.session.touch();
    
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Failed to refresh session'
        });
      }
      
      res.json({
        success: true,
        message: 'Session refreshed successfully',
        expires_at: new Date(Date.now() + req.session.cookie.maxAge)
      });
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'No active session to refresh'
    });
  }
});

module.exports = router;