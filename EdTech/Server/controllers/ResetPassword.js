const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const bcrypt = require("bcrypt")
const crypto = require("crypto")

//resetPasswordToken
exports.resetPasswordToken = async (req , res)=>{
try{
      //get email from req body
    const email = req.body.email
    //check user for this email , email validation 
    const user = await User.findOne({email:email});
    if(!user){
        return res.status(402).json({
            success:false,
            message:"your email is not registered with us"

        })
    }
    //generate token 
    const token = crypto.randomUUID();
    //update user by adding token and expiration time 
    const updatedDetails = await User.findOneAndUpdate({email:email} ,{
        token: token,
        resetPasswordExpires: Date.now() + 5*60*1000
    }, {new:true} )
    //create url
        const url = `http://localhost:3000/update-password/${token}` //frontend ui link 

    //send mail containingthe url
    await mailSender(
        email,
        "Reset Password Link",
        `<p>Your password reset link is: <a href="${url}">${url}</a></p>
         <p>This link is valid for 5 minutes only.</p>`
    );
    //return response
    return res.json({
        success:true,
        message:"Email Sent successfully please see email and change pwd"
    })

   




}




catch(err){
    console.log(err);
    return res.status(500).json({
        success:false,
        message:"something went wrong while sending reset pwd mail "
    })




}
}
  



//reset Password


exports.restPassword = async (req , res) =>{

try{
        //data fetch 
    const {password , confirmPassword , token} = req.body; //yeh teeno chize frontend se aayi hai
   

    //validation
    if(password !== confirmPassword){
        return res.json({
            success:false,
            message:"password not matching"
        })
    }
    //get userdetails from db using token
    const userDetails = await User.findOne({token:token});

    if(!userDetails){
        return res.json({
            success:false,
            message:"token invalid"
        })
    }
    
    //token time check 
    if(userDetails.resetPasswordExpires < Date.now()){
        return res.json({
            success:false,
            message:"token expired please regenerate your token"
        })

    }
    //hash password
    const hashPassword = await bcrypt.hash(password , 10)
    //upate password - fix typo: toekn -> token
    await User.findOneAndUpdate(
        {token:token} , {password:hashPassword} , {new:true},
    )
    //return response

    return res.status(200).json({
        success:true,
        message:"password reset successfull"
    })




}catch(err){
      console.log(err);
    return res.status(500).json({
        success:false,
        message:"something went wrong while sending reset pwd mail "
    })
    




}
}
