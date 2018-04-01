const promise = require('bluebird');
const utils = require('../utility.js');
const options = {
	promiseLib: promise,
};
const bcrypt = require('bcrypt');

const pgp = require('pg-promise')(options);
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/narwhal_users';
const db = pgp(connectionString);

// add query functions
function createUser(req, res, next) {
	var user = {
		username: req.username,
		password: req.password,
		email_address: req.email_address,
		avatar: 'avatar'
    };

	db.none(
        'insert into users(username, password, email_address, avatar)' +
            'values(${username}, ${password}, ${email_address}, ${avatar})',
        user
    )
    .then(() => {
        var token = utils.generateToken(user);
        db.one("SELECT * FROM users WHERE username = ${username}", {
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
        console.log('Error In Backend', err)
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
	db.one("SELECT * FROM users WHERE username = ${username}", {
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
            let userData = {
                id: user.id,
                username: user.username,
                email_address: user.email_address,
                avatar: user.avatar,
                create_date: user.create_date
            }
            console.log('userdata', userData);

            let token = utils.generateToken(userData);

            res.json({
                user: userData,
                token: token
            });
        });
    })
    .catch(error => {
        return res.status(404).json({
            error: true,
            message: 'Username does not exist'
        })
    });
}

function editProfile  (req, res, next) {
    console.log('req.body', req);
    db.one("SELECT * FROM users WHERE username = ${username}", {
        username: req.username
    })
    .then(user => {
        bcrypt.compare(req.password, user.password, (err, valid) => {
            if (!valid) {
                console.log('error 3');
                return res.status(401).json({
                    error: true,
                    message: 'Password is incorrect'
                })
            }
            let newUsername = req.newUsername;
			let email = req.email;
			if (newUsername === '') {
				newUsername = user.username;
			}
			if (email === '') {
				email = user.email_address;
			}

			db.any(`UPDATE users SET username = '${newUsername}', email_address = '${email}' WHERE username = '${req.username}'`)
				.then(() => {
					db.one(`SELECT * FROM users WHERE username = '${newUsername}'`)
						.then(user => {
                            console.log('yay', user)
							let userData = { id: user.id, username: user.username, email_address: user.email_address, avatar: user.avatar, create_date: user.create_date };
							let token = utils.generateToken(userData);

							res.json({ user: userData, token: token });
						})
						.catch(err => {
							console.log('error getting user data');
						});
				})
				.catch(err => {
					console.log('error 2');
					let detail = err.constraint;
					let message = '';
					if (detail === 'user_ak_email_address') {
						message = 'E-mail already exists';
					} else if (detail === 'user_ak_username') {
						message = 'Username already exists';
					}

					return res.status(401).json({ error: true, message: message });
				});
        })
    })
    .catch (err => {
        console.log(err)
    })
}

module.exports = {
	createUser: createUser,
    loginUser: loginUser,
    editProfile: editProfile
};