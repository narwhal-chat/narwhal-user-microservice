const promise = require('bluebird');
const utils = require('./utility.js');
const options = {
	// Initialization Options
	promiseLib: promise,
};
const bcrypt = require('bcrypt');

const pgp = require('pg-promise')(options);
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/narwhal';
const db = pgp(connectionString);

// add query functions
function createUser(req, res, next) {
    console.log('THIS IS THE CONNECTION STRING', connectionString);
	var user = {
		username: req.username,
		password: req.password,
		email_address: req.email_address,
		avatar: 'avatar'
    };
    console.log('this is the user', user)

	db.none(
        'insert into users(username, password, email_address, avatar)' +
            'values(${username}, ${password}, ${email_address}, ${avatar})',
        user
    )
    .then(() => {
        var token = utils.generateToken(user);
        db.one(`SELECT * FROM users WHERE username = '${user.username}'`, {
                username: user.username,
            })
            .then(data => {
                res.json({
                    token: token,
                    user: data,
                });
            });
    })
    .catch(function(err) {
        // console.log('Error In Backend', err)
        let detail = err.constraint;
        let message = '';
        if( err.constraint === 'user_ak_email_address') {
            message = 'E-mail already exists'
        } else {
            message = 'Username already exists'
        }
        return res.status(404).json({
            error: true,
            message: message
        })
    });
}

function loginUser(req, res, next) {
	db.one(`SELECT * FROM users WHERE username = '${req.username}'`, {
			username: req.username
    })
    .then(user => {
        bcrypt.compare(req.password, user.password, (err, valid) => {
            if (!valid) {
                return res.status(404).json({
                    error: true,
                    message: 'Username or Password is Wrong',
                });
            }

            let token = utils.generateToken(user);

            res.json({
                user: user,
                token: token,
            });
        });
    })
    .catch(error => {
        console.error(error);
    });
}

function editProfile(req, res, next) {
    console.log('req.body', req);
    db.one(`SELECT * FROM users WHERE username = '${req.username}'`, {
        username: req.username
    })
    .then(user => {
        bcrypt.compare(req.password, user.password, (err, valid) => {
            if (valid) {
                let newUsername = req.newUsername;
                let email = req.email;
                if (newUsername === '') {
                    newUsername = user.username;
                }
                if (email === '') {
                    email = user.email_address;
                }

                db.any(`UPDATE users SET username = '${newUsername}', email_address = '${email}' WHERE username ='${req.username}'`)
                .then(() => {
                    db.any(`SELECT * FROM users WHERE username = '${newUsername}'`)
                    .then(user => {
                        let token = utils.generateToken(user);

                        res.json({
                            user: user,
                            token: token
                        })
                    })
                    .catch(err => {
                        console.log('error getting user data');
                    })
                })
                .catch(err => {
                    console.log('error 2');
                    let detail = err.constraint;
                    let message = '';
                    if( detail === 'user_ak_email_address') {
                        message = 'E-mail already exists'
                    } else if (detail === 'user_ak_username') {
                        message = 'Username already exists'
                    }

                    return res.status(404).json({
                        error: true,
                        message: message
                    })
                })
            } else {
                console.log('error 3');
                return res.status(404).json({
                    error: true,
                    message: 'Password is incorrect'
                })
            }
        })
    })
}

module.exports = {
	createUser: createUser,
    loginUser: loginUser,
    editProfile: editProfile
};
