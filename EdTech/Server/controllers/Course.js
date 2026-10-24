const Course = require("../models/Course")
const Tag = require("../models/tags")
const User = require("../models/User")
const {uploadImageToCloudinary} = require("../utils/imageUploader")

//createCourse handler function

exports.createCourse = async (req , res)=>{
    try{
        //fetch data
        const {courseName , courseDescription , whatyouwilllearn , price , tag} = req.body;

        //get thumbnail
        const thumbnail = req.files.thumbnail

        //validation

        if(!courseName || !courseDescription || !whatyouwilllearn || !price || !tag || !thumbnail){
            return res.status(400).json({
                success:false,
                message:"All fields are required "
            })
        }

        //check for instructor why?-> instructor ka object id ke liye taki wo object id store kr paye 
        const userId = req.user.id;
        const instructorDetails = await User.findById(userId);
        console.log("instructor details->" , instructorDetails);

        //verify that userID and instructordetails._id are same or different
        if(!instructorDetails || instructorDetails._id.toString() !== userId){
            return res.status(404).json({
                success:false,
                message:"Instructor details not found"
            })
        }

        //check given tag is valid or not
        const tagDetails = await Tag.findById(tag);
        if(!tagDetails){
             return res.status(404).json({
                success:false,
                message:"Tag details not found"
            })

        }


        //upload image to cloudinary

    const thumbnailimage  = await uploadImageToCloudinary(thumbnail,process.env.FOLDER_NAME)

    //create an entry for new course 
    const newCourse = await  Course.create({
        courseName,
        courseDescription,
        instructor:instructorDetails._id,
        whatyouwilllearn:whatyouwilllearn,
        price,
        tag:tagDetails._id,
        thumbnail:thumbnailimage.secure_url,

    })

    //add the new course to the user schema of instructor
    await User.findByIdAndUpdate(
        {_id:instructorDetails._id},
        {$push:{
            courses: newCourse._id
        }},
        {new:true}
    )


    //update the tag schema with this new course
    await Tag.findByIdAndUpdate(
        {_id:tagDetails._id},
        {$push:{
            course: newCourse._id
        }},
        {new:true}
    )


    //return response

    return res.status(200).json({
        success:true,
        message:"Course created Successfully",
        data:newCourse

    })

    }catch(err){
        console.error(err)
        return res.status(500).json({
            success:false,
            message:"failed to created Course",
            error:err.message



        })



    }
}

//get all courses

exports.showAllCourses = async (req , res) =>{

    try{
        const allCourses = await Course.find({} , {courseName:true,
            price:true, thumbnail:true, instructor:true,
            ratingAndreviews:true,
            studentsEnrolled:true,
        }).populate("instructor")
            .exec();


            return res.status(200).json({
                success:true,
                message:"Data fetched for all courses successfully ",
                data:allCourses
            })

    }

    catch(err){
         console.error(err)
        return res.status(500).json({
            success:false,
            message:"cannot fetch course data",
            error:err.message


        })


    }
}

//get course details by id
exports.getCourseDetails = async (req , res) =>{

    try{
        const {courseId} = req.body;

        if(!courseId){
            return res.status(400).json({
                success:false,
                message:"Please provide a valid courseId"
            })
        }

        const courseDetails = await Course.findById(courseId)
            .populate({
                path:"instructor",
                populate:{
                    path:"additionalDetails"
                }
            })
            .populate("category")
            .populate("ratingAndreviews")
            .populate({
                path:"courseContent",
                populate:{
                    path:"subSection"
                }
            })
            .exec();

        if(!courseDetails){
            return res.status(400).json({
                success:false,
                message:`Could not find the course with id ${courseId}`
            })
        }

        return res.status(200).json({
            success:true,
            message:"Course details fetched successfully",
            data:courseDetails
        })


    }catch(err){
        console.error(err)
        return res.status(500).json({
            success:false,
            message:"something went wrong while fetching course details",
            error:err.message
        })
    }
}