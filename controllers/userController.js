const { validationResult } = require("express-validator");
const User = require("../models/userModel");
const Offer = require("../models/offersModel");
const Shop = require("../models/shopModel");
const Product = require("../models/productsModel");
const Cart = require("../models/cartModel");
const Order = require("../models/ordersModel");
const TokenCounter = require("../models/tokenModel");
const History=require("../models/historyModel");
const TopProducts = require('../models/topProducts');


const bcrypt = require("bcrypt");
const { sendVerifyMail, sendResetPasswordMail } = require("../helpers/mailer");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../helpers/generateToken");
const randomstring = require("randomstring");



// seccure password function
const securePassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.log(error.message);
    res.redirect("/");
  }
};

// loading the user login page
const loadlogin = async (req, res) => {
  try {
    const msg = req.flash('msg');
    const userData=req.flash('userData')[0];
    res.status(200).render('user/login', { csrfToken: req.csrfToken(), msg,userData});
} catch (error) {
    console.log(error.message);
    res.redirect('/login');
}
};
// loading the user signup page
const loadRegister = async (req, res) => {
  try {
    const msg = req.flash('msg');
    res.status(200).render("user/signup",{ csrfToken: req.csrfToken(),msg});
  } catch (error) {
    console.log(error.message);
    res.redirect("/signup");
  }
};

//working og the user signup page
const signupUser = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log(errors.array());
      const msg = errors.array()[0].msg;
      console.log(msg);
      return res.render("user/signup", { msg });
    }

    const { name, email, mno, password } = req.body;
    const isExistUser = await User.findOne({ email });

    if (isExistUser) {
      req.flash("msg", "Email already exists!");
     return res.status(200).redirect("/signup");
    }
    const hashedPassword = await securePassword(password);
    const user = new User({
      name,
      email,
      mobile: mno,
      password: hashedPassword,
    });
    const userData = await user.save();
    sendVerifyMail(name, email, userData._id);
    res.status(200).render("user/signup", {
      msg: "Registered successfully!, Please verify your email",
    });
  } catch (error) {
    console.log(error.message);
    res.render("/signup");
  }
};

// verify the email after signup
const verifyEmail = async (req, res) => {
  try {
    verifiedData = await User.updateOne(
      { _id: req.query.id },
      { $set: { is_verified: 1 } }
    );
    res.status(200).render("user/verify-email", {
      msg: "email is verified",
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/signup");
  }
};

// user login
const loginUser = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('user/login',{ msg: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const userData = await User.findOne({ email });

    if (!userData) {
        req.flash("msg", "Email and password is incorrect!");
        return res.redirect('/login');
    }

    const isPassword = await bcrypt.compare(password, userData.password);
    if (!isPassword) {
        req.flash("msg", "Email and password is incorrect!");
        return res.redirect('/login');
    }

    if (userData.is_verified === "0") {
        req.flash("msg", "Please verify the email!");
        req.flash("userData", userData);
        return res.redirect('/login');
    }
    if (userData.role != 'user') {
      req.flash("msg", 'You do not have permission to access this route!');
      return res.redirect('/login');
  }
    // Generate tokens (Assuming you have token generation logic)
    const accessToken = await generateAccessToken({ user: userData.email });
    const refreshToken = await generateRefreshToken({ user: userData.email });

    // Update user with refresh token
    await User.updateOne({ email }, { $set: { refreshToken: refreshToken } });

    // Set cookies
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 7200000
    });
    res.cookie('token', accessToken, { maxAge: 60000 });
    req.flash("msg", "hello!");
    // Redirect to home
    res.redirect('/home');
} catch (error) {
    console.log(error.message);
    res.redirect('/login');
}
};

// for the token refresh

const forgetLoad = async (req, res) => {
  try {
    const msg=req.flash('msg')
    res.render("user/forget",{msg});
  } catch (error) {
    console.log(error.message);
  }
};



