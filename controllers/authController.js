const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokenGenerator");
const { createSecurityAlertNotification } = require("./Notificationcontroller");

const generateReferralCode = (name) => {
  return name.toLowerCase() + Math.random().toString(36).substring(2, 8);
};

// REGISTER USER

async function registerUser(req, res) {
  console.log("REQ BODY:", req.body);
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      gender,
      agreeToTerms,
      phoneNumber,
      referralCode,
    } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !firstName ||
      !lastName ||
      // !email ||
      !password ||
      !gender ||
      agreeToTerms === undefined
    ) {
      return res
        .status(400)
        .json({ message: "It's compulsory to fill all fields" });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid Email Format",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findOne({ referralCode });
    }

    let newReferralCode;
    let exists = true;

    while (exists) {
      newReferralCode = generateReferralCode(firstName);
      exists = await User.findOne({ referralCode: newReferralCode });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone: phoneNumber,
      password: hashedPassword,
      gender,
      agreeToTerms,
      referralCode: newReferralCode,
      referredBy: referredByUser ? referredByUser._id : null,
    });

    if (referredByUser) {
      await User.findByIdAndUpdate(referredByUser._id, {
        $push: { referredUsers: user._id },
      });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.status(201).json({
      message: "User registered successfully",
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
}

//Checking Email if already existed

async function checkEmail(req, res) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (user) {
      return res.status(409).json({ message: "User Email already Exists" });
    }

    return res.json({
      exists: false,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// LOGIN USER

async function loginUser(req, res) {
  try {
    const { identifier, password } = req.body;

    console.log("Identifier:", identifier);

    let user;

    if (identifier && identifier.includes(" ")) {
      const [firstName, lastName] = identifier.trim().split(" ");

      user = await User.findOne({
        firstName: firstName,
        lastName: lastName,
      });
    } else {
      user = await User.findOne({
        email: identifier,
      });
    }

    console.log("User found:", user);

    if (!user) {
      return res.status(400).json({
        message: "Invalid Email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message:
          "Your account is deactivated. Do you want to Re-activate the account?",
        canReactivate: true,
        userId: user._id,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid Email or password",
      });
    }

    // generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 5 * 60 * 1000;

    await user.save();

    // send OTP email using your existing function
    await sendEmail({
      to: user.email,
      subject: "Login OTP",
      text: `Hey ${user.firstName}, your login OTP is ${otp}`,
    });

    return res.status(200).json({
      message: "OTP sent to your email",
      email: user.email,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
}

// Verifying login OTP

async function verifyLoginOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({
          message:
            "Email not found in our system.Please enter registered E-mail",
        });
    }

    if (
      !user.resetPasswordOtp ||
      String(user.resetPasswordOtp) !== String(otp)
    ) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.resetPasswordOtpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otpType === "reactivation") {
      user.isActive = true;
    }

    // clear OTP
    user.resetPasswordOtp = "";
    user.resetPasswordOtpExpires = null;
    user.otpType = undefined;

    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    const fullUser = await User.findById(user._id)
      .select(
        "-password -refreshToken -resetPasswordOtp -resetPasswordOtpExpires",
      )
      .populate("friendRequestsReceived", "firstName lastName avatar")
      .populate("friendRequestsSent", "firstName lastName avatar")
      .populate("friends", "firstName lastName avatar");

    const securityNotification = await createSecurityAlertNotification(
      user._id,
      user._id,
      {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    );

    if (securityNotification && req.io) {
      req.io.to(user._id.toString()).emit("notification_received", {
        type: "security_alert",
        notification: securityNotification,
      });
    }

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: fullUser,
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
}

// refresh access token

async function refreshAccessToken(req, res) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user);

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: "Expired refresh token" });
  }
}

// LOGOUT USER

async function logoutUser(req, res) {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    return res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", err });
  }
}

// Sending verified OTP
async function sendVerifyOtp(req, res) {
  console.log("Body recived:", req.body);
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // if(user.isAccountVerified) {
    //   return res.status(200).json({message: "User is alreaddy verified"})
    // }

    if (!user) {
      return res
        .status(404)
        .json({
          message:
            "Email not found in our system. Please, enter registered E-mail",
        });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    const mailOption = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password recovery OTP",
      text: `Hey ${user.firstName}, here is your "Account Verification" OTP: ${otp}`,
    };
    await sendEmail(mailOption);

    return res.status(201).json({ message: "OTP generated successfully" });
  } catch (err) {
    console.log("Error:", err);
    return res.status(500).json({ message: err.message });
  }
}

