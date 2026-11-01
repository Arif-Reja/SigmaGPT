import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Thread from "../models/Thread.js";
import requireAuth, { signToken } from "../middleware/auth.js";

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; 
const SALT_ROUNDS = 12;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", SALT_ROUNDS);

const publicUser = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email
});
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body || {};

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail =
        typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanName || cleanName.length > 50) {
        return res.status(400).json({
            error: "Please enter your name (up to 50 characters)"
        });
    }

    if (!EMAIL_PATTERN.test(cleanEmail) || cleanEmail.length > 254) {
        return res.status(400).json({
            error: "Please enter a valid email address"
        });
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
        });
    }

    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
        return res.status(400).json({
            error: "Password is too long (maximum 72 characters)"
        });
    }

    try {
        
                const userCount = await User.countDocuments({});
        const isFirstUser = userCount === 0;

        
        const maxUsers = Number(process.env.MAX_USERS) || 0;

        if (maxUsers && userCount >= maxUsers) {
            return res.status(403).json({
                error: "Sign-ups are closed for now. Please contact the owner for access."
            });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await User.create({
            name: cleanName,
            email: cleanEmail,
            passwordHash
        });

        if (isFirstUser) {
            const result = await Thread.updateMany(
                { userId: null },
                { $set: { userId: user._id.toString() } },
                { timestamps: false } // keep the original chat order
            );

            console.log(
                `First account created: ${result.modifiedCount} existing chats were assigned to it.`
            );
        }

        return res.status(201).json({
            token: signToken(user._id.toString()),
            user: publicUser(user)
        });
    } catch (err) {
       
        if (err.code === 11000) {
            return res.status(409).json({
                error: "An account with this email already exists"
            });
        }

        console.error("Register error:", err);

        return res.status(500).json({
            error: "Could not create the account. Please try again."
        });
    }
});



router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
        const user = await User.findOne({ email: cleanEmail }).select(
            "+passwordHash"
        );

        const passwordMatches = await bcrypt.compare(
            password,
            user?.passwordHash || DUMMY_HASH
        );

       
        if (!user || !passwordMatches) {
            return res.status(401).json({
                error: "Incorrect email or password"
            });
        }

        return res.status(200).json({
            token: signToken(user._id.toString()),
            user: publicUser(user)
        });
    } catch (err) {
        console.error("Login error:", err);

        return res.status(500).json({
            error: "Could not log in. Please try again."
        });
    }
});

router.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(401).json({
                error: "Your session has expired. Please log in again."
            });
        }

        return res.status(200).json({
            user: publicUser(user)
        });
    } catch (err) {
        console.error("Fetch account error:", err);

        return res.status(500).json({
            error: "Could not load your account"
        });
    }
});

export default router;