const jwt = require('jsonwebtoken');

const generateAccessToken = async(user) => {
    return jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1m' });
};

const generateRefreshToken = async(user) => {
    return jwt.sign(user, process.env.ACCESS_SECRET_REFRESH_TOKEN, { expiresIn: '2h' });
};

module.exports = { generateAccessToken, generateRefreshToken };
