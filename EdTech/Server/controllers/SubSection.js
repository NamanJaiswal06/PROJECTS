const SubSection = require("../models/SubSection")
const Section = require("../models/Section")
const {uploadImageToCloudinary} = require("../utils/imageUploader")
require("dotenv").config()


exports.createSubSection = async (req , res) =>{


    try{
        //fetch data from req body
        const {sectionId , title , timeDuration ,description} = req.body;
        //exttract file/video

        const video = req.files.videoFile;
        //validation
        if(!sectionId || !title || !timeDuration || !description || !video){

            return res.status(400).json({
                success:false,
                message:"all fields are required"
            })
        }
        //upload video to cloudinary 
        const uploadDetails = await uploadImageToCloudinary(video , process.env.FOLDER_NAME);

        //create a subsection 

        const subSectionDetails = await SubSection.create({
            title:title,
            timeDuration:timeDuration,
            description:description,
            videoUrl:uploadDetails.secure_url 
        })

        //update section with this subsection and populate
        const updatedSection = await Section.findByIdAndUpdate({_id:sectionId},
            {$push:{
                subSection:subSectionDetails._id
            }},
            {new:true}
        ).populate("subSection")
        
        console.log("updated section->" , updatedSection)

        //return response 
        return res.status(200).json({
            success:true,
            message:"Sub Section Created Successfully",
            updatedSection
        })




    }catch(error){
        return res.status(500).json({
            success:false, 
            message:"Error in creating subsection",
            error:error.message
        })




    }
}

//update subsection
exports.updateSubSection = async (req , res) =>{

    try{
        //fetch data
        const {subSectionId , title , timeDuration , description} = req.body;

        //validation
        if(!subSectionId){
            return res.status(400).json({
                success:false,
                message:"SubSection Id is required"
            })
        }

        const subSection = await SubSection.findById(subSectionId);

        if(!subSection){
            return res.status(404).json({
                success:false,
                message:"SubSection not found"
            })
        }

        //update fields if provided
        if(title !== undefined){
            subSection.title = title;
        }
        if(timeDuration !== undefined){
            subSection.timeDuration = timeDuration;
        }
        if(description !== undefined){
            subSection.description = description;
        }

        //update video if provided
        if(req.files && req.files.videoFile !== undefined){
            const video = req.files.videoFile;
            const uploadDetails = await uploadImageToCloudinary(video , process.env.FOLDER_NAME);
            subSection.videoUrl = uploadDetails.secure_url;
        }

        await subSection.save();

        return res.status(200).json({
            success:true,
            message:"SubSection Updated Successfully",
            data:subSection
        })


    }catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Error in updating subsection please try again",
            error:error.message
        })
    }
}

//delete subsection
exports.deleteSubSection = async (req , res) =>{

    try{
        const {subSectionId , sectionId} = req.body;

        if(!subSectionId || !sectionId){
            return res.status(400).json({
                success:false,
                message:"SubSection Id and Section Id are required"
            })
        }

        //remove subsection reference from section
        await Section.findByIdAndUpdate(sectionId,{
            $pull:{
                subSection:subSectionId
            }
        })

        await SubSection.findByIdAndDelete(subSectionId);

        return res.status(200).json({
            success:true,
            message:"SubSection Deleted Successfully"
        })


    }catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Error in deleting subsection please try again",
            error:error.message
        })
    }
}