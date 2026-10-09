import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/chat", protect, (req, res) => {

  res.json({
    message: "Chat API working",
    userId: req.userId
  });

});

export default router;