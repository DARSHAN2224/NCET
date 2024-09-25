const { validationResult } = require("express-validator");
const Seller = require("../../models/userModel");
const product = require("../../models/productsModel");
const Shop = require("../../models/shopModel");
const offer = require("../../models/offersModel");
const Order = require("../../models/ordersModel");
const OrderHistory = require("../../models/historyModel");
const TopProducts = require("../../models/topProducts");
const bcrypt = require("bcrypt");
const fs = require('fs');
const path = require('path');
// const { sendVerifyMail, sendResetPasswordMail } = require("../../helpers/mailer");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../helpers/generateToken");
// const randomstring = require("randomstring");

const loadLogin=async (req,res) => {
  try {
    const msg = req.flash('msg');
    const sellerData=req.flash('sellerData')[0];
    res.status(200).render('seller/login', { csrfToken: req.csrfToken(), msg,sellerData});
} catch (error) {
  console.log("nice 7",error.message);   
   res.redirect('/seller/login');
}
}

const  loadSellerForm=async (req,res) => {
  const msg = req.flash('msg');
  const sellerId=req.session.user._id
 return res.render('seller/sellerSignup', {msg,sellerId});
}


const loginSeller = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.render('seller/login',{ msg: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const sellerData = await Seller.findOne({ email });

    if (!sellerData) {
        req.flash("msg", "Email and password is incorrect!");
        return res.redirect('/seller/login');
    }
    
    const isPassword = await bcrypt.compare(password, sellerData.password);
    if (!isPassword) {
        req.flash("msg", "Email and password is incorrect!");
        return res.redirect('/seller/login');
    }

    if (sellerData.is_verified === "0") {
        req.flash("msg", "Please verify the email!");
        req.flash("sellerData", sellerData);
        return res.redirect('/seller/login');
    }

    
    // Generate tokens (Assuming you have token generation logic)
    const accessToken = await generateAccessToken({ user: sellerData.email });
    const refreshToken = await generateRefreshToken({ user: sellerData.email });

    // Update user with refresh token
    await Seller.updateOne({ email }, { $set: { refreshToken: refreshToken } });

    // Set cookies
    res.cookie('sellerrefreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        maxAge: 7200000 
    });
    res.cookie('sellertoken', accessToken, { maxAge: 60000 });
    req.flash("msg", "hello!");
    
  const shopData = await Shop.findOne({ sellerId:sellerData._id });
  if (!shopData || !shopData.is_filled) {
    return res.redirect('/seller/shopForm');
  }
  req.session.shopData = shopData;
  res.cookie('shopData', shopData, { maxAge: 7200000 });
    return res.redirect('/seller/home');
} catch (error) {
  console.log("nice 8",error.message);
      return res.redirect('/seller/login');
}
};


