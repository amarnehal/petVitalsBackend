import { Pet } from "../models/pet.models.js";
import { PetMedicalRecord } from "../models/petHistory.models.js";
import { User } from "../models/user.models.js";
import { VetInfo } from "../models/vetInfo.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { claimAccountEmail, sendEmail } from "../utils/mail.js";
import { UserRolesEnum } from "../utils/constants.js";
import crypto from "crypto";

//////////////////// CREATE VET INFO ////////////////////
const createVetInfo = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;

  if (!vetId) {
    return res.status(400).json(new ApiResponse(400, "Invalid vet Id"));
  }

  const existingVetInfo = await VetInfo.findOne({ userId: vetId });
  if (existingVetInfo) {
    return res
      .status(409)
      .json(new ApiResponse(409, "Vet info already exists"));
  }

  const { qualifications, experienceYears, availability, clinicAddress, bio } =
    req.body;

  if (
    !qualifications ||
    !experienceYears ||
    !availability ||
    !clinicAddress ||
    !bio
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, "All fields are required"));
  }

  if (!Array.isArray(availability) || availability.length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Availability must be a non-empty array"));
  }

  const availableDates = [];

  for (const entry of availability) {
    const { date, slots } = entry;

    if (!date || !Array.isArray(slots) || slots.length === 0) continue;

    const entryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (entryDate < today) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Availability date cannot be in the past"));
    }

    availableDates.push({ date: entryDate, slots });
  }

  const newVetInfo = await VetInfo.create({
    userId: vetId,
    qualifications,
    experienceYears,
    availability: availableDates,
    clinicAddress,
    bio,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Vet info created successfully", newVetInfo));
});

//////////////////// GET VET INFO BY ID ////////////////////
const vetInfoById = asyncHandler(async (req, res) => {
  const { id: vetId } = req.params;

  if (!vetId) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Invalid or no vet id received"));
  }

  const existingVetInfo = await VetInfo.findOne({ userId: vetId }).populate(
    "userId",
    "userName email",
  );

  if (!existingVetInfo) {
    return res.status(404).json(new ApiResponse(404, "Vet info doesn't exist"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Vet info fetched successfully", existingVetInfo),
    );
});

//////////////////// GET VET INFO FOR LOGGED IN VET ////////////////////
const vetInfo = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;

  if (!vetId) {
    return res.status(400).json(new ApiResponse(400, "Failed to get vet info"));
  }

  const vetData = await VetInfo.findOne({ userId: vetId }).populate(
    "userId",
    "userName email phoneNumber",
  );

  if (!vetData) {
    return res.status(404).json(new ApiResponse(404, "Vet info doesn't exist"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Vet info fetched successfully", vetData));
});

//////////////////// UPDATE VET (USER) INFO ////////////////////
const updateVet = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;

  if (!vetId) {
    return res.status(401).json(new ApiResponse(401, "Unauthorized request"));
  }

  const vet = await User.findById(vetId);
  if (!vet) {
    return res.status(404).json(new ApiResponse(404, "Vet not found"));
  }

  const { userName, email, phoneNumber, password } = req.body;

  if (userName) vet.userName = userName;
  if (email) vet.email = email;
  if (phoneNumber) vet.phoneNumber = phoneNumber;
  if (password) vet.password = password;

  await vet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Vet profile updated successfully", vet));
});

//////////////////// UPDATE VET INFO ////////////////////
const updateVetInfoProfile = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;

  if (!vetId) {
    return res.status(401).json(new ApiResponse(401, "Unauthorized request"));
  }

  const vetInfo = await VetInfo.findOne({ userId: vetId });
  if (!vetInfo) {
    return res
      .status(404)
      .json(new ApiResponse(404, "No vet info found to update"));
  }

  const { qualifications, experienceYears, availability, clinicAddress, bio } =
    req.body;

  if (qualifications) vetInfo.qualifications = qualifications;
  if (experienceYears) vetInfo.experienceYears = experienceYears;
  if (clinicAddress) vetInfo.clinicAddress = clinicAddress;
  if (bio) vetInfo.bio = bio;

  if (Array.isArray(availability)) {
    const updateDates = [];

    for (const { date, slots } of availability) {
      const setDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!date || !slots || setDate < today) continue;

      updateDates.push({ date: setDate, slots });
    }

    vetInfo.availability = updateDates;
  }

  await vetInfo.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Vet info updated successfully", vetInfo));
});

