import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params

        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "VidioId is required for liking");
        }


        const alreadyLiked = await Like.findOne({
            video: videoId,
            likedBy: req.user?._id
        });

        if (alreadyLiked) {
            const toggleLike = await Like.findByIdAndDelete(alreadyLiked._id)
            if (!toggleLike) {
                throw new ApiError(200, "Failed to toggle liked video")
            }
            return res.status(200).json(new ApiResponse(200, toggleLike, "Liked video toggled!!"))
        }

        const like = await Like.create({
            video: videoId,
            likedBy: req.user?._id
        })

        if (!like) {
            throw new ApiError(400, "Failed to add to the liked videos")
        }

        return res.status(200).json(new ApiResponse(200, like, "Video liked successfully!!"))

    } catch (error) {
        throw new ApiError(error.status, error.message || "Failed to like video")
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    try {
        const { commentId } = req.params

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            throw new ApiError(400, "VidioId is required for liking");
        }


        const alreadyLiked = await Like.findOne({
            comment: commentId,
            likedBy: req.user?._id
        });

        if (alreadyLiked) {
            const toggleLike = await Like.findByIdAndDelete(alreadyLiked._id)
            if (!toggleLike) {
                throw new ApiError(200, "Failed to toggle liked video")
            }
            return res.status(200).json(new ApiResponse(200, toggleLike, "Liked comment toggled!!"))
        }

        const like = await Like.create({
            comment: commentId,
            likedBy: req.user?._id
        })

        if (!like) {
            throw new ApiError(400, "Failed to add to the liked comment")
        }

        return res.status(200).json(new ApiResponse(200, like, "Comment liked successfully!!"))

    } catch (error) {
        throw new ApiError(error.status, error.message || "Failed to like Comment")
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on tweet
    try {
        const { tweetId } = req.params

        if (!mongoose.Types.ObjectId.isValid(tweetId)) {
            throw new ApiError(400, "VidioId is required for liking");
        }


        const alreadyLiked = await Like.findOne({
            tweet: tweetId,
            likedBy: req.user?._id
        });

        if (alreadyLiked) {
            const toggleLike = await Like.findByIdAndDelete(alreadyLiked._id)
            if (!toggleLike) {
                throw new ApiError(200, "Failed to toggle liked video")
            }
            return res.status(200).json(new ApiResponse(200, toggleLike, "Liked tweet toggled!!"))
        }

        const like = await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id
        })

        if (!like) {
            throw new ApiError(400, "Failed to add to the liked tweetId")
        }

        return res.status(200).json(new ApiResponse(200, like, "tweet liked successfully!!"))

    } catch (error) {
        throw new ApiError(error.status, error.message || "Failed to like tweet")
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideosAggegate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ]);

    return res.status(200)
        .json(new ApiResponse(200, likedVideosAggegate, "liked videos fetched successfully"));
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}