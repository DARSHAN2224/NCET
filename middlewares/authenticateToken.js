const jwt = require('jsonwebtoken');
const User = require("../models/userModel");
const { generateAccessToken } = require('../helpers/generateToken');
const islogin = async (req, res, next) => {
  try {
      if (req.cookies.refreshToken) {
          // If the user is logged in, allow access to the requested route
          return next();
      } else {
          // If the user is not logged in, redirect to the login page
          return res.redirect('/login');
      }
  } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal Server Error");
  }
}

// Middleware to check if the user is logged out
const islogout = async (req, res, next) => {
  try {
      if (req.cookies.refreshToken) {
          return res.redirect('/home');
      } else {
          return next();
      }
  } catch (error) {
      console.log(error.message);
      res.status(500).send("Internal Server Error");
  }
}

const authenticateToken = async (req, res, next) => {
    const accessToken = req.cookies.token || req.body.token || req.query.token || req.headers["authorization"];
    if (!accessToken) {
        const tokenRenewed = await renewtoken(req, res);
        // console.log("right        ",tokenRenewed);
        if (tokenRenewed) {
           return next();
        }
    } else {
        try {
            const decodedData = jwt.verify(accessToken, process.env.ACCESS_SECRET_TOKEN);
            const userData = await User.findOne({ email: decodedData.user });
            req.user = userData;
            req.session.user=userData;
        } catch (error) {
            return res.status(400).json({
                success: false,
                msg: 'Invalid Token one',
            });
        }
    }
    return   next();
};


const renewtoken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        res.redirect('/');
        return false; // Stop further execution
    }
    // console.log("refresh     ",refreshToken);
    
    const user = await User.findOne({ refreshToken });
    if (!user) {
        res.sendStatus(403);
        return false; // Stop further execution
    }
    // console.log("user     ",user);
    try {
        const userPayload = jwt.verify(refreshToken, process.env.ACCESS_SECRET_REFRESH_TOKEN);
        const accessToken = await generateAccessToken({ user: userPayload.user });
        const userData = await User.findOne({ email: userPayload.user });
        req.user = userData;
        req.session.user=userData;
        // console.log("after        ",accessToken);
        res.cookie('token', accessToken, { maxAge: 60000 });
        return true;
    } catch (err) {
        res.sendStatus(403);
        return false; // Stop further execution
    }
};

module.exports = {islogin,islogout,authenticateToken };

// const jwt = require("jsonwebtoken");
// const User = require("../models/userModel");
// const { generateAccessToken } = require("../helpers/generateToken");



// const authMiddleware = (options) => {
//   return async (req, res, next) => {
//     const role = req.user.role
//     const accessToken =
//       req.cookies.token ||
//       req.body.token ||
//       req.query.token ||
//       req.headers["authorization"];

//     if (!accessToken) {
//       const tokenRenewed = await renewToken(req, res);
//       if (tokenRenewed) {
//         if (options.requireAuth) {
//           return next(); // Token successfully renewed, proceed
//         } else {
//           if (role != 'admin')
//             return res.redirect("/home");
//           else if (role != 'seller')
//             return res.redirect("/home"); // Redirect if already logged in
//           else
//             return res.redirect("/seller/home");
//         }
//       } else {
//         if (options.requireAuth) {
//           return res.redirect("/login"); // Redirect to login if no valid token is available
//         } else {
//           return next(); // Proceed if route does not require authentication
//         }
//       }
//     } else {
//       try {
//         const decodedData = jwt.verify(
//           accessToken,
//           process.env.ACCESS_SECRET_TOKEN
//         );
//         const userData = await User.findOne({ email: decodedData.user });
//         req.user = userData;

//         if (options.requireAuth) {
//           return next(); // Proceed if route requires authentication
//         } else {
//           if (req.user.role != 'seller')
//             return res.redirect("/home"); // Redirect if already logged in
//           else
//             return res.redirect("/seller/home"); // Redirect if already authenticated
//         }
//       } catch (error) {
//         const tokenRenewed = await renewToken(req, res);
//         if (tokenRenewed) {
//           if (options.requireAuth) {
//             return next(); // Token successfully renewed, proceed
//           } else {
//             if (req.user.role != 'seller')
//               return res.redirect("/home"); // Redirect if already logged in
//             else
//               return res.redirect("/seller/home"); // Redirect if already logged in
//           }
//         } else {
//           if (options.requireAuth) {
//             return res.redirect("/login"); // Redirect to login if no valid token is available
//           } else {
//             return next(); // Proceed if route does not require authentication
//           }
//         }
//       }
//     }
//   };
// };

// const renewToken = async (req, res) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken) {
//     return false; // Stop further execution, no refresh token available
//   }

//   const user = await User.findOne({ refreshToken });
//   if (!user) {
//     res.sendStatus(403);
//     return false; // Stop further execution, invalid refresh token
//   }

//   try {
//     const userPayload = jwt.verify(
//       refreshToken,
//       process.env.ACCESS_SECRET_REFRESH_TOKEN
//     );
//     const accessToken = await generateAccessToken({ user: userPayload.user });
//     res.cookie("token", accessToken, { maxAge: 60000 });
//     return true;
//   } catch (err) {
//     res.sendStatus(403);
//     return false; // Stop further execution, refresh token verification failed
//   }
// };

// module.exports = authMiddleware;
