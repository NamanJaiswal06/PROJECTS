const mongoose = require("mongoose")

const profileSchema = new mongoose.Schema({

    gender:{
        type:String,
       
        

    },
    dateofBirth:{
        type:String,
        

    },
    about:{
        type:String,
        trim:true,
    },
    contactNo:{
           type:Number,
        trim:true,

    },
    accountType:{
        type:String,
        enum:["Admin" , "Student" , "Instructor"],
        required:true,
    },
    



})

module.exports = mongoose.model("Profile" , profileSchema);