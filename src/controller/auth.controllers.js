
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/api-response.js";
import { User } from "../models/user.models.js";
import { sendEmail, emailVerificationMailGenContent, forgotPasswordContent } from "../utils/mail.js";
import crypto from "crypto";

// Register User
const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, phoneNumber, password } = req.body;

  if (!userName || !email || !phoneNumber || !password) {
    return res.status(400).json(new ApiResponse(400, "All fields are required"));
  }

  const existingUser = await User.findOne({ email }).select("+password");
  if (existingUser) {
    if (!existingUser.isClaimed && existingUser.createdByVet) {
      return res.status(400).json(new ApiResponse(400, "An account has already been created by your vet. Please check your email to claim it."));
    }
    return res.status(400).json(new ApiResponse(400, "Email already in use"));
  }

  const newUser = await User.create({ userName, email, password, phoneNumber, isClaimed: true, createdByVet: false });

  const { unhashedToken, hashedToken, tokenExpiry } = newUser.generateTemporaryToken();

  newUser.emailVerificationToken = hashedToken;
  newUser.emailVerificationExpiry = tokenExpiry;
  await newUser.save();

  const mailContent = await emailVerificationMailGenContent(newUser.userName, `${process.env.BASE_URL}/api/v1/user/verifyUser/${unhashedToken}`);
  await sendEmail({ email: newUser.email, subject: "Verification Email", mailGenContent: mailContent });

  const safeUser = await User.findById(newUser._id).select("-password -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry");
  return res.status(201).json(new ApiResponse(201, "User has been created successfully", safeUser));
});

// Verify User
const verifyUser = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json(new ApiResponse(400, "No token received"));

  const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");

  const user = await User.findOne({ emailVerificationToken: hashedToken, emailVerificationExpiry: { $gt: Date.now() } });
  if (!user) return res.status(400).json(new ApiResponse(400, "Invalid or expired token"));

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();

  return res.status(200).json(new ApiResponse(200, "User verified successfully"));
});

// Login User
const logIn = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json(new ApiResponse(400, "Please provide email and password"));
  }

  const existingUser = await User.findOne({ email }).select("+password");
  if (!existingUser) {
    return res.status(400).json(new ApiResponse(400, "User not found. Please register your account"));
  }

  if (existingUser.createdByVet && !existingUser.isClaimed) {
    return res.status(400).json(new ApiResponse(400, "An account has already been created by your vet. Please check your email to claim it."));
  }

  const isPasswordValid = await existingUser.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(400).json(new ApiResponse(400, "Incorrect email or password"));
  }

  const accessToken = existingUser.generateAccessToken();
 res.cookie("token", accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',    // true on Render
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',  // None for cross-origin
  maxAge: 24 * 60 * 60 * 1000,
});

  const safeUser = {
    id: existingUser._id,
    userName: existingUser.userName,
    email: existingUser.email,
    role:existingUser.role,
  };

  return res.status(200).json(new ApiResponse(200, "Login successful", { accessToken, user: safeUser }));
});

// Get User Profile
const getUserProfile = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const user = await User.findById(_id).select("-password -emailVerificationToken -forgotPasswordToken -forgotPasswordExpiry");
  if (!user) return res.status(404).json(new ApiResponse(404, "User not found"));
  res.status(200).json(new ApiResponse(200, "User profile fetched", user));
});

// Logout User
const logOut = asyncHandler(async (req, res) => {
  res.cookie("token", "", { httpOnly: true, secure: true, expires: new Date(0) });
  res.status(200).json(new ApiResponse(200, "User has logged out successfully"));
});

// Forgot Password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json(new ApiResponse(400, "No user found with provided email"));

  const { unhashedToken, hashedToken } = user.generateTemporaryToken();
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.BASE_URL}/api/v1/user/resetpassword/${unhashedToken}`;
  const mailContent = await forgotPasswordContent(user.userName, resetUrl);
  await sendEmail({ email: user.email, subject: "Reset Password", mailGenContent: mailContent });

  const safeUser = await User.findById(user._id).select("-password -forgotPasswordToken -emailVerificationToken -emailVerificationExpiry");
  res.status(200).json(new ApiResponse(200, "Forgot password token created successfully", safeUser));
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!token || !password) return res.status(400).json(new ApiResponse(400, "Invalid request"));

  const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");
  const user = await User.findOne({ forgotPasswordToken: hashedToken, forgotPasswordExpiry: { $gt: Date.now() } });
  if (!user) return res.status(400).json(new ApiResponse(400, "Invalid or expired token"));

  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  await user.save();

  res.status(200).json(new ApiResponse(200, "Password updated successfully"));
});

// Claim Account
const claimAccount = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!token || !newPassword) return res.status(400).json(new ApiResponse(400, "Invalid request"));

  const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");
  const user = await User.findOne({ emailVerificationToken: hashedToken, emailVerificationExpiry: { $gt: Date.now() }, isClaimed: false, createdByVet: true });

  if (!user) return res.status(400).json(new ApiResponse(400, "Invalid or expired token"));

  user.password = newPassword;
  user.isClaimed = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();

  res.status(200).json(new ApiResponse(200, "Account claimed successfully"));
});

export { registerUser, verifyUser, logIn, getUserProfile, logOut, forgotPassword, resetPassword, claimAccount };
