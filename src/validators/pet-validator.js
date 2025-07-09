import { body } from "express-validator";

const petMedicalInfoValidator = () => {
    return [
  body("disease").trim().notEmpty().withMessage("Disease is a required field"),
    body("lastVaccinationDate")
      .isISO8601()
      .withMessage("Please provide date in YYYY-MM-DD format (e.g., 2025-06-01)"),
    body("nextVaccinatonScheduleDate")
      .isISO8601()
      .withMessage("Please provide a correct next sechdule date . Format should be YYYY-MM-DD (e.g., 2025-06-01)")
      ]
};

export { petMedicalInfoValidator}