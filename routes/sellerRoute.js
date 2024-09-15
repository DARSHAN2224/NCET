const express=require('express');
const seller_router = express.Router();
const seller_controller=require("../controllers/seller/sellerController")
const {loginValidator}=require('../helpers/vaildator')
const {islogin,islogout,onlySellerAccess,authenticateToken}=require('../middlewares/sellerMiddleware')
const path = require('path');
const multer=require('multer')
const Order = require("../models/ordersModel");
// const History = require("../models/historyModel");

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

//order page for seller
seller_router.get('/orders',islogin,authenticateToken,onlySellerAccess,seller_controller.loadOrders)

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


// seller_router.post('/orders/accept/:id', async (req, res) => {
//     console.log(req.params.id);
    
//     const order = await Order.findById(req.params.id);
//     order.cart.items.forEach(item => item.status = 'processing');
//     await order.save();    
//     res.redirect('/seller/orders');
//   });
  
//   // Ready order (move to ready)
//   seller_router.post('/orders/process/:id', async (req, res) => {
//     const order = await Order.findById(req.params.id);
//     order.cart.items.forEach(item => item.status = 'ready');
//     await order.save();    
//     res.redirect('/seller/orders');
//   });
//   seller_router.post('/orders/ready/:id', async (req, res)=> {
    
//     const updatedProduct = await Order.findByIdAndUpdate({_id:req.params.id}, { $set: {isDelivered:true} }, { new: true }) ;
//      res.redirect('/seller/orders');
//   });
  
//   // Cancel order
//   seller_router.post('/orders/cancel/:id', async (req, res) => {
//     await Order.findByIdAndDelete(req.params.id);   
//      res.redirect('/seller/orders');
//   });
  // Accept order
seller_router.post('/orders/accept/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        order.cart.items.forEach(item => item.status = 'processing');
        await order.save();
        res.json({ success: true, message: 'Order accepted', order });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Process order (move to ready)
seller_router.post('/orders/process/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        order.cart.items.forEach(item => item.status = 'ready');
        await order.save();
        res.json({ success: true, message: 'Order is ready collect your order', order });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Mark order as delivered
seller_router.post('/orders/ready/:id', async (req, res) => {
    try {
        // const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { $set: { isDelivered: true } }, { new: true });
        const order = await Order.findById(req.params.id);
        order.cart.items.forEach(item => item.isDelivered = true);
        order.history.push({
            action: "Order Delivered",
            status: "Delivered",
            note: "Order was delivered successfully.",
          });
      
          await order.save();
        res.json({ success: true, message: 'Order delivered', updatedOrder });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Cancel order
seller_router.post('/orders/cancel/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        order.cart.items.forEach(item => item.status = 'canceled');
        await order.save();
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

module.exports  = seller_router;