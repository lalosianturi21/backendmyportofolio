import { uploadPicture } from "../middleware/uploadPictureMiddleware.js";
import { cloudinary } from "../middleware/uploadPictureMiddleware.js";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { fileRemover } from "../utils/fileRemover.js";

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // check whether the user exists or not
    let user = await User.findOne({ email });

    if (user) {
      throw new Error("User have already registered");
    }

    // creating a new user
    user = await User.create({
      name,
      email,
      password,
    });

    return res.status(201).json({
      _id: user._id,
      avatar: user.avatar,
      name: user.name,
      email: user.email,
      verified: user.verified,
      admin: user.admin,
      token: await user.generateJWT(),
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      throw new Error("Email not found");
    }

    if (await user.comparePassword(password)) {
      return res.status(201).json({
        _id: user._id,
        avatar: user.avatar,
        name: user.name,
        email: user.email,
        verified: user.verified,
        admin: user.admin,
        token: await user.generateJWT(),
      });
    } else {
      throw new Error("Invalid email or password");
    }
  } catch (error) {
    next(error);
  }
};

const userProfile = async (req, res, next) => {
  try {
    let user = await User.findById(req.user._id);

    if (user) {
      return res.status(201).json({
        _id: user._id,
        avatar: user.avatar,
        name: user.name,
        email: user.email,
        verified: user.verified,
        admin: user.admin,
      });
    } else {
      let error = new Error("User not found");
      error.statusCode = 404;
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userIdToUpdate = req.params.userId;

    let userId = req.user._id;

    if (!req.user.admin && userId !== userIdToUpdate) {
      let error = new Error("Forbidden resource");
      error.statusCode = 403;
      throw error;
    }

    let user = await User.findById(userIdToUpdate);

    if (!user) {
      throw new Error("User not found");
    }

    if (typeof req.body.admin !== "undefined" && req.user.admin) {
      user.admin = req.body.admin;
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password && req.body.password.length < 6) {
      throw new Error("Password length must be at least 6 character");
    } else if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUserProfile = await user.save();

    res.json({
      _id: updatedUserProfile._id,
      avatar: updatedUserProfile.avatar,
      name: updatedUserProfile.name,
      email: updatedUserProfile.email,
      verified: updatedUserProfile.verified,
      admin: updatedUserProfile.admin,
      token: await updatedUserProfile.generateJWT(),
    });
  } catch (error) {
    next(error);
  }
};
const updateProfilePicture = async (req, res, next) => {
  try {
    const upload = uploadPicture.single("profilePicture");

    upload(req, res, async function (err) {
      if (err) {
        const error = new Error("An error occurred while uploading: " + err.message);
        return next(error);
      }

      let updatedUser = await User.findById(req.user._id);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Jika pengguna ingin menghapus foto profil tanpa menggantinya
      if (req.body.removeAvatar === "true") {
        if (updatedUser.avatar) {
          const publicId = updatedUser.avatar.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`post_images/${publicId}`);
        }

        updatedUser.avatar = ""; // Hapus avatar dari database
        await updatedUser.save();

        return res.json({
          _id: updatedUser._id,
          avatar: updatedUser.avatar,
          name: updatedUser.name,
          email: updatedUser.email,
          verified: updatedUser.verified,
          admin: updatedUser.admin,
          token: await updatedUser.generateJWT(),
        });
      }

      // Jika ada file baru yang diunggah, hapus gambar lama
      if (req.file) {
        if (updatedUser.avatar) {
          const publicId = updatedUser.avatar.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`post_images/${publicId}`);
        }

        updatedUser.avatar = req.file.path;
        await updatedUser.save();

        return res.json({
          _id: updatedUser._id,
          avatar: updatedUser.avatar,
          name: updatedUser.name,
          email: updatedUser.email,
          verified: updatedUser.verified,
          admin: updatedUser.admin,
          token: await updatedUser.generateJWT(),
        });
      }

      return res.status(400).json({ message: "No file uploaded" });

    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const filter = req.query.searchKeyword;
    let where = {};
    if (filter) {
      where.email = { $regex: filter, $options: "i" };
    }
    let query = User.find(where);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * pageSize;
    const total = await User.find(where).countDocuments();
    const pages = Math.ceil(total / pageSize);

    res.header({
      "x-filter": filter,
      "x-totalcount": JSON.stringify(total),
      "x-currentpage": JSON.stringify(page),
      "x-pagesize": JSON.stringify(pageSize),
      "x-totalpagecount": JSON.stringify(pages),
    });

    if (page > pages) {
      return res.json([]);
    }

    const result = await query
      .skip(skip)
      .limit(pageSize)
      .sort({ updatedAt: "desc" });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
      let user = await User.findById(req.params.userId);

      if (!user) {
          throw new Error("User not found");
      }

      const postsToDelete = await Post.find({ user: user._id });
      const postIdsToDelete = postsToDelete.map((post) => post._id);

      // Hapus semua komentar yang terkait dengan post user
      await Comment.deleteMany({ post: { $in: postIdsToDelete } });

      // Hapus semua post yang dimiliki oleh user
      await Post.deleteMany({ _id: { $in: postIdsToDelete } });

      // Hapus semua foto dari post di Cloudinary
      for (const post of postsToDelete) {
          if (post.photo) {
              const publicId = post.photo.split("/").pop().split(".")[0];
              await cloudinary.uploader.destroy(`post_images/${publicId}`);
          }
      }

      // Hapus avatar user dari Cloudinary jika ada
      if (user.avatar) {
          const publicId = user.avatar.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`user_avatars/${publicId}`);
      }

      // Hapus user dari database
      await user.remove();

      // Kirim respon sukses
      res.status(200).json({ message: "User has been deleted successfully" });

  } catch (error) {
      next(error);
  }
};



export {
  registerUser,
  loginUser,
  userProfile,
  updateProfile,
  updateProfilePicture,
  getAllUsers,
  deleteUser,
};