const forgetVerify = async (req, res) => {
  try {
    const errors = validationResult(req);
    const { email } = req.body;

    const userData = await User.findOne({ email });
    if (!errors.isEmpty()) {
      console.log(errors.array());
      req.flash('msg', errors[0].msg)
      return res.redirect("/forget");
    }
    if (userData) {
      // console.log(userData,userData.is_verified);
      if (userData.is_verified === '0') {
        req.flash("msg", "Please verify the email!");
        req.flash("userData", userData);
        if(userData.role=='seller')
        return res.redirect('/seller/login');
        if(userData.role=='admin')
          return res.redirect('/admin/login');
        return res.redirect('/login');
      } else {
        const randomString = randomstring.generate();
        const updatedData = await User.updateOne(
          { email },
          { $set: { token: randomString } }
        );
        console.log(updatedData);
        
        sendResetPasswordMail(userData.name, userData.email, randomString);
        req.flash("msg", "please check your mail to reset your password")
        if(userData.role=='seller')
          return res.redirect('/seller/login');
        if(userData.role=='admin')
            return res.redirect('/admin/login');
        return res.redirect('/login');
      }
    } else {
      res.render("user/forget", { mes: "User email is incorrect" });
    }
  } catch (error) {
    console.log(error.message);
  }
};



const forgetPasswordLoad = async (req, res) => {
  try {
    const token = req.query.token;
    const tokenData = await User.findOne({ token });
    if (tokenData) {
      res.render("user/forget-password", { user_id: tokenData._id });
    } else {
      res.render("user/404", { mes: "token is not found" });
    }
  } catch (error) {
    console.log(error.message);
  }
};




const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    const { email } = req.body;

    const userData = await User.findOne({ email });
    if (!errors.isEmpty()) {
      console.log(errors.array());
     
      return res.redirect("/forget-password");
    }
    const {  user_id,password} = req.body;
    const sercure_password = await securePassword(password);
    const updatedData = await User.findByIdAndUpdate(
      { _id: user_id },
      { $set: { password: sercure_password, token: "" } }
    );
    if(userData.role=='seller')
      return res.redirect('/seller/login');
    if(userData.role=='admin')
        return res.redirect('/admin/login');
    return res.redirect('/login');
  } catch (error) {
    console.log(error.message);
  }
};



const verificationLoad = async (req, res) => {
  try {
    res.render("user/verification");
  } catch (error) {
    console.log(error.message);
  }
};



