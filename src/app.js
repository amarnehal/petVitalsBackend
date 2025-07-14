import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://pet-vitals-frontend.vercel.app"

];
app.options(/^\/splash.*$/, cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// ✅ Middlewares to parse body BEFORE routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Optional: to serve images or public files
app.use(express.static("public"));

// ✅ Routes
import registerRoute from "./routes/auth.Routes.js";
import registerPetRoute from "./routes/pet.Routes.js";
import appointmentRoute from "./routes/appointment.Routes.js";
import vetRoute from "./routes/vet.Routes.js";

app.use("/api/v1/user", registerRoute);
app.use("/api/v1/pet", registerPetRoute);
app.use("/api/v1/appointment", appointmentRoute);
app.use("/api/v1/vet", vetRoute);

export default app;
