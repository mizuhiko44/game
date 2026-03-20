import { Router } from "express";
import { adminMiddleware, authMiddleware } from "../middlewares/auth";
import { logout, getAuthMe, refreshAuthToken } from "../modules/auth/auth.controller";
import { getAdminMetrics, settleEvent } from "../modules/admin/admin.controller";
import { getAvatar, levelUpAvatar } from "../modules/avatar/avatar.controller";
import { createEvent, getEventDetail, listEventParticipants, listEvents } from "../modules/events/events.controller";
import { getHome } from "../modules/home/home.controller";
import { getMe } from "../modules/me/me.controller";
import { listResults } from "../modules/results/results.controller";
import { listRegisteredUsers, login, onboarding } from "../modules/users/users.controller";
import { createVote, voteHistory } from "../modules/votes/votes.controller";

const router = Router();

router.post("/users/onboarding", onboarding);
router.post("/users/login", login);
router.post("/auth/login", login);
router.post("/auth/refresh", refreshAuthToken);
router.post("/auth/logout", logout);

router.use(authMiddleware);
router.get("/auth/me", getAuthMe);
router.get("/home", getHome);
router.get("/events", listEvents);
router.get("/events/:eventId", getEventDetail);
router.get("/events/:eventId/participants", listEventParticipants);
router.post("/votes", createVote);
router.get("/votes/history", voteHistory);
router.get("/results", listResults);
router.get("/avatar", getAvatar);
router.post("/avatar/level-up", levelUpAvatar);
router.get("/me", getMe);

router.use("/admin", adminMiddleware);
router.post("/admin/events", createEvent);
router.get("/admin/users", listRegisteredUsers);
router.get("/admin/metrics", getAdminMetrics);
router.post("/admin/events/settle", settleEvent);

export default router;
