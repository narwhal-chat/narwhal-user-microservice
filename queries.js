const promise = require('bluebird');
const utils = require('./utility.js');
const options = {
	// Initialization Options
	promiseLib: promise,
};
const bcrypt = require('bcrypt');

const pgp = require('pg-promise')(options);
const connectionString = 'postgres://localhost:5432/narwhal';
const db = pgp(connectionString);

// add query functions
function createUser(req, res, next) {
	var user = {
		username: req.username,
		password: req.password,
		email_address: req.email_address,
		avatar: 'avatar',
		create_date: req.create_date,
	};

	db.none(
        'insert into users(username, password, email_address, avatar, create_date)' +
            'values(${username}, ${password}, ${email_address}, ${avatar}, ${create_date})',
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
        console.log(err);
        return next(err);
    });
}

function loginUser(req, res, next) {
	db.one(`SELECT * FROM users WHERE username = '${req.username}'`, {
			username: req.username
    })
    .then(user => {
        console.log('this is the user when you loginUser', user);
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
        console.log('this is user when editing profile', user)
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

                db.one(`UPDATE users SET username = '${newUsername}', email_address = '${email}' WHERE username ='${req.username}'`)
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
                        console.log(err);
                    })
                })
                .catch(err => {
                    console.log(err);
                })
            } else {
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
