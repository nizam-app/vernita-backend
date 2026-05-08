import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import { adminLogin, login, logout, register, updatePassword } from "./auth.controller.js";


const router = Router();

router.post('/register', register)
router.post('/login', login)
router.post('/admin/login', adminLogin)
router.post('/logout', protect, logout)
router.patch('/password', protect, updatePassword)

export default router;