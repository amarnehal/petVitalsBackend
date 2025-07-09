
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(  {
    path:"./.env"
})


console.log("this messsage",process.env.MONGO_URI);

const conectDb = async()=>{
    try {
        const response = await mongoose.connect(process.env.MONGO_URI)
    } catch (error) {
        console.log("MongoDb Connection failed",error)
        process.exit(1)
    } 
}

export default conectDb;