const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const historySchema = new Schema({
  orderToken:{
    type:String
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true, // Orders should always belong to a user
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: "Order",
    required: true, // Orders should always belong to a user
  },
  // paymentId: {
  //   type: String,
  //   required: true, // Payment ID is required to track payment transactions
  // },
  status: {
    type: String,
    default:"arrived"
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop', // Reference to the shop where the order was placed
    required: true
  },
  refundStatus: { 
    type: String, 
    default: "No Refund" 
},
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isDelivered: {
    type: Boolean,
    default: false,
    expires: '30d'
  },
});

const orderSchema = new Schema({
  orderToken:{
    type:String
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true, // Orders should always belong to a user
  },
  cart: {
    totalQty: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      default: 0,
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true, // Every cart item must have a product
        },
        shop: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Shop', // Reference to the shop where the order was placed
          required: true
        },
        qty: {
          type: Number,
          required: true,
          default: 1, // Default to 1, as an item should at least have a quantity of 1
        },
        status: {
          type: String,
          default:"arrived"
        },
        isDelivered: {
          type: Boolean,
          default: false,
          expires: '1d'
        },

      },
    ],
  },
  // paymentId: {
  //   type: String,
  //   required: true, // Payment ID is required to track payment transactions
  // },
 
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: '30d' }
  },
   history: [historySchema]
});

module.exports = mongoose.model("Order", orderSchema);
