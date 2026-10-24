const express = require("express")
const authRouter  = express.Router()
const authController = require("../controllers/auth.controller")
const authMiddleware = require("../middlewares/auth.middleware")
/**
 * @Route POST /api/auth/register
 * @description create a new user (NO auth middleware because no token at this point)
 * @access Public
 */
authRouter.post("/register" , authController.registerUser)
authRouter.post("/login" , authController.loginUser)


authRouter.get("/logout" ,authController.logoutUser )

/**
 * @route GET  /api/auth/get-me
 * @description Get logged in user
 * @access Private
 */


authRouter.get("/get-me", authMiddleware.authUser , authController.getUser)
module.exports = authRouter;
