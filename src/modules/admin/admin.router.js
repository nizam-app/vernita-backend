const express = require('express');

const protect = require('../../middlewares/auth.middleware');
const authorizeAdmin = require('../../middlewares/admin.middleware');
const planRoutes = require('../plan/plan.routes');
const subscriptionAdminRoutes = require('../subscription/subscription-admin.routes');
const {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
} = require('./admin.controller');

const router = express.Router();

router.use(protect, authorizeAdmin);
router.use('/plans', planRoutes);
router.use('/', subscriptionAdminRoutes);

router.get('/users', getUsers);
router.get('/users/:userId', getUserById);
router.patch('/users/:userId', updateUserById);
router.delete('/users/:userId', deleteUserById);

module.exports = router;
