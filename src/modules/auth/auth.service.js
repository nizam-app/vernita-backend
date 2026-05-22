import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import AppError from "../../utils/AppError.js";
import { User } from '../user/user.model.js'
import { signToken } from "../../utils/jwt.js";


const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const registerService = async (payload) => {
    const role = String(payload?.role || "user").trim().toLowerCase();
    const name = payload?.name ? String(payload.name).trim() : "";
    const email = payload?.email ? String(payload.email).trim().toLowerCase() : null;
    const password = payload?.password ? String(payload.password) : "";
    if (!["user", "admin"].includes(role)) {
        throw new AppError("Invalid role. only user/admin allowed", 400)
    }

    if (!name) {
        throw new AppError("name is required", 400)
    }

    if (!email) {
        throw new AppError("email is required", 400)
    }

    if (email && !isValidEmail(email)) {
        throw new AppError("invalid email", 400)
    }

    if (password.length < 6) {
        throw new AppError("password should be minimum 6", 400)
    }

    if (email) {
        const exists = await User.findOne({ email })
        if (exists) {
            throw new AppError('email already exist', 409)
        }
    }

    const hashPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS)

    const user = await User.create({
        name,
        role,
        email,
        hashPassword: hashPassword,
    })
    return ({
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email || null,
    })
}

export const loginService = async (payload) => {
    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '');

    if (!email) throw new AppError("email is required", 400);
    if (!password) throw new AppError("Password is required.", 400);

    if (!isValidEmail(email)) {
        throw new AppError("invalid email", 400)
    }

    const user = await User.findOne({ email }).select("+hashPassword");

    if (!user) throw new AppError('invalid credentials', 401);

    if (!user.isActive) throw new AppError('Account is inactive', 403);
    if (user.isBlocked) throw new AppError('account is blocked', 403);
    
    const ok = await bcrypt.compare(password, user.hashPassword);

    if(!ok) throw new AppError('invalid credentials' , 401);

    const token = signToken({
        sub: user._id.toString(),
        role: user.role,
        tv: user.tokenVersion || 0,
    });

    return{
        token,
        user: {
            id: user._id,
            role: user.role,
            email: user.email || null,
            isActive: user.isActive,
            isBlocked: user.isBlocked,
        }
    }
}

export const adminLoginService = async (payload) => {
    const result = await loginService(payload);
    if (result.user.role !== "admin") {
        throw new AppError("Forbidden. Admin access required.", 403);
    }
    return result;
};

export const logoutService = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new AppError("Unauthorized. User not found.", 401);
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();
    return true;
};

export const updatePasswordService = async ({ userId, currentPassword, newPassword }) => {
    const user = await User.findById(userId).select("+hashPassword");
    if (!user) throw new AppError("Unauthorized. User not found.", 401);
    if (!currentPassword) throw new AppError("currentPassword is required.", 400);
    if (!newPassword) throw new AppError("newPassword is required.", 400);
    if (String(newPassword).length < 6) throw new AppError("newPassword should be minimum 6", 400);

    const ok = await bcrypt.compare(String(currentPassword), user.hashPassword);
    if (!ok) throw new AppError("invalid credentials", 401);

    user.hashPassword = await bcrypt.hash(String(newPassword), env.BCRYPT_SALT_ROUNDS);
    user.tokenVersion = Number(user.tokenVersion || 0) + 1; // invalidate other sessions
    await user.save();

    const token = signToken({ sub: user._id.toString(), role: user.role, tv: user.tokenVersion || 0 });
    return {
        token,
        user: {
            id: user._id,
            role: user.role,
            email: user.email || null,
            isActive: user.isActive,
            isBlocked: user.isBlocked,
        }
    };
};
