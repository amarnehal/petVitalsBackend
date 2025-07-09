import { Router } from "express";
import { createVetInfo, vetInfoById, vetInfo, updateVet, updateVetInfoProfile, removeVet,getAllUsersWithPets,registerPetWithOwner} from "../controller/vet.controllers.js";
import { isUserLoggedIn,isVetAccount } from "../middlewares/auth.middleware.js";

const router = new Router();

router.route("/registermedicalinfo").post(isUserLoggedIn,isVetAccount,createVetInfo);

router.route("/vetinfobyuser/:id").get(isUserLoggedIn,vetInfoById);

router.route("/vetinfo").get(isUserLoggedIn,isVetAccount,vetInfo);

router.route("/updatevet").put(isUserLoggedIn,isVetAccount,updateVet);

router.route("/updatevetinfo").put(isUserLoggedIn,isVetAccount,updateVetInfoProfile);

router.route("/remove").delete(isUserLoggedIn,isVetAccount,removeVet);

////// get all the registered users with pets and medical info
router.route("/users-with-pets").get(isUserLoggedIn,isVetAccount,getAllUsersWithPets);

router.route("/register-user-pet").post(isUserLoggedIn,isVetAccount,registerPetWithOwner);


export default router;