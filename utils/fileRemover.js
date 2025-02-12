import fs from "fs";
import path from "path";

const fileRemover = async (filename) => {
    try {
        const filePath = path.join("/tmp", filename); // Arahkan ke /tmp
        await fs.promises.unlink(filePath);
        console.log(`File ${filename} removed successfully`);
    } catch (err) {
        if (err.code === "ENOENT") {
            console.log(`File ${filename} doesn't exist, skipping deletion.`);
        } else {
            console.error(`Error deleting file ${filename}: ${err.message}`);
        }
    }
};

export { fileRemover };
