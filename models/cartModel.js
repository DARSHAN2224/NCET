const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false, // Allow guest users to have a cart without a logged-in user
  },
  items: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true, // Each cart item must have a product reference
      },
      qty: {
        type: Number,
        required: true,
        default: 1, // Default quantity should be 1 instead of 0
      },

    },
  ],
  totalQty: {
    type: Number,
    required: true,
    default: 0,
  },
  totalCost: {
    type: Number,
    required: true,
    default: 0, // Naming changed to `totalCost` for clarity
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Cart", cartSchema);
