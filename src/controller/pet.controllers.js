import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/api-response.js";
import fs from "fs";
import { Pet } from "../models/pet.models.js";
import { ApiError } from "../utils/api-error.js";
import { PetMedicalRecord } from "../models/petHistory.models.js";
import {
  uploadOnCloudinary,
  updateOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";

// Register Pet (Vet or User)
const registerPet = asyncHandler(async (req, res) => {
  const vetId = req.vet?._id;
  const userId = req.user?._id;
  const { userName, email, phoneNumber, petType, name, age, gender } = req.body;

  if (vetId) {
    if (!userName && !email && !phoneNumber) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            "Provide at least userName, email, or phoneNumber",
            false,
          ),
        );
    }
    if (!petType || !name || !age || !gender) {
      return res
        .status(400)
        .json(new ApiResponse(400, "All pet fields are required", false));
    }

    const user = await User.findOne({
      $or: [{ userName }, { email }, { phoneNumber }],
    }).select("-password");

    if (!user) {
      return res.status(404).json(new ApiResponse(404, "No user found", false));
    }

    const petExists = await Pet.findOne({ petOwner: user._id, name });
    if (petExists) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Pet already exists", false));
    }

    const newPet = new Pet({ petOwner: user._id, petType, name, age, gender });
    await newPet.save();

    return res
      .status(201)
      .json(new ApiResponse(201, "Pet registered successfully", newPet, true));
  }

  if (userId) {
    if (!petType || !name || !age || !gender) {
      return res
        .status(400)
        .json(new ApiResponse(400, "All pet fields are required", false));
    }

    const petExists = await Pet.findOne({ petOwner: userId, name });
    if (petExists) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Pet already exists", false));
    }

    const newPet = new Pet({ petOwner: userId, petType, name, age, gender });
    await newPet.save();

    return res
      .status(201)
      .json(new ApiResponse(201, "Pet registered successfully", newPet, true));
  }

  return res.status(401).json(new ApiResponse(401, "Unauthorized", false));
});

// Update Pet Basic Info
const updatePetInfo = asyncHandler(async (req, res) => {
  const { _id: petId } = req.pet;
  const { name, age, gender } = req.body;

  if (!petId) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Unauthorized request", false));
  }
  if (!name || !age || !gender) {
    return res
      .status(400)
      .json(new ApiResponse(400, "All fields are required", false));
  }

  const updatedPet = await Pet.findByIdAndUpdate(
    petId,
    { name, age, gender },
    { new: true },
  );
  if (!updatedPet) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Failed to update pet info", false));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Pet info updated successfully", updatedPet));
});

// Create Pet Medical Record
/**
 * Helper utility to safely wipe uploaded temp files if validation fails
 */
const cleanTempFiles = async (filesArray) => {
  for (const file of filesArray) {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        await fs.promises.unlink(file.path);
      } catch (err) {
        console.error(`Failed to clean file ${file.path}:`, err.message);
      }
    }
  }
};

