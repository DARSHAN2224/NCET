const express = require('express')
const app = express()
require('dotenv').config()
const mongoose = require('mongoose')
const port = process.env.PORT || 3000
mongoose.connect(process.env.DATABASE)
const path = require('path')
const flash = require("connect-flash");
const cookieParser = require('cookie-parser');
const session=require('express-session')


app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(csurf({cookie:true}))

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



app.use(session({
  secret : 'something',
  cookie: { maxAge: 7200000,secure: false},
  resave: false,
  saveUninitialized: true
}));

app.use(flash());
//for user
const user_router=require('./routes/userRoute')
app.use('/' , user_router)

//for seller
const seller_router=require('./routes/sellerRoute')
app.use('/seller' , seller_router)

app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        res.status(403).send('Invalid CSRF token');
    } else {
        next(err);
    }
});

app.listen(port , ()=> console.log('> Server is up and running on port : ' + port))
