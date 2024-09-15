const jwt = require('jsonwebtoken');
const User = require("../models/userModel");
const { generateAccessToken } = require('../helpers/generateToken');const islogin = async (req, res, next) => {
    try {
        if (req.cookies.sellerrefreshToken) {
            // If the user is logged in, allow access to the requested route
            return next();
        } else {
            req.flash("msg", 'invalid token log!');
            return res.redirect('/seller/login');
        }
    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: 'Something went wrong1',
        });
    }
  }
  
  // Middleware to check if the user is logged out
  const islogout = async (req, res, next) => {
    try {
        
        if (req.cookies.sellerrefreshToken) {
            return res.redirect('/seller/home');
        } else {
            return next();
        }
    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: 'Something went wrong2',
        });
    }
  }


const onlySellerAccess = async (req, res, next) => {
    try {
        if (req.session.user.role != 'seller') {
            return res.status(400).json({
                success: false,
                msg: 'You do not have permission to access this route!',
            });
        }
        next(); // Call next only if no response was sent
    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: 'Something went wrong',
        });
    }
};



const authenticateToken = async (req, res, next) => {
    const accessToken = req.cookies.sellertoken || req.body.token || req.query.token || req.headers["authorization"];
    // console.log("right 11       ",accessToken);
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
    const refreshToken = req.cookies.sellerrefreshToken;
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
        res.cookie('sellertoken', accessToken, { maxAge: 60000 });
        return true;
    } catch (err) {
        res.sendStatus(403);
        return false; // Stop further execution
    }
};

module.exports={
    islogin,
    islogout,
    onlySellerAccess,
    authenticateToken
}