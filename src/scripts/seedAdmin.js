import bcrypt  from "bcryptjs";
import { connectDB } from "../config/db.js";
import { env } from '../config/env.js';
import { User } from "../modules/user/user.model.js";

const run = async () => {
    await connectDB();
    const email = 'admin.r2a@gmail.com';
    const password = 'AdminR2a@123';
    const existing = await User.findOne({email})
    if(existing){
        console.log("admin is already exist", email);
        process.exit(0);
    }

    const hashPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    await User.create({
        role: "admin",
        email,
        hashPassword,
        isActive: true,
        isBlocked: false,
    })

    console.log('admin created successfully')
    console.log(`email: ${email}, password: ${password}`)
    process.exit(0);
}
run().catch(e =>{
    console.error('seed failed', e)
    process.exit(1)
})