const createPetMedicalRecord = asyncHandler(async (req, res) => {
  const { _id: petId } = req.pet;
  let {
    disease,
    allergies,
    vaccinationName,
    lastVaccinationDate,
    nextVaccinatonScheduleDate,
    notes = "",
  } = req.body;

  const xrayFiles = req.files["XRay"] || [];
  const reports = req.files["Reports"] || [];
  const prescription = req.files["Prescription"] || [];
  const allIncomingFiles = [...xrayFiles, ...reports, ...prescription];

  // 1. Immediate Field and File Validations (Prior to processing anything)
  if (!petId) {
    await cleanTempFiles(allIncomingFiles);
    return res.status(400).json(new ApiResponse(400, "No petId provided", false));
  }

  const diseaseArray = disease ? (Array.isArray(disease) ? disease : [disease]) : [];
  const allergiesArray = allergies ? (Array.isArray(allergies) ? allergies : [allergies]) : [];

  if (
    !diseaseArray.length ||
    !allergiesArray.length ||
    !vaccinationName ||
    !lastVaccinationDate ||
    !nextVaccinatonScheduleDate ||
    prescription.length === 0 // Enforce prescription file requirement matching frontend
  ) {
    await cleanTempFiles(allIncomingFiles);
    return res.status(400).json(new ApiResponse(400, "All text fields and prescription image are required", false));
  }

  // 2. Prevent Duplicate Medical Profile Document Entities
  const recordExists = await PetMedicalRecord.findOne({ petId });
  if (recordExists) {
    await cleanTempFiles(allIncomingFiles);
    return res.status(400).json(new ApiResponse(400, "Medical record already exists", false));
  }

  console.time("Create Pet Medical Record Total Time");

  // 3. Parallel Cloud Provider Delivery Pipeline
  console.time("All Cloudinary Uploads");
  try {
    const uploadPromises = [
      xrayFiles[0] ? uploadOnCloudinary(xrayFiles[0].path) : Promise.resolve(null),
      reports[0] ? uploadOnCloudinary(reports[0].path) : Promise.resolve(null),
      prescription[0] ? uploadOnCloudinary(prescription[0].path) : Promise.resolve(null),
    ];

    const [xrayUpload, reportsUpload, prescriptionUpload] = await Promise.all(uploadPromises);
    console.timeEnd("All Cloudinary Uploads");

    // 4. Instantiating the Monolithic Profile State Structure
    const petInfo = new PetMedicalRecord({
      petId,
      disease: diseaseArray,
      allergies: allergiesArray,
      vaccinationName,
      xRay: xrayUpload ? [{
        url: xrayUpload.secure_url,
        mimetype: xrayFiles[0].mimetype,
        size: xrayFiles[0].size,
        cloudinaryImageId: xrayUpload.public_id,
      }] : [],
      reports: reportsUpload ? [{
        url: reportsUpload.secure_url,
        mimetype: reports[0].mimetype,
        size: reports[0].size,
        cloudinaryImageId: reportsUpload.public_id,
      }] : [],
      prescription: prescriptionUpload ? [{
        url: prescriptionUpload.secure_url,
        mimetype: prescription[0].mimetype,
        size: prescription[0].size,
        cloudinaryImageId: prescriptionUpload.public_id,
      }] : [],
      lastVaccinationDate,
      nextVaccinatonScheduleDate,
      notes,
    });

    console.time("Saving pet medical files to db time");
    await petInfo.save();
    console.timeEnd("Saving pet medical files to db time");

    console.timeEnd("Create Pet Medical Record Total Time");

    return res.status(201).json(
      new ApiResponse(201, "Pet medical record created successfully", petInfo)
    );

  } catch (uploadError) {
    // If Cloudinary uploads fail mid-way, purge remaining files locally to avoid memory bloat
    await cleanTempFiles(allIncomingFiles);
    throw new ApiError(500, "Media ingestion failure engine loop interrupted", uploadError);
  }
});

// Get Pet + Medical Info
const getPetInfo = asyncHandler(async (req, res) => {
  const { id: petId } = req.params;
  if (!petId)
    return res
      .status(400)
      .json(new ApiResponse(400, "No petId provided", false));

  const pet = await Pet.findById(petId);
  if (!pet)
    return res.status(404).json(new ApiResponse(404, "Pet not found", false));

  const medicalInfo = await PetMedicalRecord.findOne({ petId });

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Pet details fetched", {
        pet,
        medicalInfo: medicalInfo || null,
      }),
    );
});