const userLogout = async (req, res) => {
    try {
      const { _id } =   req.session.user
      await Seller.findByIdAndUpdate(
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
        .clearCookie("sellertoken")
        .clearCookie("shopData")
        .clearCookie("sellerrefreshToken", options)
        .redirect("/seller/login");
    } catch (error) {
      console.log("nice 9",error.message);    }
  };
  

const SellerForm=async (req,res) => {
  const { name, description, sellerId } = req.body;

  try {
    // Find the seller by their ID
    // let shopData = await Seller.findOne({_id: sellerId });
      // If shop data doesn't exist, create new data
      let image;
      if (req.file) {
        image = req.file.filename;
      }
      console.log(req.file.filename);
      
     const  shopData = new Shop({
        image,
        sellerId,
        name,
        description,
        is_filled: 1 // Set this to 1 after filling the form
      });
      console.log(shopData);
  
    await shopData.save();
    // Save the updated shop data
    res.cookie('shopData', shopData, { maxAge: 7200000 });
    req.session.shopData = shopData;
    // Redirect to the seller home page after saving
    return res.redirect('/seller/home');
  } catch (error) {
    console.error('Error updating shop details:', error);
    res.redirect('/seller/shopForm');
  }
}

const loadHome=async (req, res) => {
  try {
    // const {_id}=req.user;
    const shop = req.cookies.shopData||req.session.shopData;   
    const productCount= await product.countDocuments({shopId:shop._id});
    const offerCount= await offer.countDocuments({shopId:shop._id});
    const orderCount= await Order.countDocuments({
      "shops.shopId": shop._id,  // Match the shop ID in the shops array
      "shops.status": { $in: ['arrived', 'preparing', 'ready'] } // Fetch orders with these statuses
    })
      .populate('shops.products.productId') // Populate productId in shops.products
      .populate('user');
    const msg1 = req.flash('msg');
    res.render('seller/home',{msg1,productCount,offerCount,shop,orderCount});
  } catch (error) {
    console.log("nice 10",error.message);  }
 
}


const loadOrders = async (req, res) => {
  try {
    const shopId = req.session.shopData || req.cookies.shopData;

    // Fetch orders that contain the seller's shop and the desired statuses
    const orders = await Order.find({
      "shops.shopId": shopId._id,  // Match the shop ID in the shops array
      "shops.status": { $in: ['arrived', 'preparing', 'ready'] } // Fetch orders with these statuses
    })
      .populate('shops.products.productId') // Populate productId in shops.products
      .populate('shops.shopId'); // Populate user

    // Filter and map shops in each order to only include the seller's shop
    const filteredOrders = orders.map(order => {
      // Filter shops array to only include the seller's shop
      const relevantShops = order.shops.filter(shop => shop.shopId.equals(shopId._id));
      
      // Return a new order object with only the filtered shops
      return {
        ...order.toObject(), // Convert order to a plain object to prevent issues
        shops: relevantShops // Override the shops array with the filtered data
      };
    });

    // Separate orders based on the shop's status
    const arrivedOrders = filteredOrders.filter(order => 
      order.shops.some(shop => shop.status === 'arrived')
    );

    const processingOrders = filteredOrders.filter(order => 
      order.shops.some(shop => shop.status === 'preparing')
    );

    const readyOrders = filteredOrders.filter(order => 
      order.shops.some(shop => shop.status === 'ready')
    );

    // Render the seller's order page with the filtered orders
    res.render('seller/orders', { arrivedOrders, processingOrders, readyOrders });
  } catch (error) {
    console.log("Error loading orders: ", error.message);
    res.status(500).send('Error loading orders');
  }
};

// loading products page
const loadProducts=async (req,res) => {
  try {
    // const {_id}=req.user
    // console.log(_id);
    // const shops=await Shop.findOne({sellerId:_id});
    const shop=req.session.shopData || req.cookies.shopData
    // console.log("shop data",shops);
    const products=await product.find({shopId:shop._id});
    // console.log(products);
    
    res.render('seller/products/products',{products,shop});
  } catch (error) {
    console.log("nice1 ",error.message);  }
}

// loading  add product page
const loadAddProducts=async (req,res) => {
  try {
    // const user=req.user
    // const shop=await Shop.findOne({sellerId:user._id});
    const shop= req.session.shopData|| req.cookies.shopData
    // console.log(shop);
    
    const { success, msg } = req.query;
    // console.log("load user ",user);
    res.render('seller/products/addproducts',{shop,success,msg});
  } catch (error) {
    console.log("nice 2",error.message);  }
}

// loading offers page
const loadOffers=async (req,res) => {
  try {
    // const {_id}=req.user
    // console.log(_id);
    const shop=req.session.shopData|| req.cookies.shopData

    const offers=await offer.find({shopId:shop._id});
    // console.log(products);
    res.render('seller/products/offers',{offers,shop});
  } catch (error) {
    console.log("nice3 ",error.message);  }
}

// loading add offers page
const loadAddOffers=async (req,res) => {
  try {
    // const user=req.user
    const shop= req.session.shopData|| req.cookies.shopData

    // const shop=await Shop.find({offer:shops});
    const { msg } = req.query;
    res.render('seller/products/addoffers',{shop,msg});
  } catch (error) {
    console.log("nice4 ",error.message);  }
}



const addProducts = async (req, res) => {
  try {
    const { name, available, description, price, stock, discount, shopId } = req.body;
    // console.log(shopId);
    
    let isAvailable = available === "yes" ? true : false;
    if (stock === null || stock<=0) {
      isAvailable = false;
      stockupdate=0
    }
    else{
      isAvailable = true;
      stockupdate=stock;
    }


    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(400).redirect(`/seller/addproducts?success=false&msg=Shop%20not%20found`);
    }
    // console.log("shop",shop);
    
    const isExists = await product.findOne({
      name: { $regex:`^${name}$`, $options: 'i' }
    });
    // console.log("product",isExists);

    if (isExists) {
      return res.status(400).redirect(`/seller/addproducts?success=false&msg=Product%20Name%20already%20exists`);
    }

    let image;
    if (req.file) {
      image = req.file.filename;
    }

    const newProduct = new product({
      name,
      description,
      available: isAvailable,
      price:price|| 0,
      discount:discount|| 0,
      stock:stockupdate||0,
      image,
      shopId
    });
    // console.log(newProduct);
    
    const savedProduct = await newProduct.save();

    // Add product to the shop
    shop.productId.push(savedProduct._id);
    await shop.save();

    req.flash("success", true);
    req.flash("msg", 'Product added!');
    return res.status(200).redirect("/seller/products");
  } catch (error) {
    return res.status(400).json({
      success: false,
      msg: error.message
    });
  }
};


