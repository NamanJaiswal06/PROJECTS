const  Tag = require("../models/tags")

//create tag ka handler function 

exports.createTag = async (req , res)=>{
    try{
            //fetch data
            const {name , description} = req.body;

            if(!name || !description){

                return res.status(400).json({
                    success:false,
                    message:"All fields are required"
                })
            }

            //create entry in db
            const tagdata = await Tag.create({
                name:name,
                description:description,
            })
            console.log(tagdata)

            return res.status(200).json({
                success:true,
                message:"Tag Created Successfully"
            })



    }catch(err){
        return res.status(500).json({
            success:false,
            message:err.message
        })




    }
}


//get All tags 
exports.showAllTags = async (req , res)=>{

    try{
        const alltags = await Tag.find({},{name:true , description:true})
       return  res.status(200).json({
            success:true,
            message:"All tags fetched successfully",
            alltags
        })




    }catch(err){

        return res.status(500).json({
            success:false,
            message:err.message,
        })




    }
}

