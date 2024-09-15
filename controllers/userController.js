const { validationResult } = require("express-validator");
const User = require("../models/userModel");
const Offer = require("../models/offersModel");
const Shop = require("../models/shopModel");
const Product = require("../models/productsModel");
const Cart = require("../models/cartModel");
const Order = require("../models/ordersModel");


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
  const offers=await Offer.find();
  const shops=await Shop.find();

  const msg1 = req.flash('msg');
  res.render('home',{msg1,offers,shops});
}


const loadSellerShop= async(req, res) => {

  const shopId = req.params.id
  const shops=await Shop.findOne({_id:shopId}).populate('productId');
  const msg1 = req.flash('msg');
  res.render('menu',{msg1,shops});

}

const loadShop= async(req, res) => {

  const shops=await Product.find({}).populate('shopId');
  const msg1 = req.flash('msg');
  res.render('shops',{msg1,shops});

}


const addToCart =async (req,res) => {
  const productId = req.params.id;
  const userId = req.session.user ? req.session.user._id : null; // If user is logged in, get the userId, otherwise keep it null for guest users
  // console.log("product id: ",productId);
  
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    let cart = await Cart.findOne({ userId: userId });

    // If no cart exists, create a new one
    if (!cart) {
      cart = new Cart({
        userId: userId,
        items: [],
        totalQty: 0,
        totalCost: 0,
      });
    }

  const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    // If the product already exists in the cart, update its quantity and price
    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].qty += 1;
    } else {
      // Otherwise, add a new product to the cart
      cart.items.push({
        productId: product._id,
        qty: 1,
      });
    }

    // Update totalQty and totalCost
    cart.totalQty += 1;
    cart.totalCost += product.price;

    await cart.save();
    console.log(cart,"cart detrails");
    
    res.status(200).json({ message: "Product added to cart", cart });
  } catch (error) {
    res.status(500).send(error.message);
  }
}

const cartCount = async (req, res) => {
  const userId = req.session.user ?  req.session.user._id : null;

  try {
    const cart = await Cart.findOne({ userId: userId });

    const totalQty = cart ? cart.totalQty : 0;

    // Return JSON to frontend
    res.json({ totalQty });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const getCart = async (req, res) => {
  const userId =  req.session.user ?  req.session.user._id : null; // Check if the user is logged in
  try {
    // Fetch the user's cart
    const cart = await Cart.findOne({ userId: userId }).populate('items.productId');

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


const orderStore = async (req,res) => {
  const userId = req.session.user._id; // Assuming the user is logged in
  try {
    // Find the user's cart and populate product details (including sellerId)
    const cart = await Cart.findOne({ userId: userId }).populate('items.productId');

    if (!cart || cart.totalQty === 0) {
      return res.status(400).send('Your cart is empty');
    }

    const newOrder = new Order({
      orderToken:generateToken(),
      user: userId,
      cart: {
        totalQty: cart.totalQty,
        totalCost: cart.totalCost,
        items: cart.items.map(item => ({
          productId: item.productId,
          qty: item.qty,
          shop: item.productId.shopId // or item.title depending on your data structure
        }))
      }
    });
    console.log(newOrder+" yes yr=");
    
    // Save the order to the database
    await newOrder.save();

    // Optionally, clear the user's cart after successful checkout
    await Cart.deleteOne({ userId: userId });

    // Redirect or send response to the user
    res.redirect("/order-success");
  }
      catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).send('Internal Server Error');
      }
  };

  function generateToken() {
    return Math.random().toString(36).substr(2, 9); // Example token generator
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
  orderStore
};
