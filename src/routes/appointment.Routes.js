import { Router } from "express";
import {bookAppointmentByUser,appointmentBookingByVet,getAvailableSlots,vetAppointments,cancelAppointment,updateAvailability,getUserAppointmentHistory} from "../controller/appointments.controllers.js";
import { isUserLoggedIn,isVetAccount} from "../middlewares/auth.middleware.js";


const router = new Router();

// // User books an appointment for their pet with a pet id
router.route("/book/user/:petId").post(isUserLoggedIn,bookAppointmentByUser);

// // Vet books an appointment for a patient
router.route("/book/vet/:userId/:petId").post(isUserLoggedIn,isVetAccount,appointmentBookingByVet);

////////////To fetch all the availble sots
router.route("/available-dates/:vetId").get(isUserLoggedIn,getAvailableSlots);

//////  For vet To view all the appointments ////// 
router.route("/vet/history").get(isUserLoggedIn, isVetAccount, vetAppointments);

// Cancel an appointment
router.route("/cancel/:appointmentId").patch(isUserLoggedIn,isVetAccount, cancelAppointment);

// View user appointment history
router.route("/user/history").get(isUserLoggedIn, getUserAppointmentHistory);

// Vet sets availability
router.route("/vet/availability/update/:appointmentId").patch(isUserLoggedIn, isVetAccount, updateAvailability);
export default router;