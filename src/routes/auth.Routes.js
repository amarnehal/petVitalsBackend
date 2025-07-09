import {Router} from "express";
import { registerUser,getUserProfile,verifyUser,logIn,logOut,forgotPassword,resetPassword,claimAccount } from "../controller/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import { userRegisterValidator } from "../validators/user-validators.js";
import { isUserLoggedIn} from "../middlewares/auth.middleware.js";

const router = new Router();

router.route("/register").post(userRegisterValidator(),validate,registerUser)

router.route("/verifyUser/:token").get(verifyUser)

router.route("/login").post(logIn)

router.route("/logout").get(isUserLoggedIn,logOut)

router.route("/forgotpassword").post(forgotPassword)

router.route("/resetpassword/:token").post(resetPassword)

router.route("/getuser").get(isUserLoggedIn,getUserProfile)

//// user can claim this account when it's created by a vet
router.route("/claim-account/:token").post(claimAccount)

export default router;