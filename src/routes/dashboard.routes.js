import { Router } from 'express';
import {
    getChannelStats,
    getChannelVideos,
} from "../controllers/dashboard.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT);

router.route("/stats/:userId").get(getChannelStats);
router.route("/videos/:userId").get(getChannelVideos);

export default router