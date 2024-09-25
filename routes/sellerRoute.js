const express=require('express');
const seller_router = express.Router();
const seller_controller=require("../controllers/seller/sellerController")
const {loginValidator}=require('../helpers/vaildator')
const {islogin,islogout,onlySellerAccess,authenticateToken}=require('../middlewares/sellerMiddleware')
const path = require('path');
const multer=require('multer')
const Order = require("../models/ordersModel");

// const {authenticateToken} = require('../middlewares/authenticateToken');
const csrfProtection = require('../middlewares/csrfProtection');

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,path.join(__dirname,'../public/Productimages'));
    },
    filename:(req,file,cb)=>{
        const name=Date.now()+'-'+file.originalname;
        cb(null,name);
    }
})

const upload=multer({storage:storage, fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images are allowed!'), false);
    }
    cb(null, true);
    }
})

// login for seller
seller_router.get("/login",islogout,csrfProtection,seller_controller.loadLogin)
seller_router.post("/login",loginValidator,seller_controller.loginSeller)
seller_router.get("/shopForm",islogin,authenticateToken,onlySellerAccess,seller_controller.loadSellerForm)
seller_router.post("/shopForm",upload.single('image'),seller_controller.SellerForm)

//logout route for seller
seller_router.get('/logout',islogin,authenticateToken,onlySellerAccess,seller_controller.userLogout)

// load home page for seller
seller_router.get('/home', islogin,authenticateToken,onlySellerAccess,seller_controller.loadHome )



// seller products
seller_router.get('/products',islogin,authenticateToken,onlySellerAccess,seller_controller.loadProducts)

seller_router.get('/addproducts',islogin,authenticateToken,onlySellerAccess,seller_controller.loadAddProducts)
seller_router.post('/addproducts',upload.single('image'),seller_controller.addProducts)

seller_router.get('/editproducts',islogin,authenticateToken,onlySellerAccess,seller_controller.loadEditProducts)
seller_router.post('/editproducts',upload.single('image'),seller_controller.editProducts)

seller_router.post('/deleteproducts/:id',upload.single('image'),seller_controller.deleteProducts)

//seller offers
seller_router.get('/offers',islogin,authenticateToken,onlySellerAccess,seller_controller.loadOffers)

seller_router.get('/addoffers',islogin,authenticateToken,onlySellerAccess,seller_controller.loadAddOffers)
seller_router.post('/addoffers',upload.single('image'),seller_controller.addOffers)

seller_router.post('/delete-offer/:id',upload.single('image'),seller_controller.deleteOffers)



//order page for seller
seller_router.get('/orders',islogin,authenticateToken,onlySellerAccess,seller_controller.loadOrders)

seller_router.post('/orders/accept/:orderId',islogin,authenticateToken,onlySellerAccess,seller_controller.orderAccept);

// Process order (move to ready)
seller_router.post('/orders/process/:orderId',islogin,authenticateToken,onlySellerAccess,seller_controller. orderPrepare);

// Mark order as ready
seller_router.post('/orders/ready/:orderId', islogin,authenticateToken,onlySellerAccess,seller_controller.orderReady);
  
// Cancel order
seller_router.post('/orders/cancel/:orderId', islogin,authenticateToken,onlySellerAccess,seller_controller.orderCancel);


seller_router.get("/edit-profile",islogin,authenticateToken,onlySellerAccess,seller_controller.loadEditProfile)
seller_router.post("/update-profile",upload.single('image'),seller_controller.updateEditProfile)

seller_router.get("/ordersHistory",islogin,authenticateToken,onlySellerAccess,seller_controller.getCustomerOrdersHistory)




module.exports  = seller_router;