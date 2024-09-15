const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    mobile:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    refreshToken:{
        type:String,
        default:''
    },
    is_verified:{
        type:String,
        default:0
    },
    role:{
        type:String,
        enum:["user","seller","admin"],
        default:"user"
    },  
    token:{
        type:String,
        default:''
    }
})

module.exports=mongoose.model("User",userSchema);