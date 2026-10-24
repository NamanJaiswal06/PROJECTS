const mongoose = require("mongoose");
require("dotenv").config();


module.exports.connecttoDb = async ()=>{
 try{  await mongoose.connect(process.env.MONGODB_URL)
    console.log("Database connected");

 }catch(err){
    console.log(err.message)
    process.exit(1);
 }

}