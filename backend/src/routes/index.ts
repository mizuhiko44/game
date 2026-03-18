import { Router } from "express";
import { listRegisteredUsers, login, onboarding } from "../modules/users/users.controller";
import { getHome } from "../modules/home/home.controller";
import { createEvent, getEventDetail, listEventParticipants, listEvents } from "../modules/events/events.controller";
import { createVote, voteHistory } from "../modules/votes/votes.controller";
import { listResults } from "../modules/results/results.controller";
import { getAvatar, levelUpAvatar } from "../modules/avatar/avatar.controller";
import { getMe } from "../modules/me/me.controller";
import { settleEvent } from "../modules/admin/admin.controller";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.post("/users/onboarding", onboarding);
router.post("/users/login", login);

router.use(authMiddleware);
router.get("/home", getHome);
router.get("/events", listEvents);
router.post("/admin/events", createEvent);
router.get("/admin/users", listRegisteredUsers);
router.get("/events/:eventId", getEventDetail);
router.get("/events/:eventId/participants", listEventParticipants);
router.post("/votes", createVote);
router.get("/votes/history", voteHistory);
router.get("/results", listResults);
router.get("/avatar", getAvatar);
router.post("/avatar/level-up", levelUpAvatar);
router.get("/me", getMe);

router.post("/admin/events/settle", settleEvent);

export default router;
