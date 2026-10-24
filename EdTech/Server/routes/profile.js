const express = require("express")
const router = express.Router()

const {updateprofile , deleteAccount , getAllUserDetails} = require("../controllers/Profile")
const {auth} = require("../middlewares/auth")

router.put("/updateProfile" , auth , updateprofile)
router.delete("/deleteProfile" , auth , deleteAccount)
router.get("/getUserDetails" , auth , getAllUserDetails)

module.exports = router