const loadEditProducts= async (req,res) => {
  try {
    const { id } = req.query;
   
    const productData = await product.findOne({_id:id})
    if(!productData){
      req.flash("msg", 'Product does not exist!');
      return res.status(200).redirect("/seller/editproducts")
    }
    // console.log("load user ",user);
    const msg = req.flash('msg');
    res.render('seller/products/editProduct',{productData,msg});
  } catch (error) {
    console.log("nice6 ",error.message);  }
}



const editProducts = async (req, res) => {
  try {
    
    const { id, name, description, available, price, stock, discount } = req.body;
    let isAvailable = available === "yes" ? true : false;
    if (stock <= 0) {
      isAvailable = false;
      stockupdate=0
    }
    // if (stock<=0) {
    //   stockupdate=0
    // }
    else{
      isAvailable = true;
      stockupdate=stock;
    }

    let updateObj = {
      name,
      description,
      available: isAvailable,
      price:price|| 0,
      discount:discount|| 0,
      stock:stockupdate||0,
       // New shopId if changed
    };

    if (req.file) {
      updateObj.image = req.file.filename;
    }
    // Update product with new details
    const updatedProduct = await product.findByIdAndUpdate({_id:id}, { $set: updateObj }, { new: true })
    req.flash("msg", 'Product updated!');
    return res.status(200).redirect("/seller/products");
  } catch (error) {
    return res.status(400).json({
      success: false,
      msg: error.message
    });
  }
};

const deleteProducts = async (req, res) => {
  try {
    const productData = await product.findOne({ _id: req.params.id });

    if (!productData) {
      return res.status(400).json({
        success: false,
        msg: 'Product not found'
      });
    }

    // Remove product image if exists
    if (productData.image) {
      const oldImagePath = path.join(__dirname, '../../public/Productimages', productData.image);
      if (fs.existsSync(oldImagePath)) {
        await fs.promises.unlink(oldImagePath);
      }
    }

    // Remove product from the shop
    await Shop.findByIdAndUpdate(productData.shopId, { $pull: { productId: productData._id } });

    // Delete the product
    await product.deleteOne({ _id: req.params.id });

    req.flash('success', 'Product deleted successfully');
    res.redirect('/seller/products/');
  } catch (error) {
    return res.status(400).json({
      success: false,
      msg: error.message
    });
  }
};



