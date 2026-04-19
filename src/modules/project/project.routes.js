const express = require('express');

const protect = require('../../middlewares/auth.middleware');
const authorizeAdmin = require('../../middlewares/admin.middleware');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require('./project.controller');

const router = express.Router();

router.use(protect);

router.route('/').get(getProjects).post(authorizeAdmin, createProject);
router
  .route('/:projectId')
  .get(getProjectById)
  .patch(authorizeAdmin, updateProject)
  .delete(authorizeAdmin, deleteProject);

module.exports = router;
