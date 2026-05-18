import {
  deleteUserById as deleteUser,
  getUserDetailForAdmin,
  listUsersForAdmin,
  updateUserById as updateUser,
} from "../user/user.service.js";

const getUsers = async (query) => listUsersForAdmin(query || {});

const getUserById = async (userId) => getUserDetailForAdmin(userId);

const updateUserById = async (userId, payload) => updateUser(userId, payload);

const deleteUserById = async (userId) => deleteUser(userId);

export {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
};
