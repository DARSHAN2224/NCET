const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    image:  {
        type: String,
    } ,
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    sellerId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },  // Link to seller
     productId:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
     }],
     is_filled:{
        type:Number,
        default:0
     }
});

module.exports = mongoose.model('Shop', shopSchema);
