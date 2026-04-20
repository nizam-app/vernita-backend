import httpStatus from "../../constants/httpStatus.js";
import { catchAsync as asyncHandler } from "../../utils/catchAsync.js";
import ApiResponse from "../../utils/api-response.js";
import * as projectService from "./project.service.js";

export const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: 'Project created successfully.',
    data: project,
  });
});

export const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getProjects();

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Projects fetched successfully.',
    data: projects,
  });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.projectId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Project fetched successfully.',
    data: project,
  });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(req.params.projectId, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Project updated successfully.',
    data: project,
  });
});

export const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.projectId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Project deleted successfully.',
  });
});
