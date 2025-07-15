import {asyncHandler} from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/api-response.js";
import { Pet } from "../models/pet.models.js";
import { User } from "../models/user.models.js";
import { UserRolesEnum } from "../utils/constants.js";


const isUserLoggedIn = asyncHandler(async(req,res,next)=>{
    
    
   try {
    
   const token = req.cookies?.token;
    /// check if token is recieved or not //
    if(!token){
      return res.status(400).json(new ApiResponse(
        400,
        "Failed to get token in cookies. Please Log In ",
        false,
      ))   
    }
      /// decode token ///
      const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
      if(!decodedToken){
        return res.status(400).json(new ApiResponse(
            400,
            "Authentication Failed ",
            false,
        ))
      }
      /// create a new req key with user info ///
      req.user  = decodedToken;
      
      
      
    
   } catch (error) {
    return res.status(500).json(new ApiResponse(500, "Internal server error", false));
   }
   next();
})

/////////// pet Owner authentication //////

const isLoggedInUserPetOwner = async(req,res,next)=>{
  try {
    // check if petId is recieved or not //
    const {id: petId} = req.params;
    
    
    if(!petId){
      return res.status(400).json(new ApiResponse(400,"Invalid petId .. Please try again"))
    }
      // check if user is logged in 
    const {_id: userId} = req.user || {};
      if(!userId){
        return res.status(400).json(new ApiResponse(400,"Failed to retrieve the user .. Please Login first"))
    } 

    /// check if pet exists 
    const pet = await Pet.findById(petId)

    if(!pet){
        return res
      .status(404)
      .json(new ApiResponse(404, "Pet not found with the given ID"));
    }
    /// Check if login user id and pet owner Id's are same
      if (pet.petOwner.toString() !== userId.toString()) {
    return res.status(403).json(
      new ApiResponse(
        403,
        "You are not authorized to perform this action on this pet"
      )
    );
  }
   req.pet = pet;

  } catch (error) {
    return res.status(400).json(new ApiResponse(400,"Some error occured ",error.message))
  }
  next();
}


////// check if logged in user is a vet
const isVetAccount = asyncHandler(async(req,res,next)=>{
  try {
       /// first check if user is logged in using loged in middleware
       const {_id:userId} = req.user;
       if(!userId){
        return res.status(404).json(new ApiResponse(404,"User not authenticated"))
       }
       const user = await User.findOne({_id:userId})

       if(!user){
        return res.status(404).json(new ApiResponse(404,"No user found with the provided Id"))
       }
       if(!user || user.role !== UserRolesEnum.VET){
        return res.status(403).json(new ApiResponse(403,"Access denied ! Not a Vet"));
       }
       req.vet = user;
         next();
       
  } catch (error) {
    
    return res.status(500).json(new ApiResponse(500, "Internal server error", false));

  }

})

const isVetOrOwnerOfPet = async (req, res, next) => {
  const loggedInUser = req.user;

  if (!loggedInUser || !loggedInUser._id) {
    return res.status(401).json(new ApiResponse(401, "Unauthorized"));
  }

  const petId = req.params.id;
  const pet = await Pet.findById(petId).populate('petOwner');
  if (!pet) {
    return res.status(404).json(new ApiResponse(404, "Pet not found"));
  }

  const userId = loggedInUser._id.toString();
  const userRole = loggedInUser.role;  //
  

  const isVet = userRole === UserRolesEnum.VET;   // ✅ Check role
  const isOwner = pet.petOwner && pet.petOwner._id.toString() === userId;

  if (isVet || isOwner) {
    req.pet = pet;
    return next();
  }

  return res.status(403).json(new ApiResponse(403, "Not authorized"));
};



export {isUserLoggedIn,isLoggedInUserPetOwner,isVetAccount,isVetOrOwnerOfPet}