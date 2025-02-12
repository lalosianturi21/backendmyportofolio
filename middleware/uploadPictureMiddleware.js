import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "/tmp"); // Simpan sementara di /tmp
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const uploadPicture = multer({
    storage: storage,
    limits: { fileSize: 1 * 1000000 }, // 1MB
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png/;
        const ext = path.extname(file.originalname).toLowerCase();
        const mimeType = fileTypes.test(file.mimetype);
        const extName = fileTypes.test(ext);

        if (mimeType && extName) {
            return cb(null, true);
        }
        cb(new Error("Only images (jpg, jpeg, png) are allowed"));
    },
});

export { uploadPicture };
