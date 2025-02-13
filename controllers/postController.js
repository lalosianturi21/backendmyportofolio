import { uploadPicture, cloudinary } from "../middleware/uploadPictureMiddleware.js";
import Post from "../models/Post.js";
import { v4 as uuidv4 } from "uuid";
import Comment from "../models/Comment.js";

const createPost = async (req, res, next) => {
    try {
        const post = new Post({
            title: "sample title",
            caption: "sample caption",
            slug: uuidv4(),
            body: {
                type: "doc",
                content: [],
            },
            photo: "",
            user: req.user._id,
        });

        const createdPost = await post.save();
        return res.json(createdPost);
    } catch (error) {
        next(error);
    }
};

const updatePost = async (req, res, next) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug });

        if (!post) {
            return next(new Error("Post not found"));
        }

        const upload = uploadPicture.single("postPicture");

        upload(req, res, async function (err) {
            if (err) return next(new Error(`Upload error: ${err.message}`));

            const { title, caption, slug, body, categories } = JSON.parse(req.body.document);

            post.title = title || post.title;
            post.caption = caption || post.caption;
            post.slug = slug || post.slug;
            post.body = body || post.body;
            post.categories = categories || post.categories;

            // Hapus gambar lama dari Cloudinary jika ada gambar baru diunggah
            if (req.file) {
                if (post.photo) {
                    const publicId = post.photo.split("/").pop().split(".")[0];
                    await cloudinary.uploader.destroy(`post_images/${publicId}`);
                }
                post.photo = req.file.path; // URL dari Cloudinary
            }

            const updatedPost = await post.save();
            return res.json(updatedPost);
        });
    } catch (error) {
        next(error);
    }
};

const deletePost = async (req, res, next) => {
    try {
        const post = await Post.findOneAndDelete({ slug: req.params.slug });

        if (!post) {
            return next(new Error("Post not found"));
        }

        // Hapus gambar dari Cloudinary jika ada
        if (post.photo) {
            const publicId = post.photo.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`post_images/${publicId}`);
        }

        await Comment.deleteMany({ post: post._id });

        return res.json({ message: "Post successfully deleted" });
    } catch (error) {
        next(error);
    }
};

const getPost = async (req, res, next) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).populate([
            { path: "user", select: ["avatar", "name"] },
            { path: "categories", select: ["title"] },
            {
                path: "comments",
                match: { check: true, parent: null },
                populate: [
                    { path: "user", select: ["avatar", "name"] },
                    {
                        path: "replies",
                        match: { check: true },
                        populate: [{ path: "user", select: ["avatar", "name"] }],
                    },
                ],
            },
        ]);

        if (!post) return next(new Error("Post not found"));

        return res.json(post);
    } catch (error) {
        next(error);
    }
};

const getAllPosts = async (req, res, next) => {
    try {
        const filter = req.query.searchKeyword;
        const categories = req.query.categories ? req.query.categories.split(",") : [];

        let where = {};
        if (filter) where.title = { $regex: filter, $options: "i" };
        if (categories.length > 0) where.categories = { $in: categories };

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * pageSize;
        const total = await Post.find(where).countDocuments();
        const pages = Math.ceil(total / pageSize);

        res.header({
            "x-filter": filter,
            "x-totalcount": JSON.stringify(total),
            "x-currentpage": JSON.stringify(page),
            "x-pagesize": JSON.stringify(pageSize),
            "x-totalpagecount": JSON.stringify(pages),
        });

        if (page > pages) return res.json([]);

        const result = await Post.find(where)
            .skip(skip)
            .limit(pageSize)
            .populate([{ path: "user", select: ["avatar", "name", "verified"] }, { path: "categories", select: ["title"] }])
            .sort({ updatedAt: "desc" });

        return res.json(result);
    } catch (error) {
        next(error);
    }
};

export { createPost, updatePost, deletePost, getPost, getAllPosts };
