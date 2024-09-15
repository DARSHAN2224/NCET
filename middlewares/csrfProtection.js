const csurf = require('csurf');

const csrfProtection = csurf({ cookie: { httpOnly: true, secure: true, sameSite: 'Strict' ,maxAge: 7200000 } });

module.exports = csrfProtection;
