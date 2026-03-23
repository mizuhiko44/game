import { RequestHandler, Router } from "express";
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

function wrapAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

router.post("/users/onboarding", wrapAsync(onboarding));
router.post("/users/login", wrapAsync(login));
router.post("/auth/login", wrapAsync(login));
router.post("/auth/refresh", wrapAsync(refreshAuthToken));
router.post("/auth/logout", wrapAsync(logout));

router.use(authMiddleware);
router.get("/auth/me", wrapAsync(getAuthMe));
router.get("/home", wrapAsync(getHome));
router.get("/events", wrapAsync(listEvents));
router.get("/events/:eventId", wrapAsync(getEventDetail));
router.get("/events/:eventId/participants", wrapAsync(listEventParticipants));
router.post("/votes", wrapAsync(createVote));
router.get("/votes/history", wrapAsync(voteHistory));
router.get("/results", wrapAsync(listResults));
router.get("/avatar", wrapAsync(getAvatar));
router.post("/avatar/level-up", wrapAsync(levelUpAvatar));
router.get("/me", wrapAsync(getMe));

router.use("/admin", adminMiddleware);
router.post("/admin/events", wrapAsync(createEvent));
router.get("/admin/users", wrapAsync(listRegisteredUsers));
router.get("/admin/metrics", wrapAsync(getAdminMetrics));
router.post("/admin/events/settle", wrapAsync(settleEvent));

export default router;
