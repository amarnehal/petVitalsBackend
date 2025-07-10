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

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended:true}))

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