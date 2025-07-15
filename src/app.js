import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const app = express();

const allowedOrigins = [
  "https://pet-vitals-frontend.vercel.app",
  "https://pet-vitals-frontend.vercel.app/",
  "http://localhost:5173",
];

const corsOptionsDelegate = (origin, callback) => {
  console.log("CORS request from origin:", origin); // ✅ log the incoming origin

  if (!origin) {
    console.log("No origin, allowing request");
    return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) {
    console.log("Origin allowed:", origin);
    return callback(null, true);
  } else {
    console.log("Origin not allowed:", origin);
    return callback(new Error("Not allowed by CORS"));
  }
};
const corsOptions = {
  origin: corsOptionsDelegate,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  
};
console.log("Cors Options here-----",corsOptions);


app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log("----- [RESPONSE HEADERS] -----");
    console.log("Access-Control-Allow-Origin:", res.get("Access-Control-Allow-Origin"));
    console.log("Access-Control-Allow-Credentials:", res.get("Access-Control-Allow-Credentials"));
  });
  next();
})

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
