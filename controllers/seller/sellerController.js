const { validationResult } = require("express-validator");
const Seller = require("../../models/userModel");
const product = require("../../models/productsModel");
const Shop = require("../../models/shopModel");
const offer = require("../../models/offersModel");
const Order = require("../../models/ordersModel");
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
    const shop=req.session.shopData
   const productCount= await product.countDocuments({shopId:shop._id});
   const offerCount= await offer.countDocuments({shopId:shop._id});
    const msg1 = req.flash('msg');
    res.render('seller/home',{msg1,productCount,offerCount});
  } catch (error) {
    console.log("nice 10",error.message);  }
 
}


const loadOrders=async (req,res) => {

  try {
    const shopId=req.session.shopData || req.cookies.shopData;
    const arrivedOrders = await Order.find({ 
      "cart.items.shop": shopId._id,  // Match the shop ID in the cart items
      "cart.items.status": "arrived"  // Only show orders with "arrived" status
    }).populate('cart.items.productId').populate('user');   


     const processingOrders =  await Order.find({ 
      "cart.items.shop": shopId._id,  // Match the shop ID in the cart items
      "cart.items.status": "processing"  // Only show orders with "arrived" status
    }).populate('cart.items.productId').populate('user');
    
    const readyOrders =  await Order.find({ 
      "cart.items.shop": shopId._id,  // Match the shop ID in the cart items
      "cart.items.status": "ready"  // Only show orders with "arrived" status
    }).populate('cart.items.productId').populate('user');
    // res.render('seller/orders');
    res.render('seller/orders',{ arrivedOrders, processingOrders, readyOrders });
  } catch (error) {
    console.log("nice ",error.message);
  }
}

// loading products page
const loadProducts=async (req,res) => {
  try {
    // const {_id}=req.user
    // console.log(_id);
    
    // const shops=await Shop.findOne({sellerId:_id});
    const shops=req.session.shopData || req.cookies.shopData
    // console.log("shop data",shops);
    const products=await product.find({shopId:shops._id});
    // console.log(products);
    
    res.render('seller/products/products',{products});
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
    res.render('seller/products/offers',{offers});
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



// const addProducts = async (req, res) => {
//   try {

//       const { name,available,description,price,stock,discount ,sellerId} = req.body;
//      let  isAvailable = available === "yes" ? true : false;
//      if(stock===0){
//       isAvailable=false;
//      }
//       const isExists = await product.findOne({  name: {
//         $regex: name,
//         $options: 'i'
//     }})
//       if (isExists) {
//           return res.status(400).redirect(`/seller/addproducts?success=false&msg=Product%20Name%20already%20exists`)
//       }
//     let image;
//      if (req.file) {
//        image=req.file.filename
//      }
//       var obj = {
//           name,
//           description,
//           price,
//           available:isAvailable,
//           stock,
//           discount,
//           image,
//           sellerId
//       }
     
//       // console.log(obj);
//       const products = new product(obj)
//       const newProduct = await products.save();
//       req.flash("sucess", true);
//       req.flash("msg", 'Product added!');
//       return res.status(200).redirect("/seller/products")
//   }
//   catch (error) {
//       return res.status(400).json({
//           sucess: false,
//           msg: error.message
//       })
//   }
// }

const addProducts = async (req, res) => {
  try {
    const { name, available, description, price, stock, discount, shopId } = req.body;
    // console.log(shopId);
    
    let isAvailable = available === "yes" ? true : false;
    if (stock === null) {
      isAvailable = false;
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(400).redirect(`/seller/addproducts?success=false&msg=Shop%20not%20found`);
    }
    // console.log("shop",shop);
    
    const isExists = await product.findOne({
      name: { $regex: name, $options: 'i' }
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
      stock:stock||0,
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
    if (stock === 0) {
      isAvailable = false;
    }


    let updateObj = {
      name,
      description,
      available: isAvailable,
      price:price|| 0,
      discount:discount|| 0,
      stock:stock||0,
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
// const editProducts = async (req, res) => {
//   try {
//     const { id,name,description,available,price,stock,discount} = req.body;
//       // const {id,title,description}=req.body;
//       const isAvailable = available === "yes" ? true : false
//       if(stock===0){
//         isAvailable=false;
//        }
   
//       if (req.file) {
//         var updateobj={
//           name,
//           description,
//           available:isAvailable,
//           price,
//           discount,
//           stock,
//           image:req.file.filename
//       }
//         const updatedProduct=await product.findByIdAndUpdate({_id:id},{
//           $set:updateobj
//          },{new:true})
//       }else{
//         var updateobj={
//           name,
//           description,
//           available,
//           discount,
//           price,
//           stock
//       }
//         const updatedProduct=await product.findByIdAndUpdate({_id:id},{
//           $set:updateobj
//          },{new:true})
//       }
//       // req.flash("sucess", true);
//       req.flash("msg", 'Product updated!');
//       return res.status(200).redirect("/seller/products")
//   }

//   catch (error) {
//       return res.status(400).json({
//           sucess: false,
//           msg: error.message
//       })
//   }
// }


// const  deleteProducts =async (req,res) => {
//   try {
//     const productData=await product.findOne({_id:req.params.id})
//     // console.log(productData.image);
//     if (productData.image) {
//       const oldImagePath = path.join(__dirname, '../../public/Productimages',productData.image);
//     // console.log(oldImagePath);
//     if (fs.existsSync(oldImagePath)) {
//       await fs.promises.unlink(oldImagePath);
//       console.log('Old image deleted successfully');
//     }
//    }
//   //  console.log("jii ",req.params.id);
   
//    await product.deleteOne({_id:req.params.id})
//    req.flash('sucess', 'Your Data has been Sucessfully Deleted')
//    res.redirect('/seller/products/')
//   } catch (error) {
//       return res.status(400).json({
//         sucess: false,
//         msg: error.message
//     })
//   }
// }
// adding a offer

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


      const newOffer = await offers.save();
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
    loadSellerForm
    
}