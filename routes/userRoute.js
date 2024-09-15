const express=require('express');
const user_router = express.Router();

// const multer=require('multer');
const user_controllers=require("../controllers/userController")
const {registerValidator,loginValidator,forgetEmailValidator,forgetPasswordValidator}=require('../helpers/vaildator')
const {authenticateToken ,islogout,islogin} = require('../middlewares/authenticateToken');
const csrfProtection = require('../middlewares/csrfProtection');

user_router.get("/signup",islogout,csrfProtection,user_controllers.loadRegister)
user_router.post("/signup",registerValidator,user_controllers.signupUser)

user_router.get("/login", islogout,csrfProtection,user_controllers.loadlogin)
user_router.post("/login",loginValidator,user_controllers.loginUser)

// user_router.post('/token', user_controllers.token);
// user_router.get('/token',(req,res)=>{
//     res.render('token')
// });


//forget password  email
user_router.get("/forget",islogout,user_controllers.forgetLoad)
user_router.post("/forget",forgetEmailValidator,user_controllers.forgetVerify)

// verify the email
user_router.get('/verify',user_controllers.verifyEmail)

//forget password
user_router.get('/forget-password',islogout,user_controllers.forgetPasswordLoad)
user_router.post('/forget-password',forgetPasswordValidator,user_controllers.resetPassword)

//logout 
user_router.get('/logout',islogin,authenticateToken,user_controllers.userLogout)

//verify the email
user_router.get('/verification',islogout,user_controllers.verificationLoad)
user_router.post('/verification',forgetEmailValidator,user_controllers.sendverification)

user_router.get("/shops/:id",user_controllers.loadSellerShop)
user_router.get("/shops",user_controllers.loadShop)

user_router.get("/cart-count",user_controllers.cartCount)
// user_router.post("/shops/:id",upload.single('image'),user_controllers.SellerShops)

user_router.post("/cart/:id",user_controllers.addToCart)

user_router.post("/checkout",islogin,authenticateToken,user_controllers.orderStore)

user_router.get("/cart",user_controllers.getCart)


user_router.get('/home', islogin,authenticateToken,user_controllers.loadHome);
user_router.get('/',user_controllers.loadHome);

module.exports  = user_router
