const nodemailer = require('nodemailer')

//for sending mail to verify the mail
const sendVerifyMail=async (name,email,user_id) => {
    try {
        const transporter=nodemailer.createTransport({
            service:"gmail",
            secure:true,
            port:process.env.SMTP_PORT,
            auth:{
                user:process.env.SMTP_MAIL,
                pass:process.env.SMTP_PASSWORD
            }
        });

        var mailOption={
            from:process.env.SMTP_MAIL,
            to:email,
            subject:"Email verification",
            html:`<p> hii`+name+`, Please copy the link and <a href="http://127.0.0.1:3000/verify?id=`+user_id+`">verify </a>your email</p>`
        }
        transporter.sendMail(mailOption,(error,info)=>{

            if (error) {
                console.log(error);
                
            }
            console.log("mail has been sent");
        })
    } catch (error) {
        console.log(error.message);
    }
}


const sendResetPasswordMail=async (name,email,token) => {
    try {
        const transporter=nodemailer.createTransport({
            service:"gmail",
            secure:true,
            port:process.env.SMTP_PORT,
            auth:{
                user:process.env.SMTP_MAIL,
                pass:process.env.SMTP_PASSWORD
            }
        });

        var mailOption={
            from:process.env.SMTP_MAIL,
            to:email,
            subject:"For Reset Password",
            html:`<p> hii`+name+`, Please copy the link and <a href="http://127.0.0.1:3000/forget-password?token=`+token+`">forget </a>to reset your password</p>`
        }
        transporter.sendMail(mailOption,(error,info)=>{

            if (error) {
                console.log(error);
                
            }
            console.log("mail has been sent");
        })
    } catch (error) {
        console.log(error.message);
    }
}

module.exports={
    sendVerifyMail,
    sendResetPasswordMail
}