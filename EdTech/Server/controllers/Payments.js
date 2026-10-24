const {instance} = require("../config/razorpay")
const Course = require("../models/Course");
const User  = require("../models/User");
const mailSender = require("../utils/mailSender");
const courseEnrollmentTemplate = require("../mail/templates/courseEnrollmentTemplate")
const crypto = require("crypto")

//capture the payment and initiate the razorpay order
exports.capturePayment = async (req , res) =>{

    try{
        //get courseId and userId
        const {courseId} = req.body;
        const userId = req.user.id;

        //validation
        if(!courseId){
            return res.status(400).json({
                success:false,
                message:"Please provide valid course Id"
            })
        }

        //valid courseId - check course details
        let course;
        try{
            course = await Course.findById(courseId);
            if(!course){
                return res.status(404).json({
                    success:false,
                    message:"Could not find the course"
                })
            }

            //check if user is already enrolled in the course
            const uid = new mongoose.Types.ObjectId(userId);
            if(course.studentsEnrolled.includes(uid)){
                return res.status(400).json({
                    success:false,
                    message:"Student is already enrolled"
                })
            }

        }catch(err){
            console.log(err)
            return res.status(500).json({
                success:false,
                message:err.message
            })
        }

        //create order
        const amount = course.price;
        const currency = "INR";

        const options = {
            amount: amount * 100, //in paise
            currency,
            receipt: Math.random(Date.now()).toString(),
            notes:{
                courseId: courseId,
                userId: userId,
            }
        }

        try{
            //initiate payment using razorpay
            const paymentResponse = await instance.orders.create(options);
            console.log(paymentResponse)

            //return response
            return res.status(200).json({
                success:true,
                courseName: course.courseName,
                courseDescription: course.courseDescription,
                thumbnail: course.thumbnail,
                orderId: paymentResponse.id,
                currency: paymentResponse.currency,
                amount: paymentResponse.amount,
            })

        }catch(err){
            console.log(err)
            return res.status(500).json({
                success:false,
                message:"Could not initiate order"
            })
        }


    }catch(err){
        console.log(err)
        return res.status(500).json({
            success:false,
            message:"something went wrong while processing payment"
        })
    }
}

//verify the payment signature
exports.verifySignature = async (req , res) =>{

    try{
        const webhookSecret = "12345678"; //this should match your razorpay webhook secret

        const signature = req.headers["x-razorpay-signature"];

        const shasum = crypto.createHmac("sha256" , webhookSecret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest("hex");

        console.log("signature->" , signature)
        console.log("digest->" , digest)

        if(signature === digest){
            console.log("Payment is authorised")

            //fulfill the action 
            const {courseId , userId} = req.body.payload.payment.entity.notes;

            try{
                //find course and enroll the student in it
                const enrolledCourse = await Course.findOneAndUpdate(
                    {_id:courseId},
                    {$push:{studentsEnrolled: userId}},
                    {new:true}
                )

                if(!enrolledCourse){
                    return res.status(500).json({
                        success:false,
                        message:"Course not found"
                    })
                }
                console.log("enrolled course->" , enrolledCourse)

                //find student and add course to their enrolled list
                const enrolledStudent = await User.findOneAndUpdate(
                    {_id:userId},
                    {$push:{courses: courseId}},
                    {new:true}
                )
                console.log("enrolled student->" , enrolledStudent)

                //send confirmation email using template
                const emailBody = courseEnrollmentTemplate(
                    enrolledCourse.courseName,
                    `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
                )
                const mailResponse = await mailSender(
                    enrolledStudent.email,
                    `Successfully Enrolled into ${enrolledCourse.courseName}`,
                    emailBody
                )
                console.log("mail sent successfully->" , mailResponse)

                return res.status(200).json({
                    success:true,
                    message:"Payment Verified and course enrollment successful"
                })

            }catch(err){
                console.log(err)
                return res.status(500).json({
                    success:false,
                    message:err.message,
                })
            }

        }else{
            return res.status(400).json({
                success:false,
                message:"Invalid request"
            })
        }


    }catch(err){
        console.log(err)
        return res.status(500).json({
            success:false,
            message:"something went wrong while verifying payment signature"
        })
    }
}