const sendverification = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.render("user/verification", { msg: errors[0].msg });
    }
    const { email } = req.body;
    const userData = await User.findOne({ email });
    if (userData) {
      sendVerifyMail(userData.name, userData.email, userData._id);
      res.render("user/verification", { mes: "check your mail to verify" });
    } else {
      res.render("user/verification", { mes: "email does not exist" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const userLogout = async (req, res) => {
  try {
    const { _id } = req.user;
    await User.findByIdAndUpdate(
      { _id },
      {
        $set: {
          refreshToken: "", // this removes the field from document
        },
      },
      {
        new: true,
      }
    );
    const options = {
      httpOnly: true,
      secure: true,
    };
    req.session.destroy();
    return res
      .status(200)
      .clearCookie("token")
      .clearCookie("refreshToken", options)
      .redirect("/login");
  } catch (error) {
    console.log(error.message);
  }
};



const loadHome= async(req, res) => {
  const user = req.user;
  const topProducts = await TopProducts.find()
  .sort({ totalOrders: -1 })
  .limit(5)
  .populate({
    path: 'productId',
    populate: {
      path: 'shopId',  // Populate shopId within productId
      model: 'Shop'    // Ensure you have a Shop model
    }
  });
  const offers=await Offer.find();
  const shops=await Shop.find({});
  const msg1 = req.flash('msg');
  res.render('home',{msg1,offers,shops,user,topProducts});
}


const loadSellerShop = async (req, res) => {
  let { search, page, sort } = req.query;
  page = page || 1;
  const limit = 6; // Products per page
  const skip = (page - 1) * limit;
  const shopId = req.params.id;

  // Sorting logic
  let sortOptions = {};
  if (sort === 'price_asc') {
    sortOptions = { price: 1 }; // Sort by price ascending
  } else if (sort === 'price_desc') {
    sortOptions = { price: -1 }; // Sort by price descending
  } else if (sort === 'discount_asc') {
    sortOptions = { discount: 1 }; // Sort by discount ascending
  } else if (sort === 'discount_desc') {
    sortOptions = { discount: -1 }; // Sort by discount descending
  }

  // Fetch the shop and populate the products
  const shops = await Shop.findOne({ _id: shopId }).populate({
    path: 'productId',
    match: search
      ? { name: { $regex: '.*' + search + '.*', $options: 'i' } }
      : {}, // Apply search on product name if provided
    options: { sort: sortOptions, skip, limit }, // Apply sort, pagination
  }).exec();

  // Total products after applying search query
  const totalProducts = await Shop.countDocuments({ _id: shopId }).populate({
    path: 'productId',
    match: search
      ? { name: { $regex: '.*' + search + '.*', $options: 'i' } }
      : {}, // Apply search on product name if provided
    options: { sort: sortOptions, skip, limit }, // Apply sort, pagination
  }).exec();

  const totalPages = Math.ceil(totalProducts / limit);

  // Get flash message if present
  const msg1 = req.flash('msg');
  
  res.render('menu', {
    msg1,
    shops, // Pass the shop along with populated products
    currentPage: parseInt(page),
    totalPages,
    search,
    sort,
  });
};




const loadShop= async(req, res) => {

  let { search, page,sort } = req.query;
  page = page || 1;
  const limit = 6; // Products per page
  const skip = (page - 1) * limit;

  let query = {};
  if (search) {
      query = {name:{$regex:'.*'+search+'.*',$options:'i'}}; // Case-insensitive search
  }

// Sorting logic
let sortOptions = {};
if (sort === 'price_asc') {
    sortOptions = { price: 1 }; // Sort by price ascending
} else if (sort === 'price_desc') {
    sortOptions = { price: -1 }; // Sort by price descending
} else if (sort === 'discount_asc') {
    sortOptions = { discount: 1 }; // Sort by discount ascending
} else if (sort === 'discount_desc') {
    sortOptions = { discount: -1 }; // Sort by discount descending
}


  const shops = await Product.find(query).populate('shopId').sort(sortOptions).skip(skip).limit(limit).exec();
  const totalProducts = await Product.countDocuments(query).populate('shopId').exec();
  const totalPages = Math.ceil(totalProducts / limit);


  const msg1 = req.flash('msg');


  res.render('shops', {
    msg1,
    shops,
    currentPage: parseInt(page),
    totalPages,
    search,
    sort,
});

}


const addToCart = async (req, res) => {
  const productId = req.params.id;
  const userId = req.session.user ? req.session.user._id : null; 

  try {
    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Find the user's cart
    let cart = await Cart.findOne({ user: userId });

    // If no cart exists, create a new one
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalQty: 0,
        totalCost: 0,
      });
    }

    // Find if the product already exists in the cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    // If the product exists, update the quantity and price
    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += 1;
    } else {
      // Otherwise, add the new product to the cart
      cart.items.push({
        shopId: product.shopId, // Assuming your Product schema has a shopId
        productId: product._id,
        quantity: 1,
        price: product.price,
      });
    }

    // Update total quantity and total cost
    cart.totalQty += 1;
    cart.totalCost += product.price;

    // Save the updated cart
    await cart.save();

    res.status(200).json({ message: "Product added to cart", cart });
  } catch (error) {
    res.status(500).send(error.message);
  }
};


