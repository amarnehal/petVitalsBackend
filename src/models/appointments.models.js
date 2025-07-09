import mongoose, { Schema } from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    petId: {
      type: Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purpose: {
      type: String,
      enum: ["Regular-Checkup", "Vaccination", "Infection", "Other"],
      default: "Regular-Checkup",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Cancelled", "Pending"],
      default: "Pending",
    },
    date: {
      type: Date,
      required: true,
    },
    slot: {
      type: String,
      required: true, // e.g., "10:30"
    },
    assignedVetId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);
appointmentSchema.index(
  { assignedVetId: 1, date: 1, slot: 1 },
  { unique: true },
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
