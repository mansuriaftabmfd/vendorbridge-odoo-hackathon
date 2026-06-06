/**
 * User Management Routes
 * Routes for user CRUD operations
 */

const express = require('express');
const router = express.Router();

// Import middleware
const { requireAuth, requireAdmin, requireManager } = require('../middleware/auth');
const { enforceOrgIsolation } = require('../middleware/org-isolation');
const { validateBody, validateQuery, commonSchemas } = require('../middleware/validate');
const { z } = require('zod');

// Import controller (placeholder - will be created later)
const userController = {
  getUsers: (req, res) => res.json({ message: 'Get users endpoint' }),
  getUser: (req, res) => res.json({ message: 'Get user endpoint' }),
  updateUser: (req, res) => res.json({ message: 'Update user endpoint' }),
  deleteUser: (req, res) => res.json({ message: 'Delete user endpoint' })
};

// Validation schemas
const updateUserSchema = z.object({
  full_name: commonSchemas.shortString.optional(),
  role: commonSchemas.userRole.optional(),
  is_active: z.boolean().optional()
});

const getUsersQuerySchema = z.object({
  ...commonSchemas.pagination.shape,
  role: commonSchemas.userRole.optional(),
  is_active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  search: z.string().max(100).optional()
});

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination and filters)
 * @access  Admin, Manager
 */
router.get('/',
  requireAuth,
  requireManager,
  enforceOrgIsolation,
  validateQuery(getUsersQuerySchema),
  userController.getUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin, Manager, Own profile
 */
router.get('/:id',
  requireAuth,
  enforceOrgIsolation,
  userController.getUser
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Admin, Manager
 */
router.put('/:id',
  requireAuth,
  requireManager,
  enforceOrgIsolation,
  validateBody(updateUserSchema),
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin only
 */
router.delete('/:id',
  requireAuth,
  requireAdmin,
  enforceOrgIsolation,
  userController.deleteUser
);

module.exports = router;