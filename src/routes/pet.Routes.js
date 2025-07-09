import { Router } from "express";
import { registerPet,updatePetInfo,createPetMedicalRecord,getPetInfo,updatePetMedicalInfo,removePet } from "../controller/pet.controllers.js";
import { isUserLoggedIn ,isLoggedInUserPetOwner,isVetAccount, isVetOrOwnerOfPet} from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { petMedicalInfoValidator } from "../validators/pet-validator.js";
import {validate } from "../middlewares/validator.middleware.js";

const router = new Router();

//// register pet route for both user and vet //

router.route("/register").post(isUserLoggedIn,registerPet);

//// update pet basic profile route for petOwner user
router.route("/update/:id").post(isUserLoggedIn,isVetOrOwnerOfPet,updatePetInfo)

////// create pet medical record for pet Owner user
router.route("/medicalinfo/:id").post(isUserLoggedIn,isVetOrOwnerOfPet,upload.fields(
    [
        {
            name:"XRay",
            maxCount:4,
        },
        {
            name:"Reports",
            maxCount:4,
        },
        {
            name:"Prescription",
            maxCount:2,
        }

    ]),petMedicalInfoValidator(),validate,createPetMedicalRecord)

router.route("/update/medicalinfo/:id").patch(
        isUserLoggedIn,
        isVetAccount,
        upload.fields([  {
            name:"XRay",
            maxCount:4,
        },
        {
            name:"Reports",
            maxCount:4,
        },
        {
            name:"Prescription",
            maxCount:2,
        }]),
        updatePetMedicalInfo
      );
      

router.route("/petdetails/:id").get(isUserLoggedIn,isVetOrOwnerOfPet,getPetInfo)
router.route("/removepet/:id").delete(isUserLoggedIn, isVetOrOwnerOfPet, removePet)
export default router;