const express = require("express")
const router = express.Router()

const {sendOtp , signUp , login , changePassword} = require("../controllers/Auth")
const {resetPasswordToken , restPassword} = require("../controllers/ResetPassword")
const {auth} = require("../middlewares/auth")

//auth routes
router.post("/sendotp" , sendOtp)
router.post("/signup" , signUp)
router.post("/login" , login)
router.post("/changepassword" , auth , changePassword)

//reset password routes
router.post("/reset-password-token" , resetPasswordToken)
router.post("/reset-password" , restPassword)

module.exports = router
