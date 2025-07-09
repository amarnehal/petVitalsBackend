import app from "./src/app.js";
import dotenv from "dotenv";
import conectDb from "./src/db/connection.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

dotenv.config(
    {
        path:"./.env"
    }
)

app.use(cookieParser());
app.use(cors({ credentials: true}));

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

conectDb().then(()=>{
    app.listen(PORT,()=>{
        console.log("DB is connect successfully. App is running on Port - ",PORT );
    })
  
    
}).catch((error)=>{
    console.log("Connection to DB is unsuccessfull - ",error)
})

console.log("Hello app");
