import { Router } from "express";
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
} from "../controllers/comment.controller.js"

import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();


router.route("/:videoId").get(getVideoComments)

router.route("/:videoId").post(verifyJWT, addComment);
router.route("/c/:commentId").delete(verifyJWT, deleteComment).patch(verifyJWT, updateComment);

export default router;