//////////////////// REMOVE VET ACCOUNT ////////////////////
const removeVet = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;

  if (!vetId) {
    return res.status(401).json(new ApiResponse(401, "Unauthorized request"));
  }

  await VetInfo.findOneAndDelete({ userId: vetId });
  await User.findByIdAndDelete(vetId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Vet account has been removed successfully"));
});

//////////////////// GET ALL USERS WITH PETS ////////////////////
const getAllUsersWithPets = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;

  if (!vetId) {
    return res.status(400).json(new ApiResponse(400, "Invalid vet Id"));
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim() || "";

  const matchStage = search
    ? {
        $or: [
          { "owner.userName": { $regex: search, $options: "i" } },
          { "owner.email": { $regex: search, $options: "i" } },
          { "owner.phoneNumber": { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const results = await Pet.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "petOwner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
    { $match: matchStage },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              createdAt: 1,
              name: 1,
              age: 1,
              gender: 1,
              petType: 1,
              owner: {
                userName: "$owner.userName",
                email: "$owner.email",
                phoneNumber: "$owner.phoneNumber",
              },
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const petDetails = results[0].data;
  const total = results[0].totalCount[0]?.count || 0;

  return res.status(200).json(
    new ApiResponse(200, "All pets with users fetched successfully", {
      totalPetCount: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      petDetails,
    }),
  );
});

const registerPetWithOwner = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;

  console.log("Vet Id is ", vetId);

  if (!vetId) {
    console.error("❌ No vetId in req.vet");
    return res.status(400).json(new ApiResponse(400, "Unauthorized request"));
  }

  const {
    userName,
    email,
    phoneNumber,
    petName,
    petAge,
    petGender,
    petType,
  } = req.body;

  console.log("🐾 registerPetWithOwner: req.body =", req.body);
  console.log("🐾 req.vet =", req.vet);

  // Minimal validation: userName and pet details required
  if (!userName || userName.trim() === "") {
    return res
      .status(400)
      .json(new ApiResponse(400, "Username is required"));
  }

  if (!petName || !petAge || !petGender || !petType) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Pet details are required"));
  }

  let owner;

  // Try to find existing owner by email, phoneNumber, or userName
  if (email && email.trim() !== "") {
    owner = await User.findOne({ email: email.trim() });
  } else if (phoneNumber && phoneNumber.trim() !== "") {
    owner = await User.findOne({ phoneNumber: phoneNumber.trim() });
  } else {
    owner = await User.findOne({ userName: userName.trim() });
  }

  // If owner not found, create a partial user
  if (!owner) {
    console.log("🔍 Owner not found, creating a new one...");
    owner = await User.create({
      userName: userName.trim(),
      ...(email && email.trim() !== "" && { email: email.trim() }),
      ...(phoneNumber && phoneNumber.trim() !== "" && { phoneNumber: phoneNumber.trim() }),
      role: UserRolesEnum.USER,
      isEmailVerified: false,
      isClaimed: false,
      // password NOT set here to avoid validation errors
    });

    console.log("✅ Created partial owner with ID:", owner._id);

    // Only send claim email if email is provided
    if (email && email.trim() !== "") {
      const { unhashedToken, hashedToken, tokenExpiry } = owner.generateTemporaryToken();

      owner.emailVerificationToken = hashedToken;
      owner.emailVerificationExpiry = tokenExpiry;
      await owner.save();

      const claimLink = `${process.env.BASE_URL}/api/v1/user/claim-account/${unhashedToken}`;
      const emailContent = claimAccountEmail(owner.userName, claimLink);

      await sendEmail({
        email: owner.email,
        subject: "Claim Your Account",
        mailGenContent: emailContent,
      });
    }
  }

  // Create new pet linked to owner
  const newPet = await Pet.create({
    petOwner: owner._id,
    name: petName,
    age: petAge,
    gender: petGender,
    petType,
  });

  return res.status(201).json(
    new ApiResponse(201, "Pet and owner registered successfully", {
      owner,
      newPet,
    })
  );
});


export {
  createVetInfo,
  vetInfoById,
  vetInfo,
  updateVet,
  updateVetInfoProfile,
  removeVet,
  getAllUsersWithPets,
  registerPetWithOwner,
};