const cartCount = async (req, res) => {
  const userId = req.session.user ? req.session.user._id : null;

  try {
    // Find the cart for the user
    const cart = await Cart.findOne({ user: userId });

    // Get total quantity of items in the cart, if no cart exists set totalQty to 0
    const totalQty = cart ? cart.totalQty : 0;

    // Return JSON to the frontend with the total quantity
    res.json({ totalQty });
  } catch (error) {
    res.status(500).send(error.message);
  }
};


const getCart = async (req, res) => {
  const userId =  req.session.user ?  req.session.user._id : null; // Check if the user is logged in
  try {
    // Fetch the user's cart
    const cart = await Cart.findOne({ user: userId }).populate('items.productId');

    // If the cart is empty, initialize an empty cart object
    if (!cart) {
     const  cart={ items: [], totalQty: 0, totalCost: 0 }
      req.session.cart=cart
      return res.render('cart', { cart });
    }
    // Render the cart template and pass the cart data
    req.session.cart=cart
    return res.render('cart', { cart });
  } catch (error) {
    console.error('Error fetching the cart:', error);
    res.status(500).send('Internal Server Error');
  }
};


const buyNow = async (req, res) => {
  const userId = req.session.user._id; // Assuming the user is logged in
  const { productId, quantity } = req.body; // Product ID and quantity are passed in the request body
  try {
    // Find the product by ID and populate its shop details
    const product = await Product.findById(productId).populate('shopId');
    if (!product || quantity <= 0) {
      return res.status(400).send('Invalid product or quantity');
    }

    // Check if stock is sufficient
    if ( !product.available||product.stock < quantity) {
      return res.status(400).send('Insufficient stock for this product');
    }

    // Generate a unique token for the order
    const orderToken = await generateToken();

    // Prepare the shop details for the order
    const shop = {
      shopId: product.shopId._id,
      status: 'arrived',
      cancelReason: null,
      products: [{
        productId: product._id,
        quantity: quantity,
        price: product.price
      }],
      totalQuantity: quantity,
      totalPrice: product.price * quantity
    };

    // Create a new order with this single product
    const newOrder = new Order({
      orderToken,
      user: userId,
      shops: [shop], // Single shop, as this is a "Buy Now" action
      totalQuantity: quantity,
      totalPrice: product.price * quantity
    });
    await newOrder.save();

    const newOrderHistory = new History({
      _id:newOrder._id,
      orderToken,
      user: userId,
      shops: [shop], // Single shop, as this is a "Buy Now" action
      totalQuantity: quantity,
      totalPrice: product.price * quantity
    });

    // Save the order and order history to the database
    await newOrderHistory.save();

    // Update the stock for the product
    await Product.findByIdAndUpdate(product._id, {
      $inc: { stock: -quantity }
    });

    // Redirect or send response to the user
    res.status(200).json({success:true,message:"order placed successfully"});
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).send('Internal Server Error');
  }
};




