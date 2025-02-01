import express from "express";
import cors from "cors"
import dotenv from "dotenv";
import connectDB from "./config/db.js"
import userRoutes from "./routes/userRoutes.js"
import postCategoriesRoutes from "./routes/postCategoriesRoutes.js"
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use(invalidPathHandler);
app.use(errorResponserHandler)

const PORT  = process.env.PORT || 6000;

app.listen(PORT, () => console.log(`Server is Runnin on port ${PORT}`))