const mongoose = require("mongoose")


const blackListTokenSchema = new mongoose.Schema({
    token:{
        type:String,
        required:[true , "token is required"]
    }
},{
    timestamps: true
})

const blackListTokenModel = mongoose.model("blackListToken" , blackListTokenSchema)

module.exports = blackListTokenModel