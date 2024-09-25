const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const topProductsSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  totalOrders: {
    type: Number,
    required: true,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const TopProducts = mongoose.model('TopProducts', topProductsSchema);

module.exports = TopProducts;
