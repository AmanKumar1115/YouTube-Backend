import mongoose from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    //channelId will userId of the person whose channel you want subscribe

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, 'Invalid channelId');
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })

    if (isSubscribed) {
        const toggleSubscriber = await Subscription.findByIdAndDelete(isSubscribed?._id);
        return res.status(200).json(new ApiResponse(200, toggleSubscriber, "Subscription toggled successfully!!"))
    }

    const createSubscriber = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })

    if (!createSubscriber) {
        throw new ApiError(400, "Falied to toggle subscribe");
    }

    return res.status(200).json(new ApiResponse(200, createSubscriber, "Subscription toggled successfully!!"))


})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid ChannelId");
    }

    const subscribers = await Subscription.find({
        channel: channelId
    })

    if (!subscribers) {
        throw new ApiError(400, "Falied to get subscribers")
    }

    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched successfully!!"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, 'Invalid subscriberId');
    }

    const channels = await Subscription.find({
        subscriber: subscriberId
    })

    if (!channels) {
        throw new ApiError(400, "Falied to get subscribers")
    }

    return res.status(200).json(new ApiResponse(200, channels, "Subscribers fetched successfully!!"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
