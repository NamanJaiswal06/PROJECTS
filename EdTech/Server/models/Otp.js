const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");
const otpTemplate = require("../mail/templates/emailVerificationTemplate");


const otpSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
    },

    otp:{
        type:String,
        required:true,
    },
    createdAt:{
        type:Date,
        default:Date.now,
        expires: 5*60,

    }


});

//pre middleware
async function sendVerificationEmail(email , otp){

    try{
        //use the email template for a polished html body
        const htmlBody = otpTemplate(otp);

        const mailResponse = await mailSender(
            email,
            "Verification Email from StudyNotion",
            htmlBody
        )
        console.log("Email sent successfully", mailResponse)

        




    }catch(err){

        console.log("error occured whiel sending mail " , err)
        throw err;
    }
}

otpSchema.pre("save", async function() {
    await sendVerificationEmail(this.email, this.otp);
})
 




module.exports = mongoose.model("OTP" , otpSchema);
