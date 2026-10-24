const Category = require("../models/Category")

//create category handler function

exports.createCategory = async (req , res)=>{
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
            const categoryDetails = await Category.create({
                name:name,
                description:description,
            })
            console.log(categoryDetails)

            return res.status(200).json({
                success:true,
                message:"Category Created Successfully"
            })



    }catch(err){
        return res.status(500).json({
            success:false,
            message:err.message
        })




    }
}


//get All categories
exports.showAllCategories = async (req , res)=>{

    try{
        const allCategories = await Category.find({} , {name:true , description:true})
       return  res.status(200).json({
            success:true,
            message:"All Categories fetched successfully",
            data:allCategories
        })




    }catch(err){

        return res.status(500).json({
            success:false,
            message:err.message,
        })




    }
}

//get category page details (all courses under a category)
exports.categoryPageDetails = async (req , res)=>{

    try{
        //get category id
        const {categoryId} = req.body;

        if(!categoryId){
            return res.status(400).json({
                success:false,
                message:"Please provide a valid categoryId"
            })
        }

        //get courses for the specified category
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path:"courses",
                populate:{
                    path:"instructor"
                }
            })
            .exec();

        if(!selectedCategory){
            return res.status(404).json({
                success:false,
                message:"Category not found"
            })
        }

        //get courses for other categories (for recommendations)
        const differentCategories = await Category.find({
            _id:{ $ne: categoryId }
        })
        .populate("courses")
        .exec();

        //return response
        return res.status(200).json({
            success:true,
            message:"Category page data fetched successfully",
            data:{
                selectedCategory,
                differentCategories,
            }
        })


    }catch(err){
        console.log(err)
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}
