import { catchAsync } from '../../utils/catchAsync.js'
import { adminLoginService, loginService, logoutService, registerService, updatePasswordService } from './auth.service.js'
import { sendResponse } from '../../utils/sendResponse.js'


export const register = catchAsync(async (req, res) => {
    const data = await registerService(req.body);
    return sendResponse(res, {statusCode: 200, message: "user created successfully", data})
})

export const login = catchAsync(async (req, res) => {
    const data = await loginService(req.body);
    sendResponse(res, {statusCode: 200, message: 'login successfully', data})
})

export const adminLogin = catchAsync(async (req, res) => {
    const data = await adminLoginService(req.body);
    sendResponse(res, {statusCode: 200, message: 'admin login successfully', data})
})

export const logout = catchAsync(async (req, res) => {
    const data = await logoutService(req.user?._id);
    sendResponse(res, {statusCode: 200, message: 'logout successfully', data})
})

export const updatePassword = catchAsync(async (req, res) => {
    const data = await updatePasswordService({
        userId: req.user?._id,
        currentPassword: req.body?.currentPassword,
        newPassword: req.body?.newPassword,
    });
    sendResponse(res, {statusCode: 200, message: 'password updated successfully', data})
})