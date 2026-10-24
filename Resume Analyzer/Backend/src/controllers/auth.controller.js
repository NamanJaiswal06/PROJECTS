const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
require("dotenv").config()
const jwt = require("jsonwebtoken")
const blackListToken = require("../models/blacklist.model")

module.exports.registerUser = async (req , res) =>{
    try{
        const {username , email , password} = req.body;
        if(!username || !password || !email) {
            return res.status(400).json({
            success:false,
            message:"All fields are required"
        })
    }
    const isUser = await userModel.findOne({
        $or:[{email} , {username}]
    })

    if(isUser){
        return res.status(400).json({
            success:false,
            message:"User already exists"
        })
    }


const hash = await bcrypt.hash(password , 10)

const user = await userModel.create({
    username,
    email,
    password: hash
})

const token = jwt.sign(
    {id:user._id , username:user.username},
    process.env.JWT_SECRET,
    {expiresIn: "1d"}
)


res.cookie("token" , token)

return res.status(201).json({
    success:true,
    message:"User registered successfully",
    user:{
        id:user._id,
        username:user.username,
        email:user.email,
    }
})




    }catch(err){
        return res.status(500).json({
            success:false,
            message:err.message})
    }
}




module.exports.loginUser = async(req , res)=>{
 try{


    const {email , password} = req.body;

    const user = await userModel.findOne({email})

    if(!user){
        return res.status(400).json({
            success:false,
            message:"User not found"
        })
    }
    const isPasswordValid =await bcrypt.compare(password , user.password)
    if(!isPasswordValid){
        return res.status(400).json({
            success:false,
            message:"Invalid password"
        })
    }

    const token = jwt.sign(
        {id:user._id , username:user.username},
        process.env.JWT_SECRET,
        {expiresIn: "1d"}
    )


    res.cookie("token" , token)

    return res.status(200).json({
        success:true,
        message:"User logged in successfully",
        user:{
            id:user._id,
            username:user.username,
            email:user.email,
        }
    })

   

 }catch(err){
    return res.status(500).json({
        success:false,
        message:err.message
    })
    
 }   
}

module.exports.logoutUser = async(req , res)=>{
    try{
        const token = req.cookies.token;
        if(!token){
            return res.status(400).json({
                success:false,
                message:"User not logged in"
            })
    }

    await blackListToken.create({token})
    res.clearCookie("token")
    return res.status(200).json({
        success:true,
        message:"User logged out successfully"
    })
        
    }catch(err){
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}



module.exports.getUser = async(req , res)=>{
    try{
        const user = await userModel.findById(req.user.id)
        res.status(200).json({
            success:true,
            message:"User fetched successfully",
            user:{
                id:user._id,
                username:user.username,
                email:user.email,
            }
        })
      
    }catch(err){
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}