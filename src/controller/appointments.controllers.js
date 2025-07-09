import { asyncHandler } from "../utils/asyncHandler.js";
import { Appointment } from "../models/appointments.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { User } from "../models/user.models.js";
import { Pet } from "../models/pet.models.js";
import { PetMedicalRecord } from "../models/petHistory.models.js";
import { VetInfo } from "../models/vetInfo.models.js";



const checkDatesAvailability = async(vetId,date,slot)=>{
  try {
    const vetInfo = await VetInfo.findOne({userId:vetId})
    if(!vetInfo){
      throw new ApiError("Error occured while getting vet info with the provided Id",404)
    }
    const isRequestedDateAvailable = vetInfo.availability.find((d)=> new Date(d.date).toString() === new Date(date).toString())
    if(!isRequestedDateAvailable){
      throw new ApiError("Requested date is not available .Please try with another date")
    }
      ///// check for slot as well 
     if (!isRequestedDateAvailable.slots.includes(slot)) {
      throw new ApiError("Requested Slot is not availble. Please try again")
  }
   return isRequestedDateAvailable;

  } catch (error) {
    console.log("Some error occured in checking availbled dates function ",error.message);
    throw new ApiError("Something went wrong while checking dates availabilty",500)
  }
}


const createAppointment = async ({ petId, userId, vetId, date, slot, purpose }) => {
  try {
    const pet = await Pet.findById(petId);
    if (!pet) throw new ApiError("Pet not found", 404);

    await checkDatesAvailability(vetId, date, slot);

    const newAppointment = await Appointment.findOneAndUpdate(
      {
        assignedVetId: vetId,
        date: new Date(date),
        slot,
        status: { $ne: "Scheduled" },
      },
      {
        $setOnInsert: {
          petId,
          userId,
          purpose,
          status: "Scheduled",
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    if (!newAppointment) {
      throw new ApiError("Slot already booked", 409);
    }

    return newAppointment;

  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError("Slot already booked", 409);
    }
    console.log("Failed to create appointment", error.message);
    throw new ApiError("Error occurred while creating the appointment", 400);
  }
};


////// this book appointment function is for user to book the appointment ////

const bookAppointmentByUser = asyncHandler(async (req, res) => {
  /// first we will check if the user is logged in using the middleware
  const { _id: userId,role } = req.user;
  ///find user
  const user = await User.findOne({ _id: userId });

  if (!user) {
    return res.status(400).json(new ApiResponse(400, "Unauthorised Request"));
  }
  ///get pet Id from req.params
  const { id: petId } = req.params;
 
  // 3. Only users with 'USER' role can book
  if (role !== "USER") {
    return res.status(403).json(new ApiResponse(403, "Only pet owners can book appointments"));
  }
    // 4. Get appointment details
  const { vetId, date, slot, purpose,status} = req.body;

  /// 5 perform validation
  if (!vetId || !date || !slot || !purpose) {
    return res.status(400).json(new ApiResponse(400, "All fields are required"));
  }

    /// create an appointment for the user
    const appointment = await createAppointment({
    petId,
    userId,
    vetId,
    date,
    slot,
    purpose,
    status,
  });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          "Appointment has been created successfully",
          appointment,
        ),
      );
  }
);



const appointmentBookingByVet = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;
  const { _id: userId } = req.body; // Must be passed by vet via frontend

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, "User not found"));
  }

  const { petId } = req.params;
  const { date, slot, purpose,status } = req.body;

  if (!petId || !date || !slot || !purpose) {
    return res.status(400).json(new ApiResponse(400, "Missing fields"));
  }

  const appointment = await createAppointment({
    petId,
    userId,
    vetId,
    date,
    slot,
    purpose,
    status,
  });

  return res.status(201).json(
    new ApiResponse(201, "Appointment created successfully", appointment)
  );
});

//// get available dates for users 

