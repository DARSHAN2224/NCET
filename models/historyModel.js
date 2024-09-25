const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderHistorySchema = new Schema({
    orderToken: {
        type: String, // Common token for all products in the same order
        required: true
      },
  user: {
    type: Schema.Types.ObjectId, // Reference to the user who placed the order
    ref: 'User',
    required: true
  },
  shops: [{
    shopId: {
      type: Schema.Types.ObjectId, // Reference to each shop
      ref: 'Shop',
      required: true
    },
    status: {
      type: String,
      enum: ['arrived', 'preparing', 'cancelled','ready', 'delivered'], // Status per shop
      default: 'arrived'
    },
    cancelReason: {
      type: String, // Store the reason if a shop cancels the order
      default: null
    },
    products: [{
      productId: {
        type: Schema.Types.ObjectId, // Reference to each product from the shop
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      }
    }],
     deliveredAt: {
      type: Date // Date the entire order is marked as delivered (if needed)
    },  
    totalQuantity: {
      type: Number, // Total quantity of all products in the order
      required: true
    },
    totalPrice: {
      type: Number, // Total price of all products in the order
      required: true
    },
  }],
  totalQuantity: {
    type: Number, // Total quantity of all products in the order
    // required: true
  },
  totalPrice: {
    type: Number, // Total price of all products in the order
    // required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: {
    type: Date // Date the entire order is marked as delivered (if needed)
  },
  deleteAt: {
    type: Date, // Automatically delete history after 1 month
    default: () => Date.now() + 30 * 24 * 60 * 60 * 1000 // 1 month from creation
  }
});

// Index to automatically delete history entries after one month
orderHistorySchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

const OrderHistory = mongoose.model('OrderHistory', orderHistorySchema);

module.exports = OrderHistory;
