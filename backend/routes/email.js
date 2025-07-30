import express from "express";
// import { verifyToken } from "../middlewares/authMiddleware.js";
import { getEmail } from "../controllers/emailController.js";

const router = express.Router();

router.get("/gmail", getEmail);


export default router;