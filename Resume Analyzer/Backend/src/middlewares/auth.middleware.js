const jwt = require("jsonwebtoken")
const blackListToken = require("../models/blacklist.model")
require("dotenv").config();


module.exports.authUser = async(req , res , next)=>{
    try{

        const token = req.cookies.token
        if(!token){
            return res.status(401).json({
                success:false,
                message:"User not logged in"
            })
        }

        const isBlackListedToken =await blackListToken.findOne({token:token})
        if(isBlackListedToken){
            return res.status(401).json({
                success:false,
                message:"Invalid token"
            })
        }
        try{
       const decoded= jwt.verify(token , process.env.JWT_SECRET )

       req.user = decoded

       console.log(req.user)
        next()
        }catch(err){
            return res.status(401).json({
                success:false,
                message:"Invalid token"
            })
        }
        
    }catch(err){
        return res.status(500).json({
            success:false,
            message:err.message
        })
        
    }
}



