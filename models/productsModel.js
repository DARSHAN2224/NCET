const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        default: 0,
    },
    discount:{
        type: Number,
        default: 0,
    },
    shopId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
     },  // Link to seller
    available: { 
        type: Boolean,
         default: true 
    },
    stock: {
        type: Number,
        default: 0
    },
    image:  {
        type: String,
    } // URL or local path to image
});

module.exports = mongoose.model('Product', productSchema);
