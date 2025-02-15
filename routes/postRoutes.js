import express from "express";
import { adminGuard, authGuard } from "../middleware/authMiddleware.js";
import { uploadPicture } from "../middleware/uploadPictureMiddleware.js";
import { createPost, deletePost, getAllPosts, getPost, updatePost } from "../controllers/postController.js";

const router = express.Router();

router.route("/").post(authGuard, adminGuard, createPost).get(getAllPosts);
router.route("/:slug")
    .put(authGuard, adminGuard, uploadPicture.single("postPicture"), updatePost) // Tambahkan middleware upload
    .delete(authGuard, adminGuard, deletePost)
    .get(getPost);

export default router;
