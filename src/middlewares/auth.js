import AppError from "../utils/AppError.js";
import { User } from "../modules/user/user.model.js";
import { verifyToken } from "../utils/jwt.js";
import { catchAsync } from "../utils/catchAsync.js";

export const protect = catchAsync(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
        throw new AppError('Unauthorized. Missing Bearer token', 401)
    }

    const token = authHeader.split(" ")[1];
    if(!token) throw new AppError('Unauthorized. Token is missing', 401);

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.sub);
    if(!user) throw new AppError("Unauthroized. User not found.", 404);
    if(!user.isActive) throw new AppError('Account is inactive', 403);
    if(user.isBlocked) throw new AppError('Account is Blocked', 403);

    req.user = user;
    req.auth = decoded;

    next();

})

export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if(!req.user) return next( new AppError('Unauthorized.', 401));

        if(!roles.includes(req.user.role)) {
            return next(new AppError("forbidden, you don't have right access", 403));
        }
        next();
    }
}