import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/api-response.js";
import { Pet } from "../models/pet.models.js";
import { ApiError } from "../utils/api-error.js";
import { PetMedicalRecord } from "../models/petHistory.models.js";
import { uploadOnCloudinary, updateOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";

// Register Pet (Vet or User)
const registerPet = asyncHandler(async (req, res) => {
  const vetId = req.vet?._id;
  const userId = req.user?._id;
  const { userName, email, phoneNumber, petType, name, age, gender } = req.body;

  if (vetId) {
    if (!userName && !email && !phoneNumber) {
      return res.status(400).json(new ApiResponse(400, "Provide at least userName, email, or phoneNumber", false));
    }
    if (!petType || !name || !age || !gender) {
      return res.status(400).json(new ApiResponse(400, "All pet fields are required", false));
    }

    const user = await User.findOne({
      $or: [{ userName }, { email }, { phoneNumber }]
    }).select("-password");

    if (!user) {
      return res.status(404).json(new ApiResponse(404, "No user found", false));
    }

    const petExists = await Pet.findOne({ petOwner: user._id, name });
    if (petExists) {
      return res.status(400).json(new ApiResponse(400, "Pet already exists", false));
    }

    const newPet = new Pet({ petOwner: user._id, petType, name, age, gender });
    await newPet.save();

    return res.status(201).json(new ApiResponse(201, "Pet registered successfully", newPet, true));
  }

  if (userId) {
    if (!petType || !name || !age || !gender) {
      return res.status(400).json(new ApiResponse(400, "All pet fields are required", false));
    }

    const petExists = await Pet.findOne({ petOwner: userId, name });
    if (petExists) {
      return res.status(400).json(new ApiResponse(400, "Pet already exists", false));
    }

    const newPet = new Pet({ petOwner: userId, petType, name, age, gender });
    await newPet.save();

    return res.status(201).json(new ApiResponse(201, "Pet registered successfully", newPet, true));
  }

  return res.status(401).json(new ApiResponse(401, "Unauthorized", false));
});

// Update Pet Basic Info
const updatePetInfo = asyncHandler(async (req, res) => {
  const { _id: petId } = req.pet;
  const { name, age, gender } = req.body;

  if (!petId) {
    return res.status(400).json(new ApiResponse(400, "Unauthorized request", false));
  }
  if (!name || !age || !gender) {
    return res.status(400).json(new ApiResponse(400, "All fields are required", false));
  }

  const updatedPet = await Pet.findByIdAndUpdate(petId, { name, age, gender }, { new: true });
  if (!updatedPet) {
    return res.status(400).json(new ApiResponse(400, "Failed to update pet info", false));
  }

  return res.status(200).json(new ApiResponse(200, "Pet info updated successfully", updatedPet));
});

// Create Pet Medical Record
const createPetMedicalRecord = asyncHandler(async (req, res) => {
  const { _id: petId } = req.pet;
  let { disease, allergies, lastVaccinationDate, nextVaccinatonScheduleDate, notes = "" } = req.body;

  const xrayFiles = req.files["XRay"] || [];
  const reports = req.files["Reports"] || [];
  const prescription = req.files["Prescription"] || [];

  if (!petId) {
    return res.status(400).json(new ApiResponse(400, "No petId provided", false));
  }

  const recordExists = await PetMedicalRecord.findOne({ petId });
  if (recordExists) {
    return res.status(400).json(new ApiResponse(400, "Medical record already exists", false));
  }

  // Normalize arrays
  const diseaseArray = disease ? (Array.isArray(disease) ? disease : [disease]) : [];
  const allergiesArray = allergies ? (Array.isArray(allergies) ? allergies : [allergies]) : [];

  if (!diseaseArray.length || !allergiesArray.length || !lastVaccinationDate || !nextVaccinatonScheduleDate) {
    return res.status(400).json(new ApiResponse(400, "All fields are required", false));
  }

  // Upload files if they exist
  const xrayUpload = xrayFiles[0] ? await uploadOnCloudinary(xrayFiles[0].path) : null;
  const reportsUpload = reports[0] ? await uploadOnCloudinary(reports[0].path) : null;
  const prescriptionUpload = prescription[0] ? await uploadOnCloudinary(prescription[0].path) : null;

  const petInfo = new PetMedicalRecord({
    petId,
    disease: diseaseArray,
    allergies: allergiesArray,
    xRay: xrayUpload ? [{
      url: xrayUpload.secure_url,
      mimetype: xrayFiles[0].mimetype,
      size: xrayFiles[0].size,
      cloudinaryImageId: xrayUpload.public_id
    }] : [],
    reports: reportsUpload ? [{
      url: reportsUpload.secure_url,
      mimetype: reports[0].mimetype,
      size: reports[0].size,
      cloudinaryImageId: reportsUpload.public_id
    }] : [],
    prescription: prescriptionUpload ? [{
      url: prescriptionUpload.secure_url,
      mimetype: prescription[0].mimetype,
      size: prescription[0].size,
      cloudinaryImageId: prescriptionUpload.public_id
    }] : [],
    lastVaccinationDate,
    nextVaccinatonScheduleDate,
    notes,
  });

  await petInfo.save();
  return res.status(201).json(new ApiResponse(201, "Pet medical record created successfully", petInfo));
});


// Get Pet + Medical Info
const getPetInfo = asyncHandler(async (req, res) => {
  const { id: petId } = req.params;
  if (!petId) return res.status(400).json(new ApiResponse(400, "No petId provided", false));

  const pet = await Pet.findById(petId);
  if (!pet) return res.status(404).json(new ApiResponse(404, "Pet not found", false));

  const medicalInfo = await PetMedicalRecord.findOne({ petId });

  return res.status(200).json(new ApiResponse(200, "Pet details fetched", { pet, medicalInfo: medicalInfo || null }));
});

// Update Pet Medical Info
const updatePetMedicalInfo = asyncHandler(async (req, res) => {
  const { id: petId } = req.params;
  if (!petId) return res.status(400).json(new ApiResponse(400, "Invalid petId", false));

  const record = await PetMedicalRecord.findOne({ petId });
  if (!record) return res.status(404).json(new ApiResponse(404, "Medical record not found", false));

  const { disease, allergies, lastVaccinationDate, nextVaccinatonScheduleDate, notes } = req.body;
  const xrayFile = req.files?.["XRay"] || [];
  const reportsFile = req.files?.["Reports"] || [];
  const prescriptionFile = req.files?.["Prescription"] || [];

  if (disease) record.disease = disease;
  if (allergies) record.allergies = allergies;
  if (lastVaccinationDate) record.lastVaccinationDate = lastVaccinationDate;
  if (nextVaccinatonScheduleDate) record.nextVaccinatonScheduleDate = nextVaccinatonScheduleDate;
  if (notes) record.notes = notes;

  if (xrayFile.length > 0) {
    const updatedXray = await updateOnCloudinary(xrayFile[0].path, record.xRay[0]?.cloudinaryImageId);
    record.xRay[0] = { url: updatedXray.secure_url, mimetype: xrayFile[0].mimetype, size: xrayFile[0].size, cloudinaryImageId: updatedXray.public_id };
  }

  if (reportsFile.length > 0) {
    const updatedReport = await updateOnCloudinary(reportsFile[0].path, record.reports[0]?.cloudinaryImageId);
    record.reports[0] = { url: updatedReport.secure_url, mimetype: reportsFile[0].mimetype, size: reportsFile[0].size, cloudinaryImageId: updatedReport.public_id };
  }

  if (prescriptionFile.length > 0) {
    const updatedPrescription = await updateOnCloudinary(prescriptionFile[0].path, record.prescription[0]?.cloudinaryImageId);
    record.prescription[0] = { url: updatedPrescription.secure_url, mimetype: prescriptionFile[0].mimetype, size: prescriptionFile[0].size, cloudinaryImageId: updatedPrescription.public_id };
  }

  await record.save();
  return res.status(200).json(new ApiResponse(200, "Medical info updated", record));
});

// Remove Pet & Medical Info
const removePet = asyncHandler(async (req, res) => {
  const { id: petId } = req.params;
  if (!petId) return res.status(400).json(new ApiResponse(400, "Invalid petId", false));

  const pet = await Pet.findById(petId);
  if (!pet) return res.status(404).json(new ApiResponse(404, "Pet not found", false));

  const medicalRecord = await PetMedicalRecord.findOne({ petId });

  const imagesToDelete = [];
  if (medicalRecord) {
    ["xRay", "reports", "prescription"].forEach(key => {
      const images = medicalRecord[key] || [];
      images.forEach(img => imagesToDelete.push(img.cloudinaryImageId));
    });

    if (imagesToDelete.length > 0) await deleteFromCloudinary(imagesToDelete);
    await medicalRecord.remove();
  }

  await pet.remove();

  return res.status(200).json(new ApiResponse(200, "Pet and medical record removed"));
});

export { registerPet, updatePetInfo, createPetMedicalRecord, getPetInfo, updatePetMedicalInfo, removePet };
