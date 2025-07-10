import app from "./src/app.js";
import dotenv from "dotenv";
import conectDb from "./src/db/connection.js";
import express from "express";

dotenv.config(
    {
        path:"./.env"
    }
)


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
