const userModel = require("../models/user");
const jwt = require("jsonwebtoken");

async function authUserMiddlewar(req, res, next) {
  const token =
    req.cookies?.token ||
    req.headers["x-access-token"] ||
    req.headers.authorization?.split(" ")[1];

  // console.log("AUTH HEADER:", req.headers.authorization);
  // console.log("TOKEN:", token);

  if (!token) {
    return res.status(401).json({
      message: "U have to login first",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("DECODED:", decoded);

    const userId = decoded.id || decoded._id;

    const user = await userModel.findById(userId);
    // console.log("DECODED:", decoded);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
}

module.exports = authUserMiddlewar;
