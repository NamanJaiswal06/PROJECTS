const mongoose = require("mongoose")

const ratingandreviewsSchema = new mongoose.Schema({

  user:{
    type:mongoose.Schema.Types.ObjectId,
    required:true,
    ref:"User",
  },
  review:{
    type:String,
    required:true,
  },
  



})

module.exports = mongoose.model("RatingAndReview" , ratingandreviewsSchema);