const orderStore = async (req, res) => {
  const userId = req.session.user._id; // Assuming the user is logged in
  try {
    // Find the user's cart and populate product details (including shopId)
    const cart = await Cart.findOne({ user: userId }).populate('items.productId');

    if (!cart || cart.totalQty <= 0) {
      return res.status(400).send('Your cart is empty');
    }

    for (const item of cart.items) {
      const product = await Product.findById(item.productId);

      if (!product || product.stock < item.quantity || !product.available) {
          return res.status(400).send({ success: false, message: `Product ${product.name} is not available or insufficient stock.` });
      }
  }
    // Generate a unique token for the order
    const orderToken = await generateToken();

    // Group items by shopId and calculate totalQuantity and totalPrice for each shop
    const shopsMap = cart.items.reduce((map, item) => {
      const shopId = item.productId.shopId.toString();
      const quantity = item.quantity;
      const price = item.price;

      if (!map[shopId]) {
        map[shopId] = {
          shopId: item.productId.shopId,
          status: 'arrived',
          cancelReason: null,
          products: [],
          totalQuantity: 0, // Initialize total quantity for the shop
          totalPrice: 0     // Initialize total price for the shop
        };
      }

      // Add product to the shop's products array
      map[shopId].products.push({
        productId: item.productId._id,
        quantity: quantity,
        price: price
      });

      // Update total quantity and price for the shop
      map[shopId].totalQuantity += quantity;
      map[shopId].totalPrice += price * quantity;

      return map;
    }, {});

    // Convert shopsMap to an array of shops
    const shops = Object.values(shopsMap);

    // Create a new order with an auto-generated _id
    const newOrder = new Order({
      orderToken,
      user: userId,
      shops, // Array of shops, each with status, totalQuantity, totalPrice, and product details
      totalQuantity: cart.totalQty,
      totalPrice: cart.totalCost
    });

    // Save the order to generate the _id
    await newOrder.save();

    // Create a new order history using the same _id as the order
    const newOrderHistory = new History({
      _id: newOrder._id, // Manually assign the same _id from the Order model
      orderToken,
      user: userId,
      shops, // Array of shops, each with status, totalQuantity, totalPrice, and product details
      totalQuantity: cart.totalQty,
      totalPrice: cart.totalCost
    });

    // Save the order history
    await newOrderHistory.save();

    // Update the stock for each product
    for (const shop of shops) {
      for (const product of shop.products) {
        await Product.findByIdAndUpdate(product.productId, {
          $inc: { stock: -product.quantity }
        });
      }
    }

    // Optionally, clear the user's cart after successful checkout
    await Cart.deleteOne({ user: userId });

    // Redirect or send response to the user
    res.status(200).json({success:true,message:"order placed successfully"});
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).send('Internal Server Error');
  }
};



const generateToken = async () => {
  const currentDate = new Date();
  let tokenCounter = await TokenCounter.findOne();

  // If no tokenCounter exists, create a new one and set the token to 1
  if (!tokenCounter) {
    tokenCounter = new TokenCounter({
      token: 1,  // Initialize the token to 1
      lastReset: currentDate
    });
  } else {
    // Check if a month has passed since the last reset
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (tokenCounter.lastReset < oneMonthAgo) {
      // Reset the token to 1 if a month has passed
      tokenCounter.token = 1;
      tokenCounter.lastReset = currentDate;
    } else {
      // Otherwise, increment the token
      tokenCounter.token += 1;
    }
  }

  // Save the updated tokenCounter
  await tokenCounter.save();

  return tokenCounter.token;
};


