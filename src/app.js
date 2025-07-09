import express from "express";
import cookieParser from "cookie-parser";


const app = express();

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