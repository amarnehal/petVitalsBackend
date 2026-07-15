import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/api-error.js";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Safely removes a file from local temp storage using non-blocking promises
 */
const safelyDeleteLocalFile = async (localFilePath) => {
  try {
    if (localFilePath && fs.existsSync(localFilePath)) {
      await fs.promises.unlink(localFilePath);
    }
  } catch (err) {
    console.error(`Failed to clean up local file at ${localFilePath}:`, err.message);
  }
};

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new ApiError("No local path found", 400);
    }

    console.time(`Cloudinary Upload Time -> ${localFilePath}`);
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.timeEnd(`Cloudinary Upload Time -> ${localFilePath}`);
    
    // Clean up local file in the background asynchronously
    await safelyDeleteLocalFile(localFilePath);

    return response;
  } catch (error) {
    // Ensure clean up happens even if the cloud provider upload fails
    await safelyDeleteLocalFile(localFilePath);
    throw new ApiError(
      "Error occurred while uploading to Cloudinary",
      400,
      error?.message || error
    );
  }
};

const updateOnCloudinary = async (localFilePath, publicId) => {
  try {
    if (!localFilePath || !publicId) {
      throw new ApiError("Missing file path or publicId", 400);
    }

    const updatedResponse = await cloudinary.uploader.upload(localFilePath, {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
    });

    await safelyDeleteLocalFile(localFilePath);
    return updatedResponse;
  } catch (err) {
    await safelyDeleteLocalFile(localFilePath);
    throw new ApiError("Cloudinary update failed", 400, err?.message || err);
  }
};

const deleteFromCloudinary = async (publicIds) => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new ApiError("No publicIds received. Failed to perform delete action", 400);
    }

    // Process deletions in parallel
    const deleteResults = await Promise.all(
      publicIds.map(async (id) => {
        const result = await cloudinary.uploader.destroy(id);
        if (result.result !== "ok" && result.result !== "not found") {
          console.warn(`Cloudinary deletion issue for ID: ${id}`, result);
        }
        return result;
      })
    );

    return deleteResults;
  } catch (error) {
    console.error("Cloudinary Deletion Error:", error); 
    throw new ApiError(
      "Failed to delete one or more images from Cloudinary",
      500,
      error?.message || error.toString()
    );
  }
};

export { uploadOnCloudinary, updateOnCloudinary, deleteFromCloudinary };
