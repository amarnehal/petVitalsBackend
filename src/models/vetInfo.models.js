import mongoose, { Schema } from "mongoose";

const vetInfoSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    experienceYears: {
      type: Number,
      min: 0,
      required: [
        true,
        "Please enter your experience in years in Number format, like 1 or 2 or more",
      ],
    },
    availability: [
      {
        date: Date,
        slots: [String], // e.g., ["10:00", "11:00"]
      },
    ],
    exceptions: [
      {
        date: {
          type: Date,
          required: true,
        },
        isAvailable: {
          type: Boolean,
          default: false,
        },
        slots: [String], // optional custom slots
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    clinicAddress: {
      type: String,
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

export const VetInfo = mongoose.model("VetInfo", vetInfoSchema);
