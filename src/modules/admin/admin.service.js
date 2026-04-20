import {
  deleteUserById as deleteUser,
  getUserById as getUser,
  getUsers as listUsers,
  updateUserById as updateUser,
} from "../user/user.service.js";

const getUsers = async () => listUsers();

const getUserById = async (userId) => getUser(userId);

const updateUserById = async (userId, payload) => updateUser(userId, payload);

const deleteUserById = async (userId) => deleteUser(userId);

export {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
};
