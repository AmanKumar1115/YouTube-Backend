import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                },
                isLiked: 1
            },
        },
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});


const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body

    if (!content || !videoId) {
        throw new ApiError(500, "Both content and videoId are required");
    }

    const commentedBy = req.user?._id

    const comment = await Comment.create({
        content: content,
        video: videoId,
        owner: commentedBy
    })

    if (!comment) {
        throw new ApiError(500, "Comment not uploaded");
    }

    return res.status(200).json(new ApiResponse(200, comment, "Comment added successfully!!"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        return new ApiError(400, "Invalid CommentId ");
    }
    const { content } = req.body;
    if (!content) {
        throw new ApiError(400, "New Comment not found")
    }
    const oldComment = await Comment.findById(commentId)
    if (!oldComment) {
        throw new ApiError(404, "old comment not found")
    }

    if (oldComment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorised to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId,
        {
            $set: {
                content: content
            }
        },
        {
            new: true
        }
    )

    if (!updatedComment) {
        throw new ApiError(404, "old comment not found")
    }
    if (!updatedComment) {
        throw new ApiError(500, "Failed to updated the comment!!")
    }

    return res.status(200).json(new ApiResponse(200, updatedComment, "Comment Successfully Updated!!"));
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const comment = await Comment.findById(commentId);

    if (!comment || comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You are not authorized to delete this comment");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new ApiError(400, "Comment not deleted")
    }
    return res.status(200).json(new ApiResponse(200, deletedComment, "Comment deleted Successfully"))
})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}