// Update Pet Medical Info
const updatePetMedicalInfo = asyncHandler(async (req, res) => {
  const { id: petId } = req.params;
  if (!petId) {
    return res.status(400).json(new ApiResponse(400, "Invalid petId", false));
  }

  // 1. Fetch current database snapshot before processing any files
  const record = await PetMedicalRecord.findOne({ petId });
  if (!record) {
    // Clean up files immediately if the entity doesn't exist
    const xrayFile = req.files?.["XRay"] || [];
    const reportsFile = req.files?.["Reports"] || [];
    const prescriptionFile = req.files?.["Prescription"] || [];
    await cleanTempFiles([...xrayFile, ...reportsFile, ...prescriptionFile]);
    
    return res.status(404).json(new ApiResponse(404, "Medical record not found", false));
  }

  const {
    vaccinationName,
    disease,
    allergies,
    lastVaccinationDate,
    nextVaccinatonScheduleDate,
    notes,
  } = req.body;

  const xrayFile = req.files?.["XRay"] || [];
  const reportsFile = req.files?.["Reports"] || [];
  const prescriptionFile = req.files?.["Prescription"] || [];
  const allIncomingFiles = [...xrayFile, ...reportsFile, ...prescriptionFile];

  // 2. Map text fields dynamically if provided
  if (disease) record.disease = Array.isArray(disease) ? disease : [disease];
  if (allergies) record.allergies = Array.isArray(allergies) ? allergies : [allergies];
  if (vaccinationName) record.vaccinationName = vaccinationName;
  if (lastVaccinationDate) record.lastVaccinationDate = lastVaccinationDate;
  if (nextVaccinatonScheduleDate) record.nextVaccinatonScheduleDate = nextVaccinatonScheduleDate;
  if (notes !== undefined) record.notes = notes;

  console.time("Parallel Cloudinary Updates");
  try {
    const uploadPromises = [];

    // Queue X-Ray overwrite if a new file is uploaded
    if (xrayFile.length > 0) {
      const existingXrayId = record.xRay?.[0]?.cloudinaryImageId;
      uploadPromises.push(
        updateOnCloudinary(xrayFile[0].path, existingXrayId).then((res) => ({
          type: "xray",
          payload: res,
          meta: xrayFile[0],
        }))
      );
    }

    // Queue Reports overwrite if a new file is uploaded
    if (reportsFile.length > 0) {
      const existingReportId = record.reports?.[0]?.cloudinaryImageId;
      uploadPromises.push(
        updateOnCloudinary(reportsFile[0].path, existingReportId).then((res) => ({
          type: "reports",
          payload: res,
          meta: reportsFile[0],
        }))
      );
    }

    // Queue Prescription overwrite if a new file is uploaded
    if (prescriptionFile.length > 0) {
      const existingPrescriptionId = record.prescription?.[0]?.cloudinaryImageId;
      uploadPromises.push(
        updateOnCloudinary(prescriptionFile[0].path, existingPrescriptionId).then((res) => ({
          type: "prescription",
          payload: res,
          meta: prescriptionFile[0],
        }))
      );
    }

    // 3. Resolve all Cloudinary network operations in parallel
    const uploadResults = await Promise.all(uploadPromises);
    console.timeEnd("Parallel Cloudinary Updates");

    // 4. Map the resolved assets back to the database schema structure
    uploadResults.forEach(({ type, payload, meta }) => {
      const updatedAssetBlock = [
        {
          url: payload.secure_url,
          mimetype: meta.mimetype,
          size: meta.size,
          cloudinaryImageId: payload.public_id,
        },
      ];

      if (type === "xray") record.xRay = updatedAssetBlock;
      if (type === "reports") record.reports = updatedAssetBlock;
      if (type === "prescription") record.prescription = updatedAssetBlock;
    });

    console.time("Saving record changes to database");
    await record.save();
    console.timeEnd("Saving record changes to database");

    return res.status(200).json(new ApiResponse(200, "Medical info updated", record));

  } catch (error) {
    // Purge any local temporary files immediately to maintain storage efficiency if the transaction crashes
    await cleanTempFiles(allIncomingFiles);
    throw new ApiError(500, "Media asset modification sequence failed", error?.message || error);
  }
});

// Remove Pet & Medical Info
const removePet = asyncHandler(async (req, res) => {
  const { id: petId } = req.params;
  if (!petId)
    return res.status(400).json(new ApiResponse(400, "Invalid petId", false));

  const pet = await Pet.findById(petId);
  if (!pet)
    return res.status(404).json(new ApiResponse(404, "Pet not found", false));

  const ownerId = pet.petOwner;
  const medicalRecord = await PetMedicalRecord.findOne({ petId });

  try {
    if (medicalRecord) {
      const imagesToDelete = [];
      ["xRay", "reports", "prescription"].forEach((key) => {
        const images = medicalRecord[key] || [];
        images.forEach((img) => imagesToDelete.push(img.cloudinaryImageId));
      });

      if (imagesToDelete.length > 0) {
        await deleteFromCloudinary(imagesToDelete);
      }
      await medicalRecord.deleteOne();
    }

    await pet.deleteOne();

    const remainingPets = await Pet.find({ petOwner: ownerId }).lean();

    if (remainingPets.length === 0) {
      const owner = await User.findById(ownerId);
      if (owner && !owner.isClaimed && owner.createdByVet) {
        await User.findByIdAndDelete(owner._id);
      }
    }
  } catch (error) {
    console.error("Error during removal process:", error);
    return res.status(500).json(new ApiResponse(500, "Failed to remove pet and associated data", false));
  }

  return res.status(200).json(new ApiResponse(200, "Pet and medical record removed"));
});

export {
  registerPet,
  updatePetInfo,
  createPetMedicalRecord,
  getPetInfo,
  updatePetMedicalInfo,
  removePet,
};
