import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCLoudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            // Since no file path return null
            return null;
        }
        // filepath is their ,so upload it to cloudinary  
        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" })
        //file has been uploaded successfully
        // console.log("file is uploaded on cloudinary :: ", response);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); //Remove the loaclly saved temporary file as the upload operation got failed
        return null;
    }
}
const deleteOnCloudinary = async (public_id, resource_type = "image") => {
    try {
        if (!public_id) return null;

        //delete file from cloudinary
        const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: `${resource_type}`
        });
    } catch (error) {
        console.log("delete on cloudinary failed", error);
        return error;
    }
};


export { uploadOnCLoudinary, deleteOnCloudinary }