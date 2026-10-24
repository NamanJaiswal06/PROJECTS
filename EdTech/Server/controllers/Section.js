const Section = require("../models/Section")

const Course = require("../models/Course")



exports.createSection = async (req , res) =>{

    try{
            //data fetch 
            const {sectionName , courseId} = req.body;

            //data validatiuon 

            if(!sectionName || !courseId){
                return res.status(400).json({
                    success:false,
                    messsage:"Missing requirements"
                })
            }
            // create section 
            const newSection = await Section.create({sectionName})

            //update course with section object and populate section and subsection both

            const updatedCourseDetails = await Course.findByIdAndUpdate(courseId,{
                $push:{
                    courseContent:newSection._id
                }

            }, {new:true})
            .populate({
                path:"courseContent",
                populate:{
                    path:"subSection"
                }
            })
                          
            
            
            
                        //return response
                      return res.status(200).json({
                        success:true,
                        message:"Section Created Successfully",
                        updatedCourseDetails
                      })




    }catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Error in creation section please try again ",
            error:error.message
        })




    }
}

exports.updateSection = async (req , res) =>{
    try{
       const {sectionName , sectionId} = req.body

       if(!sectionName || !sectionId){
                return res.status(400).json({
                    success:false,
                    messsage:"Missing requirements"
                })
            }

            //fix: use findByIdAndUpdate instead of findByIdAndDelete
            const section = await Section.findByIdAndUpdate(
                sectionId,
                {sectionName},
                {new:true}
            )

                return res.status(200).json({
                    success:true,
                    message:"Section Updated Successfully",
                    data:section
                })




    }catch(error){
          console.log(error)
        return res.status(500).json({
            success:false,
            message:"Error in updating  section please try again ",
            error:error.message
        })



    }

}

exports.deleteSection = async (req, res) =>{

try{

    const {sectionId , courseId} = req.body

    if(!sectionId){
        return res.status(400).json({
            success:false,
            message:"please fill sectionId correctly"

        })
    }

    //remove section id from course as well
    await Course.findByIdAndUpdate(courseId,{
        $pull:{
            courseContent: sectionId
        }
    })

    await Section.findByIdAndDelete(sectionId);

    return res.status(200).json({
        success:true,
        message:"Section Deleted Successfully"
    })


}catch(error){
       console.log(error)
        return res.status(500).json({
            success:false,
            message:"Error in deleting  section please try again ",
            error:error.message
        })




}

}