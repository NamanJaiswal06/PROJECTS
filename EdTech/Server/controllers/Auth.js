const User  = require("../models/User")
const OTP =  require("../models/Otp")
const otpGenerator = require("otp-generator")
const Profile = require("../models/Profile")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const mailSender = require("../utils/mailSender")
const passwordUpdateTemplate = require("../mail/templates/passwordUpdateTemplate")

require("dotenv").config();
//send otp 
exports.sendOtp = async (req , res)=>{
    try{
          const {email} = req.body;
    //check if user is already exist
    const checkUser = await User.findOne({email});

    if(checkUser){
        return res.status(401).json({
            success:false,
            message:"User already registered"
        })
    }
    //generate otp
    var otp = otpGenerator.generate(6 , {
        upperCaseAlphabets:false,
        lowerCaseAlphabets:false,
        specialChars:false,
    });
    console.log("Otp generated" , otp);
    //check unique otp or not
    let result = await OTP.findOne({otp: otp});

    while(result){
        otp = otpGenerator.generate(6 , {
        upperCaseAlphabets:false,
        lowerCaseAlphabets:false,
        specialChars:false,
    });

     result = await OTP.findOne({otp: otp});


    }

    const otpPayload = {email , otp};
    //create an entry in db
    const otpBody = await OTP.create(otpPayload);
    console.log(otpBody);

    //return response 
   return res.status(200).json({
        success:true,
        message:"OTP sent successfully",
        otp,
    })



    }catch(err){
        console.log(err)

        return res.status(500).json({
            success:false,
            message:err.message
        })


    }
  
}

//signUP

exports.signUp = async (req,res) =>{
    try{

        //data fetch from req body
        const {firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber,
            otp
        } = req.body;

        
        //validate the data

        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp ){
            return res.status(403).json({
                success:false,
                message:"All fields are required",
            })
        }


        //2 password match 

        if(password !== confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Password and ConfirmPassowrd values does not match, please try again"
            })
        }
        //check user already exist or not 
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({
                success:false,
                message:"User is already registered"

            })
        }


        //find most recent otp stored for the user
        const recentOtp = await OTP.find({email}).sort({createdAt:-1}).limit(1);
        console.log("recent otp" , recentOtp);


        //validate the otp

        if(recentOtp.length == 0){
            return res.status(400).json({
                success:false,
                message:'OTP not found'
            })
        }else if(otp !== recentOtp[0].otp ){
            return res.status(400).json({
                success:false,
                message:"Invalid OTP"
            })
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password , 10);




        //create entry

        const ProfileDetails = await Profile.create({
            gender:null,
            dateOfBirth:null,
            about:null,
            contactNumber:null
        })
        const user = await User.create({
            firstName,
            lastName,
            email,
            contactNumber,
            password:hashedPassword,
            accountType,
            additionalDetails:ProfileDetails._id,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        })

        //return res
       return res.status(200).json({
            success:true,
            message:"signed up successfully",
            user
        })


    }catch(err){
           console.log(err)

        return res.status(500).json({
            success:false,
            message:"user cannot be registered please try again"
        })


    }

}



//Login
exports.login = async (req , res)=>{
try{
    //get data from req body
const {email , password} = req.body

//validation of data
if(!email || !password){
    return res.status(403).json({
        success:false,
        message:"ALL fields are required please try again"
    })
     
}


//user check exist or not
const user = await User.findOne({email}).populate("additionalDetails")
if(!user){
    return res.status(401).json({
        success:false,
        message:"user not registered please sign up first"
    })
}

//generate JWT , after password match
if(await bcrypt.compare(password , user.password)){
    const payload = {
        email:user.email,
        id:user._id,
        accountType:user.accountType,

    }
    const token = jwt.sign(payload , process.env.JWT_SECRET ,{
        expiresIn:"2h"
    } )
    user.token = token;
    user.password = undefined;

    const options ={
        expires: new Date(Date.now() + 3*24*60*60*1000),
        httpOnly:true

    }

    //create cookie and send response
    res.cookie("token" , token , options).status(200).json({
        success:true,
        token,
        user,
        message:"logged in successfully"
    })


}
else{

    return res.status(401).json({
        success:false,
        message:"password is incorrect"
    })
}




}catch(err){
    console.log(err)
    return res.status(500).json({
        success:false,
        message:"login failure , please try again"
    })




}




}

//changePassword
exports.changePassword = async (req , res)=>{
    try{
        //get data from req body
        const {oldPassword , newPassword , confirmNewPassword} = req.body;

        //validation
        if(!oldPassword || !newPassword || !confirmNewPassword){
            return res.status(400).json({
                success:false,
                message:"All fields are required"
            })
        }

        //check new password and confirm password match
        if(newPassword !== confirmNewPassword){
            return res.status(400).json({
                success:false,
                message:"New password and confirm password do not match"
            })
        }

        //get user from db
        const userDetails = await User.findById(req.user.id);

        //validate old password
        const isPasswordMatch = await bcrypt.compare(oldPassword , userDetails.password);
        if(!isPasswordMatch){
            return res.status(401).json({
                success:false,
                message:"Old password is incorrect"
            })
        }

        //hash new password
        const encryptedPassword = await bcrypt.hash(newPassword , 10);

        //update password in db
        const updatedUserDetails = await User.findByIdAndUpdate(
            req.user.id,
            {password: encryptedPassword},
            {new:true}
        )

        //send notification email using template
        try{
            const emailBody = passwordUpdateTemplate(
                updatedUserDetails.email,
                `${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
            )
            await mailSender(
                updatedUserDetails.email,
                "Password Updated Successfully - StudyNotion",
                emailBody
            )
        }catch(emailErr){
            console.log("Error sending password update email" , emailErr)
        }

        //return response
        return res.status(200).json({
            success:true,
            message:"Password changed successfully"
        })


    }catch(err){
        console.log(err)
        return res.status(500).json({
            success:false,
            message:"something went wrong while changing password , please try again"
        })


    }
}