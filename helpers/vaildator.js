const{check}=require('express-validator')
exports.registerValidator=[
    check('name').not().isEmpty().isLength({min: 5}).withMessage('Name must have more than 5 characters'),
    check('email','please add a email').isEmail().normalizeEmail({
        gmail_remove_dots:true
    }),
    check('mno','mobile number is required').not().isEmpty(),
    check('password','Your password must be at least 8 characters').not().isEmpty().isLength({min: 8}),
]

exports.loginValidator=[
    check('email','please add a email').isEmail().normalizeEmail({
        gmail_remove_dots:true
    }),
    check('password','Your password must be at least 8 characters').not().isEmpty().isLength({min: 8})
]
exports.forgetEmailValidator=[
    check('email','please add a email').isEmail().normalizeEmail({
        gmail_remove_dots:true
    }),
]
exports.forgetPasswordValidator=[
    check('password','Your password must be at least 8 characters').not().isEmpty().isLength({min: 8})
]