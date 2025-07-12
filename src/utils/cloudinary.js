import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/api-error.js";
import fs from "fs";
import dotenv from "dotenv";
import { error, log } from "console";

dotenv.config({
  path: "./.env",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new ApiError("No loacal path found", 400, error);
    }
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File uploaded successfully on cloud");

    console.log("Cloudinary response", response);
    fs.unlinkSync(localFilePath);
    console.log("Files unlinked successfully");

    return response;
  } catch (error) {
    //// delete temp file from local storage if some error occured//
    fs.unlinkSync(localFilePath);
    throw new ApiError(
      "Error occured while uploading to cloudinry",
      400,
      error,
    );
  }
};

const updateOnCloudinary = async (localFilePath, publicId) => {
  try {
    if (!localFilePath) {
      throw new ApiError("No loacal path found", 400, error);
    }
    if (!publicId) {
      throw new ApiError("No public Id found", 400, error);
    }
    const updatedResponse = await cloudinary.uploader.upload(localFilePath, {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
    });
    console.log("Updated response from clodinary");
    fs.unlinkSync(localFilePath);
    console.log("Files successfully removed from local path after updation");

    return updatedResponse;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    throw new ApiError(
      "Error occured while attempting to update files on cloudinry",
      400,
      error,
    );
  }
};

const deleteFromCloudinary = async (publicIds) => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new ApiError("No publicIds received. Failed to perform delete action", 400);
    }

    const deleteResults = await Promise.all(
      publicIds.map(async (id) => {
        const result = await cloudinary.uploader.destroy(id);
        if (result.result !== "ok" && result.result !== "not found") {
          console.warn(`Cloudinary deletion issue for ID: ${id}`, result);
        }
        return result;
      })
    );

    console.log("Cloudinary images deleted:", deleteResults);
    return deleteResults;

  } catch (error) {
    console.error("Cloudinary Deletion Error:", error); // 
    throw new ApiError(
      "Failed to delete one or more images from Cloudinary",
      500,
      error?.message || error.toString()
    );
  }
};
export { uploadOnCloudinary, updateOnCloudinary,deleteFromCloudinary };
