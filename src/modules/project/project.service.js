const Project = require('./project.model');
const ApiError = require('../../utils/api-error');
const httpStatus = require('../../constants/http-status');

const createProject = async (payload) => {
  return Project.create({
    name: payload.name,
    description: payload.description,
    status: payload.status,
  });
};

const getProjects = async () => {
  return Project.find().sort({ createdAt: -1 });
};

const getProjectById = async (projectId) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }

  return project;
};

const updateProject = async (projectId, payload) => {
  const project = await Project.findByIdAndUpdate(
    projectId,
    {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }

  return project;
};

const deleteProject = async (projectId) => {
  const project = await Project.findByIdAndDelete(projectId);

  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found.');
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
