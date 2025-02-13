import express from "express";
import cors from "cors"
import dotenv from "dotenv";
import connectDB from "./config/db.js"
import userRoutes from "./routes/userRoutes.js"
import commentRoutes from "./routes/commentRoutes.js"
import postCategoriesRoutes from "./routes/postCategoriesRoutes.js"
import postRoutes from "./routes/postRoutes.js"
import { fileURLToPath } from "url"; 
import path from "path";
import {
    errorResponserHandler,
    invalidPathHandler,
  } from "./middleware/errorHandler.js";

dotenv.config();
connectDB();
const app = express();
app.use(express.json());

const corsOption = {
    exposedHeaders: "*",
};

app.use(cors(corsOption));

app.get("/", (req, res) => {
    res.send("Server is Running ...")
})

app.use("/api/users", userRoutes);
app.use("/api/post-categories", postCategoriesRoutes)
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use(invalidPathHandler);
app.use(errorResponserHandler)

const PORT  = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is Running on port ${PORT}`))