import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCLoudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }

}

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: "Message Sent Done!!",
    // })

    /* get user details from from fontend
    // validate : - not empty
    // check if user already exists: username ,email
    // check for images ,check avatar
    // upload them to cloudinary,avatar
    // create user object -- create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res */

    const { fullName, email, username, password } = req.body
    // console.log("password: " + password);
    // console.log("username: " + username);
    // console.log("fullName: " + fullName);
    // console.log("email: " + email);

    // if (fullName === "") {
    //     throw new ApiError(400, "fullName is required")
    // }

    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are is required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        // coverImageLocalPath = req.files.coverImage[0].files
        coverImageLocalPath = req.files.coverImage[0]?.files
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is requied")
    }

    const avatar = await uploadOnCLoudinary(avatarLocalPath)
    const coverImage = await uploadOnCLoudinary(coverImageLocalPath)
    let cover
    if (!avatar) {
        throw new ApiError(400, "Avatar file is requied")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something is wrong while registering the user")
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // secure cookies

    const { email, username, password } = req.body
    // console.log("UserLogin Email:: ", email);
    if (!username && !email) {
        throw new ApiError(400, "Login Error :: username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(400, "USer dose not exist!!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials !!")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const logggedInUser = await User.findById(user._id).select("--select --refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: logggedInUser, accessToken, refreshToken
        },
            "User logged in successfully"
        ))
})

const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(req.user._id, {
        $unset: {
            refreshToken: 1,
        }
    }, {
        new: true,
    })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(
        200, req.user, "User fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCLoudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uolaoding on avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("--password")

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image  file is missing")
    }

    const coverImage = await uploadOnCLoudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uolaoding on cover image file")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: coverImage.url
            }
        },
        { new: true }
    ).select("--password")

    return res.status(200).json(
        new ApiResponse(200, user, "Cover Image updated successfully")
    )

});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    // Extracts the 'username' parameter from the request
    const { username } = req.params;

    // Checks if the 'username' is not provided or is empty
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing");
    }

    // Uses MongoDB's aggregation framework to query the User collection
    const channel = await User.aggregate([
        {
            // Matches documents with the provided 'username' in a case-insensitive manner
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            // Performs a $lookup to get the subscribers of the channel
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            // Performs another $lookup to get the channels that the user is subscribed to
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            // Adds computed fields to the documents in the pipeline
            $addFields: {
                subscribersCount: {
                    // Calculates the size (number of elements) in the 'subscribers' array
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    // Calculates the size (number of elements) in the 'subscribedTo' array
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    // Checks if the current user is in the 'subscribers.subscriber' array
                    $cond: {
                        if: { $in: [req.user?._id, "subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            // Projects only the specified fields to the next stage in the pipeline
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    // Checks if the 'channel' array is empty, indicating that the channel does not exist
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist");
    }

    // Sends a JSON response with a success status code and the fetched channel information
    return res.status(200).json(new ApiResponse(200, channel[0], "User channel fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
    // Performs an aggregation query on the User collection
    const user = await User.aggregate([
        {
            // Matches documents with the provided user ID
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            // Performs a $lookup to get the videos from the 'watchHistory' array
            $lookup: {
                from: "Videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                // Inner pipeline for further operations on the 'Videos' collection
                pipeline: [
                    {
                        // Performs a $lookup to get information about the video owner from the 'Users' collection
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            // Inner pipeline to project specific fields from the 'Users' collection
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        // Adds a new field 'owner' by selecting the first element from the 'owner' array
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    // Returns a JSON response with the watch history fetched from the aggregation result
    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}
