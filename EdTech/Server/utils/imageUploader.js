const Cloudinary = require("cloudinary").v2

Cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
})

exports.uploadImageToCloudinary = async (file , folder , height , quality)=>{

    const options = {folder};
    if(height){
        options.height  =height;
    }
    if(quality){
        options.quality = quality
    }
    options.resource_type = "auto";

    return await Cloudinary.uploader.upload(file.tempFilePath , options);


}