const getCustomerOrders = async (req, res) => {
  try {
      const userId = req.user._id; // Assuming user is authenticated and user ID is available in req.user
      
      // Fetch orders for this user, populating shop and product details
      const orders = await Order.find({ user: userId })
          .populate('shops.shopId')
          .populate('shops.products.productId');

      // Render the orders.ejs view with the fetched orders
      res.render('orders', { orders });
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
};

const getCustomerOrdersHistory = async (req, res) => {
  try {
      const userId = req.user._id; // Assuming user is authenticated and user ID is available in req.user
      
      // Fetch orders for this user, populating shop and product details
      const orders = await History.find({ user: userId })
          .populate('shops.shopId')
          .populate('shops.products.productId');

      // Render the orders.ejs view with the fetched orders
      res.render('orderHistory', { orders });
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
};

const cancelOrder = async (req, res) => {
  const { orderToken, shopId } = req.params;

  try {
    console.log(`Cancel request received for orderToken: ${orderToken}, shopId: ${shopId}`);

    // Find the order in the database
    const order = await Order.findOne({ _id: orderToken });
    const orderHistory = await History.findOne({ _id: orderToken });

    if (!order || !orderHistory) {
      console.log('Order or order history not found.');
      return res.status(404).send({ message: 'Order not found.' });
    }

    // Find the specific shop in the order
    const shop = order.shops.find(shop => shop.shopId.toString() === shopId);
    const historyShop = orderHistory.shops.find(shop => shop.shopId.toString() === shopId);

    if (!shop) {
      console.log('Shop not found in the order.');
      return res.status(404).send({ message: 'Shop not found in order.' });
    }

    if (shop.status === 'arrived') {
      shop.status = 'cancelled';
      shop.cancelReason = 'Cancelled by user';
      await order.save();

      if (historyShop) {
        historyShop.status = 'cancelled';
        historyShop.cancelReason = 'Cancelled by user';
        if (!historyShop.history) {
          historyShop.history = [];
        }
        historyShop.history.push({
          status: 'cancelled',
          reason: 'Cancelled by user',
          timestamp: new Date()
        });
        await orderHistory.save();
      }

      console.log('Order cancelled successfully.');
      return res.status(200).send({ message: 'Order cancelled successfully.' });
    } else {
      console.log('Order cannot be cancelled. Status:', shop.status);
      return res.status(400).send({ message: 'Order cannot be cancelled.' });
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).send({ message: 'Internal server error.' });
  }
};




const searchSuggest=async (req, res) => {
  const { term, shopId } = req.query; // Get the search term and shopId from the query parameters

  // If either term or shopId is missing, return an empty array
  if (!term) {
      return res.json([]); 
  }
 
  try {
      if (shopId) {
          const suggestions = await Product.find(
              {
                  name: { $regex: term, $options: 'i' }, // Case-insensitive match for product names
                  shopId: shopId // Ensure that the product belongs to the specified shop
              },
              { name: 1 } // Return only the product name
          ).limit(10);

         return res.json(suggestions.map(product => product.name));
      }
      // Fetch suggestions by searching for products with matching names in the specific shop
      const suggestions = await Product.find(
                 { name: { $regex: term, $options: 'i' } }, // Case-insensitive match
                   { name: 1 } // Return only the name field
              ).limit(10); // Limit the number of suggestions

      // Respond with the list of product names as suggestions
      res.json(suggestions.map(product => product.name));
  } catch (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).send('Internal Server Error');
  }
}



const viewProfile= async (req, res) => {
  try {
      const userId = req.session.user._id; // Get user ID from session
      const user = await User.findById(userId); // Fetch user from the database

      if (!user) {
          return res.status(404).send('User not found');
      }

      res.render('viewProfile', { user }); // Render the profile EJS template with user data
  } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).send('Internal Server Error');
  }
};


const loadEditProfile=async (req, res) => {
  try {
      const userId = req.session.user._id; // Get user ID from session
      const user = await User.findById(userId); // Fetch user from the database

      if (!user) {
          return res.status(404).send('User not found');
      }

      res.render('editProfile', { user }); // Render the edit profile EJS template with user data
  } catch (error) {
      console.error('Error fetching user for edit:', error);
      res.status(500).send('Internal Server Error');
  }
}

const updateEditProfile=async (req, res) => {
  const { name, email, mobile, password } = req.body; // Extract user data from request

  try {
      const userId = req.session.user._id; // Get user ID from session
      const user = await User.findById(userId); // Fetch user from the database

      if (!user) {
          return res.status(404).send('User not found');
      }

      // Update user fields
      user.name = name;
      user.email = email;
      user.mobile = mobile;
      const hashedPassword = await securePassword(password);
      // Update password only if provided
      if (password) {
        user.password = hashedPassword; // You should hash the password before saving
      }

      await user.save(); // Save updated user to the database

      // Optionally, update the session user data
      req.session.user = user;

      res.redirect('/viewProfile'); // Redirect back to the profile page after successful update
  } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  signupUser,
  loadRegister,
  verifyEmail,
  loginUser,
  loadlogin,
  forgetLoad,
  forgetVerify,
  forgetPasswordLoad,
  sendverification,
  verificationLoad,
  resetPassword,
  userLogout,
  loadHome,
  loadSellerShop,
  loadShop,
  addToCart,
  cartCount,
  getCart,
  orderStore,
  buyNow,
  getCustomerOrders,
  getCustomerOrdersHistory,
  cancelOrder,
  searchSuggest,
  viewProfile,
  loadEditProfile,
  updateEditProfile
};