const addOffers = async (req, res) => {
  try {
    const { shopId} = req.body;
    let image
     if (req.file) {
       image=req.file.filename
     }

      var obj = {
          image,
          shopId
      }
    
      const offers = new offer(obj)

      await offers.save();
      req.flash("msg", 'Product added!');
      return res.status(200).redirect("/seller/offers")
  }
  catch (error) {
      return res.status(400).json({
          sucess: false,
          msg: error.message
      })
  }
}

const  deleteOffers =async (req,res) => {
  try {
    const productData=await offer.findOne({_id:req.params.id})
    // console.log(productData.image);
    if (productData.image) {
      const oldImagePath = path.join(__dirname, '../../public/Productimages',productData.image);
    // console.log(oldImagePath);
    if (fs.existsSync(oldImagePath)) {
      await fs.promises.unlink(oldImagePath);
      console.log('Old image deleted successfully');
    }
   }
  //  console.log("jii ",req.params.id);
   
   await offer.deleteOne({_id:req.params.id})
   req.flash('sucess', 'Your Data has been Sucessfully Deleted')
   res.redirect('/seller/offers/')
  } catch (error) {
      return res.status(400).json({
        sucess: false,
        msg: error.message
    })
  }
}


const orderAccept= async (req, res) => {
  try {
    const { orderId } = req.params;
    const shopIds = req.session.shopData || req.cookies.shopData;

    console.log("Order ID: ${orderId}, Shop ID: ${shopId}");

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Find the shop in the order and update its status to 'processing'
    const shop = order.shops.find(shop => shop.shopId.equals(shopIds._id));
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found in order' });

    shop.status = 'preparing';
    await order.save();

    // Optionally update history as a log of what happened
    const history = await OrderHistory.findById(orderId); // Find the corresponding history
    if (!history) return res.status(404).json({ success: false, message: 'Order history not found' });

    const shophistory = history.shops.find(shop => shop.shopId.equals(shopIds._id));
    if (!shophistory) return res.status(404).json({ success: false, message: 'Shop history not found in order' });

    shophistory.status = 'preparing'; // Log the status change in history

    await history.save();


    res.json({ success: true, message: 'Order accepted', order });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
}

const orderPrepare=async (req, res) => {
  try {
    const { orderId } = req.params;
    const shopIds = req.session.shopData || req.cookies.shopData;

    console.log(orderId,shopIds._id);
      
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const shop = order.shops.find(shop => shop.shopId.equals(shopIds._id));
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found in order' });

    shop.status = 'ready';
    await order.save();

    const history = await OrderHistory.findById(orderId);


    if (!history) return res.status(404).json({ success: false, message: 'Order history not found' });

    const shophistory = history.shops.find(shop => shop.shopId.equals(shopIds._id));
    if (!shophistory) return res.status(404).json({ success: false, message: 'Shop history not found in order' });

    shophistory.status = 'ready'; // Log the status change in history
    
    await history.save();
    // Update history to reflect the state change

    res.json({ success: true, message: 'Order is ready, collect your order', order });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
}



const orderReady = async (req, res) => {
  try {
    const { orderId } = req.params;
    const shopIds = req.session.shopData || req.cookies.shopData;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Find the shop in the order and update its status to 'delivered'
    const shop = order.shops.find(shop => shop.shopId.equals(shopIds._id));
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found in order' });

    shop.status = 'delivered';
    await order.save(); // Save the order after updating

    // Optionally log the status change in history
    const history = await OrderHistory.findById(orderId);

    if (!history) return res.status(404).json({ success: false, message: 'Order history not found' });

    const shophistory = history.shops.find(shop => shop.shopId.equals(shopIds._id));
    if (!shophistory) return res.status(404).json({ success: false, message: 'Shop history not found in order' });

    shophistory.status = 'delivered'; // Log the status change in history
    
    await history.save();

    // Update the product count for the top products
    for (const product of shop.products) {
      await updateProductCount(product.productId, product.quantity);
    }

    res.json({ success: true, message: 'Order marked as delivered', order });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Function to update the count of products
const updateProductCount = async (productId, quantity) => {
  try {
    const productCount = await TopProducts.findOne({ productId });

    if (productCount) {
      // If product already exists, increment the count
      productCount.totalOrders += quantity;
      productCount.lastUpdated = Date.now();
      await productCount.save();
    } else {
      // If product doesn't exist, create a new entry
      await TopProducts.create({
        productId: productId,
        totalOrders: quantity
      });
    }
  } catch (error) {
    console.error('Error updating product count:', error.message);
  }
};



const orderCancel=async (req, res) => {
  try {
    const { orderId,  } = req.params;
    const { cancelReason } = req.body;
    const shopIds = req.session.shopData || req.cookies.shopData;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const shop = order.shops.find(shop => shop.shopId.equals(shopIds._id));
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found in order' });

    shop.status = 'cancelled';
    shop.cancelReason = cancelReason || 'No reason provided'; // Store the cancel reason
    await order.save();

    // Log the cancellation in history (optional)
    const history = await OrderHistory.findById(orderId);
    if (history) {
      const shophistory = history.shops.find(shop => shop.shopId.equals(shopIds._id));
      if (shophistory) {
        shophistory.status = 'cancelled';
        shophistory.cancelReason = cancelReason || 'No reason provided';
        await history.save();
      }
    }

    res.json({ success: true, message: 'Order cancelled', order });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
}



const loadEditProfile=async (req, res) => {
  try {
    const shop = req.session.shopData || req.cookies.shopData;
   // Get user ID from session
   const sellerId=req.session.user._id
      const user = await Shop.findById(shop._id); // Fetch user from the database

      if (!user) {
          return res.status(404).send('User not found');
      }

      res.render('seller/loadEditShop', { user ,sellerId}); // Render the edit profile EJS template with user data
  } catch (error) {
      console.error('Error fetching user for edit:', error);
      res.status(500).send('Internal Server Error');
  }
}


const updateEditProfile=async (req, res) => {
  const { name, description,sellerId } = req.body; // Extract user data from request

  try {
    const shop = req.session.shopData || req.cookies.shopData;// Get user ID from session
      const user = await Shop.findById(shop._id); // Fetch user from the database

      if (!user) {
          return res.status(404).send('User not found');
      }

      let images;
      if (req.file) {
        images = req.file.filename;
        user.image=images
      }


      // Update user fields
      user.name = name;
      user.description = description; 
      user.sellerId=   sellerId
      
      await user.save(); // Save updated user to the database
      
      // Optionally, update the session user data
      res.cookie('shopData', user, { maxAge: 7200000 });
      req.session.shopData = user;

      res.redirect('/seller/home'); // Redirect back to the profile page after successful update
  } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).send('Internal Server Error');
  }
}

const getCustomerOrdersHistory = async (req, res) => {
  try {
    const shop = req.cookies.shopData||req.session.shopData;   
      
      // Fetch orders for this user, populating shop and product details
      const orders= await OrderHistory.find({
        "shops.shopId": shop._id,  // Match the shop ID in the shops array
        "shops.status": { $in: ['arrived', 'preparing', 'ready','cancelled','delivered'] } // Fetch orders with these statuses
      })
      .populate('shops.products.productId') // Populate productId in shops.products
      .populate('shops.shopId');
      
      // Render the orders.ejs view with the fetched orders
      res.render('seller/orderHistory', { orders});
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
};



module.exports={
    loadLogin,
    loginSeller,
    userLogout,
    loadHome,
    loadOrders,
    loadProducts,
    loadAddProducts,
    loadOffers,
    loadAddOffers,
    addProducts,
    loadEditProducts,
    editProducts,
    deleteProducts,
    addOffers,
    deleteOffers,
    SellerForm,
    loadSellerForm,
    orderAccept,
    orderPrepare,
    orderReady,
    orderCancel,
    loadEditProfile,
  updateEditProfile,
  getCustomerOrdersHistory

    
}