import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";


dotenv.config(
    {
        path:"./.env"
    }
)


const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://pet-vitals-frontend.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

/////////////////////// Routes //////////////

import registerRoute from "./routes/auth.Routes.js";
import registerPetRoute from "./routes/pet.Routes.js";
import appointmentRoute from "./routes/appointment.Routes.js";
import vetRoute         from "./routes/vet.Routes.js";


app.use("/api/v1/user",registerRoute)

app.use("/api/v1/pet",registerPetRoute)

app.use("/api/v1/appointment",appointmentRoute)

app.use("/api/v1/vet",vetRoute)


export default app;