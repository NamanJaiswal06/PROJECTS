const Profile = require("../models/Profile")
const User = require("../models/User")
const Course = require("../models/Course")

exports.updateprofile = async (req , res) =>{


    
    try{
        //get data
        const {dateOfBirth="" , about="" , contactNumber , gender}= req.body;

        //get user id
        const id = req.user.id
        //verification 
        if(!contactNumber || !gender || !id){
            return res.status(400).json({
                    success:false,
                    message:"All fields are required"


            });

        }
        //find profile
        const userDetails = await User.findById(id);
        const profileId = userDetails.additionalDetails
        const profileDetails = await Profile.findById(profileId)
        //update profile 

        profileDetails.dateofBirth = dateOfBirth;
        profileDetails.about = about;
        profileDetails.gender = gender;
        profileDetails.contactNo = contactNumber;
        await profileDetails.save();
        //return response 
        return res.status(200).json({
                success:true,
                message:"Profile Updated Successfully",
                profileDetails,

        })



    }catch(err){
        return res.status(500).json({
            success:false,
            message:"Error while updating Profile"
        })


    }


}

//delete account function

exports.deleteAccount = async (req , res) =>{
    try{
        const id = req.user.id
        const userdetails = await User.findById(id);

        if(!userdetails){
            return res.status(400).json({
                success:false,
                message:"User Not Found",
            })
        }

        //unenroll user from all enrolled courses
        for(const courseId of userdetails.courses){
            await Course.findByIdAndUpdate(courseId,{
                $pull:{
                    studentsEnrolled: id
                }
            })
        }

        await Profile.findByIdAndDelete({_id:userdetails.additionalDetails});
        await User.findByIdAndDelete({_id:id});
    

        return res.status(200).json({

            success:true,
            message:"User Deleted Successfully"

        })




    }catch(error){

         return res.status(500).json({
            success:false,
            message:"Error while deleting Profile"
        })




    }


}

exports.getAllUserDetails = async (req , res)=>{


    try{
          const id  = req.user.id

            const userdetails = await User.findById(id).populate("additionalDetails").exec()

             if(!userdetails){
            return res.status(400).json({
                success:false,
                message:"User Not Found",
            })
        }

        return res.status(200).json({
            success:true,
            message:"Data fetched Successfully",
            userdetails


        })




    }catch(error){


        return res.status(500).json({

            success:false,
            message:error.message
        })
    }
          

}




    
