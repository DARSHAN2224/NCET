const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  image:String
});
module.exports = mongoose.model('Offer', offerSchema);