const getAvailableSlots = asyncHandler(async (req, res) => {
  const { vetId } = req.params;

  if (!vetId) {
    return res.status(400).json(new ApiResponse(400, "No vet ID received"));
  }

  const vetInfo = await VetInfo.findOne({ userId: vetId });
  if (!vetInfo) {
    return res.status(404).json(new ApiResponse(404, "Vet not found"));
  }

  const today = new Date();

  // Filter future or today’s dates
  const futureAvailability = vetInfo.availability.filter(
    (entry) => new Date(entry.date) >= today
  );

  // Use Promise.all to resolve all async slot filters
  const filteredAvailability = await Promise.all(
    futureAvailability.map(async (entry) => {
      const availableSlots = [];

      for (const slot of entry.slots) {
        const existing = await Appointment.findOne({
          assignedVetId: vetId,
          date: new Date(entry.date),
          slot,
          status: { $in: ["Scheduled", "Confirmed"] },
        });

        if (!existing) {
          availableSlots.push(slot);
        }
      }

      return {
        date: entry.date,
        slots: availableSlots,
      };
    })
  );

  // Remove dates where all slots are booked
  const cleanedAvailability = filteredAvailability.filter(
    (d) => d.slots.length > 0
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Vet availability", cleanedAvailability));
});


//////////////////////////////// get vet applointments  vet can check all the appointments //////////////
const vetAppointments = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;

  if (!vetId) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Unauthorized request. Only vets can access this."));
  }

  //// implementing pagination ////
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page -1)*10;
  
  /// Optional filters
  const { status, search } = req.query;

    // Base query
  const query = { assignedVetId: vetId };

  // Add status filter if provided
  if (status) {
    query.status = status;
  }



  const totalAppointments = await Appointment.countDocuments({ assignedVetId: vetId });

  const existingAppointments = await Appointment.find(query)
    .populate("userId","name email phoneNumber")
    .populate("petId","name age gender petType")
    .sort({ createdAt: -1 }) // latest first
    .skip(skip)
    .limit(limit);

    // Search filtering (in-memory) by pet or user name
  if (search) {
    const lowerSearch = search.toLowerCase();
    existingAppointments = existingAppointments.filter((appt) => {
      const userName = appt.userId?.name?.toLowerCase() || "";
      const petName = appt.petId?.name?.toLowerCase() || "";
      return userName.includes(lowerSearch) || petName.includes(lowerSearch);
    });
  }

  if (!existingAppointments || existingAppointments.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, "No existing appointments found"));
  }

  return res.status(200).json(
    new ApiResponse(200, "All the appointments fetched successfully",{
      totalAppointments,
      currentPage: page,
      totalPages: Math.ceil(totalAppointments / limit),
      appointments: existingAppointments,
    })
  );
});

//////// cancel appointment  vet/////
const cancelAppointment = asyncHandler(async (req, res) => {
  const { _id: vetId } = req.vet;
  const { appointmentId } = req.params;

  if (!vetId) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Unauthorized request. Only vets can access this."));
  }

  if (!appointmentId) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Invalid appointment ID."));
  }

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return res
      .status(404)
      .json(new ApiResponse(404, "No appointment found with the provided ID."));
  }

  // Optional: ensure the vet owns this appointment
  if (appointment.assignedVetId.toString() !== vetId.toString()) {
    return res
      .status(403)
      .json(new ApiResponse(403, "You are not authorized to cancel this appointment."));
  }

  appointment.status = "Cancelled";
  await appointment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Appointment has been cancelled successfully"));
});



//////////////////////////////update appointment availablity by vet /////
const updateAvailability = asyncHandler(async(req,res)=>{
  const { _id: vetId } = req.vet;
  const { appointmentId } = req.params;

  if (!vetId) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Unauthorized request. Only vets can access this."));
  }

  if (!appointmentId) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Invalid appointment ID."));
  }
  
  const {petId,userId,purpose,status,date,slot} = req.body;

  /// check if appointment exists 
  const appointmentExists = await Appointment.findOne({_id:appointmentId})
  if(!appointmentExists){
    return res.status(400).json(new ApiResponse(400,"No appointment found with the provided id"))
  }
  if(petId) appointmentExists.petId = petId;
  if(userId) appointmentExists.userId = userId;
  if(purpose) appointmentExists.purpose = purpose;
   appointmentExists.status = "Pending";
  if(date) appointmentExists.date = new Date(date);
  if(slot) appointmentExists.slot = slot;

  await appointmentExists.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "Appointment has been updated successfully", appointmentExists));

})

////////////////// get user appointments history by user //////////////
const getUserAppointmentHistory = asyncHandler(async (req, res) => {
  const { _id: userId } = req.user;

  if (!userId) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Unauthorized request. Only logged-in users can access this."));
  }

  const page = parseInt(req.query?.page) || 1;
  const limit = parseInt(req.query?.limit) || 10;
  const skip = (page - 1) * limit;

  const { status, search } = req.query;
  const baseQuery = { userId };

  if (status) {
    baseQuery.status = status;
  }

  const appointments = await Appointment.find(baseQuery)
    .populate({
      path: "petId",
      match: search ? { name: { $regex: search, $options: "i" } } : {},
      select: "name age gender",
    })
    .populate("assignedVetId", "name phoneNumber")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const filteredAppointments = appointments.filter((a) => a.petId !== null);

  if (!filteredAppointments || filteredAppointments.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, "No matching appointments found"));
  }

  const totalAppointments = await Appointment.countDocuments(baseQuery);

  return res.status(200).json(
    new ApiResponse(200, "User appointment history fetched successfully", {
      totalAppointments,
      currentPage: page,
      totalPages: Math.ceil(totalAppointments / limit),
      appointments: filteredAppointments,
    })
  );
});

   



export {bookAppointmentByUser,appointmentBookingByVet,getAvailableSlots,vetAppointments,cancelAppointment,updateAvailability,getUserAppointmentHistory}


