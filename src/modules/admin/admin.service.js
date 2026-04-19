const userService = require('../user/user.service');

const getUsers = async () => {
  return userService.getUsers();
};

const getUserById = async (userId) => {
  return userService.getUserById(userId);
};

const updateUserById = async (userId, payload) => {
  return userService.updateUserById(userId, payload);
};

const deleteUserById = async (userId) => {
  return userService.deleteUserById(userId);
};

module.exports = {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
};
