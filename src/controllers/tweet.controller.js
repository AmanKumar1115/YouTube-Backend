import mongoose from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "All fields are is required")
    }

    try {
        const tweet = await Tweet.create(
            {
                content: content,
                owner: req.user?._id,
            }
        )

        return res.status(201).json(new ApiResponse(200, tweet, "Tweet created successfully"))
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Error creating the tweet");
    }
})



const getUserTweets = asyncHandler(async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            throw new ApiError(401, "You need to log in to view your tweets");
        }

        const userTweets = await Tweet.find({ owner: userId });

        return res.status(200).json(new ApiResponse(200, userTweets, "User tweets fetched successfully"));
    } catch (error) {

        return res.status(error.statusCode || 500).json(new ApiResponse(error.statusCode || 500, {}, error.message));
    }
});


const updateTweet = asyncHandler(async (req, res) => {
    const tweetId = req.params.tweetId;
    const { content } = req.body;

    if (!tweetId || !content) {
        throw new ApiError(400, "Tweet ID and content required");
    }
    try {
        const tweet = await Tweet.findById(tweetId);

        if (!tweet) {
            throw new ApiError(404, "Tweet not found")
        }

        if (tweet.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to updated this tweet");
        }
        tweet.content = content;
        await tweet.save();

        return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully!!"))

    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Error updating tweet");
    }

});

const deleteTweet = asyncHandler(async (req, res) => {
    try {
        const tweetId = req.params.tweetId;

        if (!mongoose.Types.ObjectId.isValid(tweetId)) {
            throw new ApiError(400, "Invalid tweetId");
        }


        const tweet = await Tweet.findById(tweetId);

        if (!tweet) {
            throw new ApiError(404, "Tweet not found");
        }

        if (req.user?._id.toString() !== tweet.owner.toString()) {
            throw new ApiError(403, "Unauthorized: You are not the owner of this tweet");
        }

        const deletedTweet = await Tweet.findByIdAndDelete(tweetId);


        return res.status(200).json(new ApiResponse(200, {}, "Tweet deleted successfully"));
    } catch (error) {

        return res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message));
    }
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
}