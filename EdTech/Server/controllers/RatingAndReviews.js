const RatingandReviews = require("../models/RatingandReviews")
const Course = require("../models/Course")


//create Rating
exports.createRating  = async (req , res) =>{
    try{
        //get user id

        const userId = req.user.id
        //fetch data form user body
        const {rating , review , couseId} = req.body
        //check if user is enrolled or not
        const courseDetails = await Course.findOne(
                                               {_id:couseId ,
                                                studentsEnrolled: {$elemMatch: { $eq: userId}},
                                               });
                            
           if (!courseDetails){
            return res.status(404).json({
                success:false,
                message:"User does not enrolled in course"
            })
           }                                    
        //check if already reviewed by user
        const alreadyReviewed = await RatingandReviews.findOne({
                                                            user:userId,
                                                            course:courseId,
        })

        //create rating and review 
        if(alreadyReviewed){
            return res.status(403).json({
                success:false,
                message:"user already reviewed this course"
            })


        }



        const ratingReview = await RatingandReviews.create({
            rating , review , course:courseId,  user:userId
        })
        //update course with this rating

        const updatedCouseDetails = await Course.findByIdAndUpdate({_id:courseId},
            {
                $push:{
                    ratingAndreviews: ratingReview._id,
                }
            },
            {new:true}
        )
        //return response

        return res.status(200).json({

            success:true,
            message:"Rating and review successfully ",
            ratingReview

        })



        

    }

    catch(err){

        return res.status(500).json({
            success:false,
            message:err.message,
        })



    }
}



//get Average Rating

exports.getAverageRating = async (req , res) => {

    try{
            //get courseId
            const courseId = req.body.courseId;


            //calculate Average Rating 
            const result = await RatingandReviews.aggregate([
                {
                    $match:{
                        course: new mongoose.Types.ObjectId(courseId),

                    },
                },

                {
                    $group:{
                        _id:null,
                        averageRating: { $avg: "$rating"}

                    }
                }
            ])

            //return rating
            if(result.length > 0){
                return res.status(200).json({
                    success:true,
                    averageRating: result[0].averageRating,

                })
            }
            //if no rating
            return res.status(200).json({
                success:true,
                message:"Average rating is 0 and no rating till now ",
                averageRating: 0,
            })


    }

    catch(err) {

        return res.status(500).json({
            success:false,
            message:err.message
        })
    }

}

//get all Rating 
exports.getAllRating  =  async(req, res) =>{

    try{

        const allReviews = (await RatingandReviews.find({})).sort({rating: "desc"})
                                                            .populate({
                                                                path:"user",
                                                                select:"firstName lastName email image",

                                                            })
                                                            .populate({
                                                                path:"course",
                                                                select:"courseName",
                                                            })
                                                            .exec();

        return res.status(200).json({
            success:true,
            message:"all reviews fetched",
            data:allReviews
        })





    }

    catch(err){

           return res.status(500).json({
            success:false,
            message:err.message
        })



    }
}