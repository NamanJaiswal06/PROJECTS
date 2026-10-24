const express = require("express")
const router = express.Router()

const {createCourse , showAllCourses , getCourseDetails} = require("../controllers/Course")
const {createSection , updateSection , deleteSection} = require("../controllers/Section")
const {createSubSection , updateSubSection , deleteSubSection} = require("../controllers/SubSection")
const {createTag , showAllTags} = require("../controllers/tags")
const {createCategory , showAllCategories , categoryPageDetails} = require("../controllers/Category")
const {auth , isInstructor , isAdmin} = require("../middlewares/auth")

//course routes
router.post("/createCourse" , auth , isInstructor , createCourse)
router.get("/getAllCourses" , showAllCourses)
router.post("/getCourseDetails" , getCourseDetails)

//section routes
router.post("/addSection" , auth , isInstructor , createSection)
router.put("/updateSection" , auth , isInstructor , updateSection)
router.delete("/deleteSection" , auth , isInstructor , deleteSection)

//sub-section routes
router.post("/addSubSection" , auth , isInstructor , createSubSection)
router.put("/updateSubSection" , auth , isInstructor , updateSubSection)
router.delete("/deleteSubSection" , auth , isInstructor , deleteSubSection)

//tag routes (admin only)
router.post("/createTag" , auth , isAdmin , createTag)
router.get("/showAllTags" , showAllTags)

//category routes
router.post("/createCategory" , auth , isAdmin , createCategory)
router.get("/showAllCategories" , showAllCategories)
router.post("/getCategoryPageDetails" , categoryPageDetails)

module.exports = router
