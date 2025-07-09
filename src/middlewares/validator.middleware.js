import { validationResult } from "express-validator";
import {ApiError} from "../utils/api-error.js"

export const validate = (req,res, next) =>{
       const errors = validationResult(req)
       
       console.log("req", req.body);
       
       console.log("errors -",errors);
       
       if(errors.isEmpty()){
        return next();
       }

       console.log("Some error occured here");
       

       const extractedErrors = []

       errors.array().map((err)=> extractedErrors.push({
        [err.path]:err.msg
       }))

      throw new ApiError("Recieved data is not valid",422,extractedErrors)
}