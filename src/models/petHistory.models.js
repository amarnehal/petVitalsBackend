import mongoose, { Schema } from "mongoose";

const petMedicalRecordSchema = new Schema(
  {
    petId: {
      type: Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },
    disease: [
      {
        type: String,
        required: [true, "Disease is a required field"],
      },
    ],

    allergies: [
      {
        type: String,
      },
    ],
    xRay: [
      {
        url: {
          type: String,
        },
        mimetype: {
          type: String,
        },
        size: {
          type: Number,
        },
        cloudinaryImageId: {
          type: String,
        },
      },
    ],
    reports: [
      {
        url: {
          type: String,
          required: [true, "Medical reports are required"],
        },
        mimetype: {
          type: String,
        },
        size: {
          type: Number,
        },
        cloudinaryImageId: {
          type: String,
        },
      },
    ],
    vaccinationName:{
      type :String,

    },
    lastVaccinationDate: {
      type: Date,
    },
    nextVaccinatonScheduleDate: {
      type: Date,
    },
    notes: [
      {
        type: String,
      },
    ],
    prescription: [
      {
        url: {
          type: String,
          required: [true, "Prescription is required"],
        },
        mimetype: {
          type: String,
        },

        size: {
          type: Number,
        },
        cloudinaryImageId: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true },
);

export const PetMedicalRecord = mongoose.model(
  "PetMedicalRecord",
  petMedicalRecordSchema,
);
