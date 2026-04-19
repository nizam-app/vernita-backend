const asyncHandler = require('../../utils/async-handler');
const ApiResponse = require('../../utils/api-response');
const httpStatus = require('../../constants/http-status');
const projectService = require('./project.service');

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: 'Project created successfully.',
    data: project,
  });
});

const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getProjects();

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Projects fetched successfully.',
    data: projects,
  });
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.projectId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Project fetched successfully.',
    data: project,
  });
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(req.params.projectId, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Project updated successfully.',
    data: project,
  });
});

const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.projectId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Project deleted successfully.',
  });
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