// FORGOT PASSWORD

async function forgetPass(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res
        .status(404)
        .json({
          message:
            "Email not found in our system.Please enter registered E-mail",
        });
    }

    const resetToken = user.createResetpasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/api/auth/reset-password/${resetToken}`;

    const mailOption = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password recovery OPT",
      text: `Hey ${user}, here is you recovery otp ${resetPasswordOtp}`,
    };

    await sendEmail(mailOption);

    // await sendEmail({
    //   from: process.env.EMAIL_USER,
    //   to:user.email,
    //   subject:"Password Re-covery",
    //   html:`
    //     <h2>Password Reset</h2>
    //     <a href="${resetUrl}">${resetUrl}</a>`
    // });

    return res.status(200).json({ message: "reset link sent on email" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "server errro", error: err.message });
  }
}

// Verifying the OTP

async function verifyEmial(req, res) {
  const { email, resetPasswordOtp } = req.body;

  if (!email || !resetPasswordOtp) {
    return res.status(404).json({ message: "Missing Detail" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== resetPasswordOtp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    if (user.resetPasswordOtpExpires < Date.now()) {
      return res.status(410).json({ message: "Token has been expeired" });
    }

    user.isAccountVerified = true;
    user.resetPasswordOtp = "";
    user.resetPasswordOtpExpires = 0;

    await user.save();

    return res.status(200).json({ message: "Email verify successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// Is User Athenticated
async function isAuthenticated(req, res) {
  try {
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

// PASSWORD RESET USING OTP(NEW)

async function resetPassword(req, res) {
  const { email, resetPasswordOtp, newPassword } = req.body;

  if (!email || !resetPasswordOtp || !newPassword)
    return res.status(400).json({ message: "All the feilds are required" });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({
        message:
          "Email not found in our system. Please enter a registered email.",
      });

    if (
      user.resetPasswordOtp == "" ||
      user.resetPasswordOtp !== resetPasswordOtp
    )
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    if (user.resetPasswordOtpExpires < Date.now())
      return res.status(410).json({ success: false, message: "OTP expeired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordOtp = "";
    user.resetPasswordOtpExpires = 0;

    await user.save();

    return res.status(201).json({ message: "Password reset successfully" });
  } catch (err) {
    return res.status(500).json({ message: message });
  }
}

async function deactivateUser(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isActive: false },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Account deactivated successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// REACTIVATION REQUEST
async function requestReactivation(req, res) {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isActive) {
      return res.status(400).json({ message: "Account already active" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 5 * 60 * 1000;
    user.otpType = "reactivation";

    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Account Reactivation OTP",
      text: `Welcome back ${user.firstName}, your account reactivation OTP is ${otp}`,
    });

    return res.status(200).json({
      message: "Re-activation OTP sent to your E-mail",
      email: user.email,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function activateUser(req, res) {
  try {
    const user = await User.findOneAndUpdate(
      req.user._id,
      { isActive: true },
      { new: false },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Account Activated successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// Delete Account

async function deleteUser(req, res) {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();

    res.json({
      message: "User Deleted Successfully",
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Get Profile

// const getProfile = async (req, res) => {
//   try {
//     // req.user already comes from your middleware
//     const user = await User.findById(req.user._id).select(
//       "-password -refreshToken",
//     );

//     if (!user) {
//       return res.status(404).json({
//         message: "User not found",
//       });
//     }

//     res.status(200).json({
//       message: "Profile fetched successfully",
//       user,
//     });
//   } catch (err) {
//     console.error("GET PROFILE ERROR:", err);
//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// };
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -refreshToken")
      .populate("friendRequestsReceived", "firstName lastName avatar")
      .populate("friendRequestsSent", "firstName lastName avatar")
      .populate("friends", "firstName lastName avatar")
      .populate("referredUsers", "firstName lastName avatar createdAt");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile fetched successfully",
      user,
    });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get User By ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -refreshToken")
      .populate("friendRequestsReceived", "firstName lastName avatar")
      .populate("friendRequestsSent", "firstName lastName avatar")
      .populate("friends", "firstName lastName avatar");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (err) {
    console.error("GET USER BY ID ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Update Profile

const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log("body:", req.body);
    console.log("files:", req.files);

    const allowedFields = [
      "firstName",
      "lastName",
      "gender",
      "phoneNumber",
      "coverImage",
      "avatar",
      "bio",
      "website",
      "location",
      "dob",
      "tags",
    ];

    const updates = {};

    for (let key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    //  Name validation
    if (updates.firstName && updates.firstName.length < 2) {
      return res.status(400).json({
        message: "First name must be at least 2 characters",
      });
    }

    if (updates.lastName && updates.lastName.length < 1) {
      return res.status(400).json({
        message: "Last name is required",
      });
    }

    //  Phone validation (basic)
    if (
      updates.phoneNumber &&
      !/^(\+91)?[6-9]\d{9}$/.test(updates.phoneNumber)
    ) {
      return res.status(400).json({
        message: "Enter Valid Mobile Number ",
      });
    }

    //  Gender validation
    if (
      updates.gender &&
      !["male", "female", "other"].includes(updates.gender)
    ) {
      return res.status(400).json({
        message: "Invalid gender value",
      });
    }

    if (updates.bio && updates.bio.length > 200) {
      return res.status(400).json({
        message: "Bio cannot exceed 200 characters",
      });
    }

    if (updates.tags && !Array.isArray(updates.tags)) {
      updates.tags = [updates.tags];
      return res.status(400).json({
        message: "Tags must be an array",
      });
    }

    if (req.files?.avatar) {
      const avatarUrl = req.files.avatar[0].path;
      // Validate it's a Cloudinary URL
      if (!avatarUrl || !avatarUrl.includes("cloudinary.com")) {
        return res.status(400).json({
          message: "Invalid avatar: must be uploaded to Cloudinary",
        });
      }
      updates.avatar = avatarUrl;
    }

    if (req.files?.coverImage) {
      const coverUrl = req.files.coverImage[0].path;
      // Validate it's a Cloudinary URL
      if (!coverUrl || !coverUrl.includes("cloudinary.com")) {
        return res.status(400).json({
          message: "Invalid cover image: must be uploaded to Cloudinary",
        });
      }
      updates.coverImage = coverUrl;
    }

    if (updates.tags && !Array.isArray(updates.tags)) {
      updates.tags = [updates.tags];
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] === "") delete updates[key];
    });

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password -refreshToken");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// Send Invite
async function sendInvite(req, res) {
  try {
    const { toEmail } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!toEmail || !emailRegex.test(toEmail)) {
      return res.status(400).json({
        message: "Invalid email format ❌",
      });
    }

    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const referralCode = currentUser.referralCode || "";
    const inviteLink = `${process.env.CLIENT_URL}/?ref=${referralCode}`;

    await sendEmail({
      to: toEmail,
      subject: `${currentUser.firstName} invited you to BeSocial 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; background:#f6f6f6; padding:20px;">
          <div style="">
            
            <div style="">
              <h4 style = "color:#8C5A3C;">Hey there 👋</h4>
              <p>

                <b style = "color:#8C5A3C;" >${currentUser?.firstName || "User"} ${currentUser?.lastName || ""}</b> this side. </br>
                Haven't meet in long time, Lest's meet on  
                <b style = "color:#8C5A3C;">BeSocial</b> 🤎 a great social media platform.
              </p>
              <div style ="line-height:1.6; ">
              <div style=" margin:30px 0;">
                <a href="${inviteLink}" 
                  style="background:#8C5A3C; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none;">
                  Join Now →
                </a>
              </div>
              
              <H5>OR</H5>

              <p style="font-size:14px;">${inviteLink}</p>
              </div>
            </div>
            <div style="background:#fafafa; padding:12px; text-align:center; font-size:11px; color:#999;">
              © ${new Date().getFullYear()} BeSocial
            </div>
          </div>
        </div>`,
      replyTo: currentUser.email,
    });

    return res.status(200).json({ message: "Invite sent successfully" });
  } catch (err) {
    console.error("SEND INVITE ERROR:", err);
    return res.status(500).json({ message: "Failed to send invite" });
  }
}

module.exports = {
  registerUser,
  loginUser,
  verifyLoginOtp,
  logoutUser,
  forgetPass,
  resetPassword,
  sendVerifyOtp,
  verifyEmial,
  isAuthenticated,
  checkEmail,
  refreshAccessToken,
  deleteUser,
  deactivateUser,
  requestReactivation,
  activateUser,
  getProfile,
  updateProfile,
  getUserById,
  sendInvite,
};
