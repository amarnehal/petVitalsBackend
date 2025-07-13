import mongoose, { Schema } from "mongoose";
import { UserRolesEnum, AvailableUserRolesEnum } from "../utils/constants.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: [true, "UserName is required "],
      unique: [true, "UserName must be a unique value can include numbers"],
    },
    email: {
  type: String,
  required: function () {
    return !this.createdByVet && !this.phoneNumber;
  },
  unique: true,
  sparse: true,
},
phoneNumber: {
  type: String,
  required: function () {
    return !this.createdByVet && !this.email;
  },
  unique: true,
  sparse: true,
},
    notificationMode: {
      type: String,
      enum: ["Message", "Email"],
      default: "Message",
    },
    password: {
      type: String,
      required: function () {
        return this.isClaimed;
      },
    },
    refreshToken: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    forgotPasswordToken: {
      type: String,
    },
    forgotPasswordExpiry: {
      type: Date,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpiry: {
      type: Date,
    },
    role: {
      type: String,
      enum: AvailableUserRolesEnum,
      default: UserRolesEnum.VET,
    },
    isClaimed: {
      type: Boolean,
      default: true, // for regular signups by users
    },
    createdByVet: {
      type: Boolean,
      default: false,
    },

  },
  { timestamps: true },
);


///// Password Encrypt /////////////////

userSchema.pre("save", async function (next) {
  if (this.isClaimed && !this.password) {
    return next(new Error("Password is required for claimed accounts."));
  }

  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/////////////Compare password ////////////

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//////////////GENERATE Access Token ////////////////

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      role:this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );
};

///////////

userSchema.methods.generateTemporaryToken = function () {
  const unhashedToken = crypto.randomBytes(20).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(unhashedToken)
    .digest("hex");

  const tokenExpiry = Date.now() + 60 * 60 * 1000;  /// 1 hour

  return { unhashedToken, hashedToken, tokenExpiry };
};

///////////// Hide sensitive fields on output ////////////
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.emailVerificationToken;
  delete obj.forgotPasswordToken;
  return obj;
};


export const User = mongoose.model("User", userSchema);
