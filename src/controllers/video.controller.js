import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCLoudinary, deleteOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    //Constructing the aggregation pipeline
    const pipeline = [];

    //Matching stage for filtering based on the query
    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                ]
            }
        });
    }

    //Sorting the stages 
    if (sortBy && sortType) {
        const sortTypeValue = sortType.toLowerCase() === 'desc' ? -1 : 1;
        pipeline.push({
            $sort: {
                $sort: { [sortBy]: sortTypeValue },
            }
        });
    }

    //Pagination stage 
    const skip = (page - 1) * limit;
    pipeline.push({
        $skip: skip,
    });

    pipeline.push({
        $limit: parseInt(limit),
    })


    try {
        //Execute the aggregation pipeline
        const result = await Video.aggregate(pipeline);

        //Count ttotal documents (for pagination)
        const totalDocuments = await Video.countDocuments();

        //Return the results and additional information 
        return res.status(200).json(new ApiResponse(200, {
            videos: result,
            totalPages: Math.ceil(totalDocuments / limit),
            currentPage: parseInt(page),
            totalVideos: totalDocuments,
        }, "All videos has been fetched!!"))
    } catch (error) {
        return res.status(500).json(new ApiError(500, error.message || "Internal Server Error"));
    }


})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    try {
        // Validate required fields
        if ([title, description].some((field) => !field?.trim())) {
            throw new ApiError(400, "All fields are required");
        }

        // Check for the presence of videoFile and thumbnail
        const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
        const thumbnailFileLocalPath = req.files?.thumbnail?.[0]?.path;

        if (!videoFileLocalPath || !thumbnailFileLocalPath) {
            throw new ApiError(400, "Video file and thumbnail file are required");
        }

        // Upload files to Cloudinary
        const videoFile = await uploadOnCLoudinary(videoFileLocalPath);
        const thumbnailFile = await uploadOnCLoudinary(thumbnailFileLocalPath);

        // Validate file upload results
        if (!videoFile || !thumbnailFile) {
            throw new ApiError(400, "Video or thumbnail file not found");
        }

        // Create video entry in the database
        const video = await Video.create({
            videoFile: videoFile.url,
            thumbnail: thumbnailFile.url,
            title,
            description,
            duration: videoFile.duration,
            owner: req.user?._id,
            isPublished: true,
        });

        // Retrieve the uploaded video
        const uploadedVideo = await Video.findById(video._id);

        if (!uploadedVideo) {
            throw new ApiError(500, "Video upload failed, please try again");
        }

        return res.status(200).json(new ApiResponse(200, uploadedVideo, "Video uploaded successfully"));
    } catch (error) {
        return res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, "Failed to upload video"));
    }
});

const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, 'Invalid videoId');
        }

        // Find the video by ID and increment the views by 1
        const video = await Video.findOneAndUpdate(
            { _id: videoId },
            { $inc: { views: 1 } },
            { new: true, lean: true }
        );

        if (!video) {
            throw new ApiError(404, 'Video not found');
        }


        return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
    } catch (error) {
        return res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message));
    }
});

const updateVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body;
        const { videoId } = req.params;

        // Validate if videoId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Invalid videoId");
        }

        // Find the video by videoId
        const video = await Video.findById(videoId);

        // Check if the video exists and if the user owns the video
        if (!video || video.owner.toString() !== req.user?._id.toString()) {
            throw new ApiError(400, "You cannot update this video");
        }

        // Check for the presence of new thumbnail file
        const thumbnailFileLocalPath = req.file?.path

        if (!thumbnailFileLocalPath) {
            throw new ApiError(400, "Video file and thumbnail file are required");
        }

        const oldThumbNail = video.thumbnail;
        const thumbnail = await uploadOnCLoudinary(thumbnailFileLocalPath);

        const updatedVideo = await Video.findByIdAndUpdate(videoId,
            {
                $set: {
                    title,
                    description,
                    thumbnail: thumbnail.url,
                }
            },
            {
                new: true
            }
        );

        // Check if the video was successfully updated
        if (!updatedVideo) {
            throw new ApiError(500, "Failed to update video, please try again");
        }

        await deleteOnCloudinary(oldThumbNail);

        return res.status(200).json(new ApiResponse(200, updatedVideo, "Video successfully updated!!"))

    } catch (error) {
        console.error(error);
        throw new ApiError(500, error.message || "Falied to update video please try again");
    }


    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video not found");
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    // Check if the user making the request is the owner of the video
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    try {
        await deleteOnCloudinary(video.videoFile);
        await deleteOnCloudinary(video.thumbnail);

        const deletedVideo = await Video.findByIdAndDelete(videoId);

        if (!deletedVideo) {
            throw new ApiError(500, "Failed to delete video from the database");
        }

        return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Failed to delete video files");
    }
});


const togglePublishVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video not found");
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    // Check if the user making the request is the owner of the video
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    const toggleVideo = await Video.updateOne(
        { _id: videoId },
        { $set: { isPublished: !video.isPublished } }
    );

    if (!toggleVideo) {
        throw new ApiError(400, "Unable to toggle video")
    }

    // const videoToggleTest = await Video.findById(videoId);
    // let updatedObject = {
    //     toggleVideo: toggleVideo,
    //     videoToggleTest: videoToggleTest
    // }

    return res.status(200).json(new ApiResponse(200, toggleVideo, "Vedio toggled successfully!! "))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishVideo
}