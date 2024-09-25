const express=require('express');
const user_router = express.Router();
const Product = require("../models/productsModel");
const Shop = require("../models/shopModel");
const Cart = require("../models/cartModel");

// const multer=require('multer');
const user_controllers=require("../controllers/userController")
const {registerValidator,loginValidator,forgetEmailValidator,forgetPasswordValidator}=require('../helpers/vaildator')
const {authenticateToken ,islogout,islogin} = require('../middlewares/authenticateToken');
const csrfProtection = require('../middlewares/csrfProtection');

user_router.get("/signup",islogout,csrfProtection,user_controllers.loadRegister)
user_router.post("/signup",registerValidator,user_controllers.signupUser)

user_router.get("/login", islogout,csrfProtection,user_controllers.loadlogin)
user_router.post("/login",loginValidator,user_controllers.loginUser)

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
user_router.post("/cart/:id",user_controllers.addToCart)
user_router.get("/cart",islogin,authenticateToken,user_controllers.getCart)

user_router.post("/checkout",islogin,authenticateToken,user_controllers.orderStore)
user_router.post("/buy-now",islogin,authenticateToken,user_controllers.buyNow)

user_router.get("/orders",islogin,authenticateToken,user_controllers.getCustomerOrders)
user_router.get("/ordersHistory",islogin,authenticateToken,user_controllers.getCustomerOrdersHistory)
user_router.post('/cancel-order/:orderToken/:shopId',islogin,authenticateToken,user_controllers.cancelOrder );


user_router.get('/home', islogin,authenticateToken,user_controllers.loadHome);
user_router.get('/',user_controllers.loadHome);

user_router.get("/viewProfile",islogin,authenticateToken,user_controllers.viewProfile)
user_router.get("/edit-profile",islogin,authenticateToken,user_controllers.loadEditProfile)
user_router.post("/update-profile",islogin,authenticateToken,user_controllers.updateEditProfile)



user_router.get('/search-suggestions',user_controllers. searchSuggest);


user_router.post('/cart', async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user ? req.session.user._id : null;  // Assume the user is logged in

        // Find the user's cart and populate product details
        const cart = await Cart.findOne({ user: userId }).populate('items.productId');

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find the product in the cart
        const cartItem = cart.items.find(item => item.productId._id.toString() === productId);

        if (!cartItem) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        // Access product details
        const product = cartItem.productId;

        // Update the quantity based on the action
        if (action === 'increase' && cartItem.quantity < product.stock) {
            cartItem.quantity += 1;
        } else if (action === 'decrease' && cartItem.quantity > 1) {
            cartItem.quantity -= 1;
        }

        // Recalculate the total quantity and total cost
        cart.totalQty = 0;
        cart.totalCost = 0;
        cart.items.forEach(item => {
            cart.totalQty += item.quantity;
            cart.totalCost += item.quantity * item.price; // Access the price correctly
        });

        // Save the updated cart
        await cart.save();

        // Send back the new quantity, subtotal, totalQty, and totalCost
        res.json({
            success: true,
            newQuantity: cartItem.quantity,
            newSubtotal: cartItem.quantity * product.price, // Access the price correctly
            totalQty: cart.totalQty,
            totalCost: cart.totalCost
        });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



// In your user router file
user_router.delete('/cart', async (req, res) => {
    try {
        const { productId } = req.body; // Get productId from the request body
        const userId = req.session.user ? req.session.user._id : null;  // Assume the user is logged in

        // Find the user's cart
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find the index of the item to be removed
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        // Remove the item from the cart
        cart.items.splice(itemIndex, 1);

        // Recalculate total quantity and cost
        await cart.save(); // Save the updated cart

        // Check if the cart is empty after product removal
        if (cart.items.length === 0) {
            return res.json({ success: true, message: 'Cart is empty', cart });
        }

        // Send a response back to the client
       return res.json({ success: true, message: 'Product removed from cart', cart });
    } catch (error) {
        console.error('Error removing product from cart:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


module.exports  = user_router
