import mongoose from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !description) {
            throw new ApiError(400, "Name and Descriptions are required to create playlist");
        }

        const existingPlaylist = await Playlist.findOne({ name });

        if (existingPlaylist) {
            return res.status(400).json(new ApiResponse(400, null, "Playlist with this name already exists"));
        }

        const newPlaylist = await Playlist.create({
            name,
            description,
            videos: [], // Corrected variable name
            owner: req.user?._id
        });

        if (!newPlaylist) {
            throw new ApiError(500, "Failed to create the playlist");
        }

        return res.status(201).json(new ApiResponse(201, newPlaylist, "New Playlist created"));
    } catch (error) {
        return res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message || "Failed to create Playlist"));
    }
});


const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid userID");
    }

    const playlists = await Playlist.find({ owner: userId });

    if (!Array.isArray(playlists) || playlists.length === 0) {
        throw new ApiError(404, "Failed to fetch playlists for the user");
    }

    return res.status(200).json(new ApiResponse(200, playlists, "All playlists of the user fetched"));
});


const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid userID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Failed to fetch playlist for the user");
    }

    return res.status(200).json(new ApiResponse(200, playlist, "Playlists for the user fetched"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid PlaylistId or videoId")
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (playlist.videos.includes(videoId)) {
        return res.status(200).json(new ApiResponse(200, playlist, "Video already exists in the playlist"));
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $push: { videos: videoId } },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to add video to the playlist");
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added to the playlist successfully"));

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist
    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid playlistId or videoId");
    }

    // Check if the playlist exists
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check if the video exists in the playlist
    if (!playlist.videos.includes(videoId)) {
        return res.status(200).json(new ApiResponse(200, playlist, "Video not found in the playlist"));
    }

    // Use findByIdAndUpdate to remove the video from the playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Failed to remove video from the playlist");
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video removed from the playlist successfully"));

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistID");
    }

    const deletedPlaylist = await Playlist.findOneAndDelete({ _id: playlistId });

    if (!deletedPlaylist) {
        throw new ApiError(404, "Playlist not found or failed to delete");
    }

    return res.status(200).json(new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully"));
});


const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    // TODO: Update playlist
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist || playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You do not have permission to update this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: { name, description } },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found or failed to update");
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
});



export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}


