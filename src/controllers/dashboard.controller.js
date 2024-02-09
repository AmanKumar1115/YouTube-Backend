import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId || !mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, 'Invalid userId');
    }

    const data = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "likedBy",
                as: "likes"
            }
        },
        {
            $project: {
                _id: 1,
                username: 1,
                totalViews: { $sum: "$videos.views" },
                totalSubscribers: { $size: "$subscribers" },
                totalVideos: { $size: "$videos" },
                totalLikes: { $size: "$likes" }
            }
        }
    ]);

    if (data.length === 0) {
        throw new ApiError(404, "User not found");
    }

    const channelStats = data[0];

    return res.status(200).json(new ApiResponse(200, channelStats, "Data fetched Successfully!!"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId || !mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, 'Invalid userId');
    }

    const data = await Video.find({ owner: userId });

    if (!data) {
        throw new ApiError(400, "Failed to fetch all videos");
    }

    return res.status(200).json(new ApiResponse(200, data, "All videos of the channel fetched !!"));
});

export {
    getChannelStats,
    getChannelVideos
};
