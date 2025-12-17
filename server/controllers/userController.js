import User from "../models/userModel.js";
import generateOTP from "../utils/otpGenerator.js";
import sendOtpToEmail from "../service/emailService.js";
import twilioService from "../service/twilioService.js";
import response from "../utils/resHandler.js";
import generateToken from "../utils/jwtToken.js";
import Conversation from "../models/convoModel.js";
import { uploadFileToCloudinary } from "../config/cloudinaryConfig.js";

//Step-1
const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = generateOTP();
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
  let user;
  try {
    if (email) {
      const normalizedEmail = email.toLowerCase();
      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        user = new User({ email: normalizedEmail });
      }
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();
      await sendOtpToEmail(normalizedEmail, otp);
      return response(res, 200, "OTP sent to email", {
        email: normalizedEmail,
      });
    }

    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone number and suffix are required");
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;

    // Try to find user by normalized full phone number first.
    user = await User.findOne({ phoneNumber: fullPhoneNumber });

    // If not found, try to find users that were stored with local number only
    // (legacy or inconsistent format). If found, normalize that user to the
    // full phone number to avoid duplicate accounts.
    if (!user) {
      const localUser = await User.findOne({ phoneNumber: phoneNumber });
      if (localUser) {
        localUser.phoneNumber = fullPhoneNumber;
        localUser.phoneSuffix = phoneSuffix;
        user = localUser;
      } else {
        user = new User({ phoneNumber: fullPhoneNumber, phoneSuffix });
      }
    }

    await twilioService.sendOtpToPhoneNumber(fullPhoneNumber);
    await user.save();
    return response(res, 200, "OTP sent successfully", user);
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return response(res, 500, "Internal Server Error");
  }
};

// Step 2 - Verify OTP
const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body;

  try {
    let user;
    if (email) {
      const normalizedEmail = email.toLowerCase();
      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return response(res, 404, "User not found");
      }
      const now = new Date();
      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > new Date(user.emailOtpExpiry)
      ) {
        return response(res, 400, "Invalid or expired OTP");
      }
      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } else {
      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;

      // Try to find by normalized full number first
      user = await User.findOne({ phoneNumber: fullPhoneNumber });

      // If not found, also try matching users stored with just the local number
      // (legacy entries). If found, normalize and continue.
      if (!user) {
        user = await User.findOne({ phoneNumber: phoneNumber });
        if (user) {
          user.phoneNumber = fullPhoneNumber;
          user.phoneSuffix = phoneSuffix;
          await user.save();
        }
      }

      if (!user) {
        return response(res, 404, "User not found");
      }
      const result = await twilioService.verifyOtp(fullPhoneNumber, otp);
      if (result.status !== "approved") {
        return response(res, 400, "Invalid or expired OTP");
      }
      user.isVerified = true;
      await user.save();
    }
    const token = generateToken(user?._id);
    res.cookie("token", token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });
    return response(res, 200, "OTP verified successfully", { token, user });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return response(res, 500, "Internal Server Error");
  }
};

const updateProfile = async (req, res) => {
  const { userName, agreed, about } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    const file = req.file;

    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      console.log(uploadResult);
      user.profilePicture = uploadResult?.secure_url;
    } else if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }
    if (userName) user.userName = userName;
    if (agreed) user.agreed = agreed;
    if (about) user.about = about;
    await user.save();
    // console.log(user)
    return response(res, 200, "user profile updated successfully", user);
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return response(res, 500, "Internal Server Error");
  }
};

const checkAuthenticated = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return response(
        res,
        401,
        "User not authenticated, please log in before accessing zingIT."
      );
    }
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 401, "User not found!.");
    }
    return response(
      res,
      200,
      "User is authenticated, You can access zingIT",
      user
    );
  } catch (error) {
    console.error("Error in checkAuthenticated:", error);
    return response(res, 500, "Internal Server Error");
  }
};

const logOut = async (req, res) => {
  try {
    res.cookie("token", "", { expires: new Date(0) });
    return response(res, 200, "Logged out successfully");
  } catch (error) {
    console.error("Error in logOut:", error);
    return response(res, 500, "Internal Server Error");
  }
};

const getAllUsers = async (req, res) => {
  const loggedInUser = req.user.userId;
  try {
    const user = await User.find({ _id: { $ne: loggedInUser } })
      .select(
        "userName profilePicture lastSeen isOnline about phoneNumber phoneSuffix"
      )
      .lean();

    const usersWithConversation = await Promise.all(
      user.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUser, user?._id] },
        })
          .populate({
            path: "lastMessage",
            select: "content createdAt sender receiver",
          })
          .lean();

        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );
    return response(
      res,
      200,
      "Users fetched successfully",
      usersWithConversation
    );
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return response(res, 500, "Internal Server Error");
  }
};

export default {
  sendOtp,
  verifyOtp,
  updateProfile,
  logOut,
  checkAuthenticated,
  getAllUsers,
};
