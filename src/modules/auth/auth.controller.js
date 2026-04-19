import { catchAsync } from '../../utils/catchAsync.js'
import { loginService, registerService } from './auth.service.js'
import { sendResponse } from '../../utils/sendResponse.js'


export const register = catchAsync(async (req, res) => {
    const data = await registerService(req.body);
    return sendResponse(res, {statusCode: 200, message: "user created successfully", data})
})

export const login = catchAsync(async (req, res) => {
    const data = await loginService(req.body);
    sendResponse(res, {statusCode: 200, message: 'login successfully', data})
})