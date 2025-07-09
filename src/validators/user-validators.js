import { body } from "express-validator";

const userRegisterValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required ")
      .isEmail()
      .withMessage("Email should be valid"),
    body("userName").trim().notEmpty().withMessage("userName is required "),
    body("phoneNumber")
      .isMobilePhone()
      .notEmpty()
      .withMessage("Phone Number is required"),
    body("password")
      .isLength({ min: 5 })
      .withMessage("Password must be atleast 5 characters long")
      .notEmpty()
      .withMessage("Password is required"),
  ];
};

const userLogInValidator = () => {
  return [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is Required")
    .isEmail()
    .withMessage("Email should be valid"),
    body("password")
      .isLength({ min: 5 })
      .withMessage("Password must be atleast 5 characters long")
      .notEmpty()
      .withMessage("Password is required")
      ]
};


export { userRegisterValidator, userLogInValidator };
