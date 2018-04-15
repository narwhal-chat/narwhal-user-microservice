const promise = require('bluebird');
const utils = require('../utility.js');
const options = {
	promiseLib: promise,
};
const bcrypt = require('bcrypt');

const pgp = require('pg-promise')(options);
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/narwhal_users';
const db = pgp(connectionString);

const user = {
	createUser: async (req, res, next) => {
        const user = {
            username: req.username,
            password: req.password,
            email_address: req.email_address,
        };

        // Define all of the default user avatars
        const defaultUserAvatars = [
            'https://s3-us-west-1.amazonaws.com/narwhalavatar/user-default-avatars/User+Avatar+1.svg',
            'https://s3-us-west-1.amazonaws.com/narwhalavatar/user-default-avatars/User+Avatar+2.svg',
            'https://s3-us-west-1.amazonaws.com/narwhalavatar/user-default-avatars/User+Avatar+4.svg',
            'https://s3-us-west-1.amazonaws.com/narwhalavatar/user-default-avatars/User+Avatar+3.svg',
            'https://s3-us-west-1.amazonaws.com/narwhalavatar/user-default-avatars/User+Avatar+5.svg',
            'https://s3-us-west-1.amazonaws.com/narwhalavatar/user-default-avatars/User+Avatar+6.svg',
            'https://s3-us-west-1.amazonaws.com/narwhalavatar/user-default-avatars/User+Avatar+7.svg',
            'https://s3-us-west-1.amazonaws.com/narwhalavatar/user-default-avatars/User+Avatar+8.svg',
        ];
        // Randomly choose an avatar
        user.avatar = defaultUserAvatars[Math.floor(Math.random() * defaultUserAvatars.length)];

        db.none(
                'insert into users(username, password, email_address, avatar)' +
                    'values(${username}, ${password}, ${email_address}, ${avatar})',
                user
            )
            .then(() => {
                const token = utils.generateToken(user);
                db
                    .one('SELECT * FROM users WHERE username = ${username}', {
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
                console.log('Error In Backend', err);
                let detail = err.constraint;
                let message = '';
                if (detail === 'user_ak_username') {
                    message = 'Username already exists';
                } else if (detail === 'user_ak_email_address') {
                    message = 'E-mail already exists';
                }
                return res.status(404).json({
                    error: true,
                    message: message,
                });
            });
    },
    loginUser: async (req, res, next) => {
        db.one('SELECT * FROM users WHERE username = ${username}', {
            username: req.username,
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
                    create_date: user.create_date,
                };
                console.log('userdata', userData);

                let token = utils.generateToken(userData);

                res.json({
                    user: userData,
                    token: token,
                });
            });
        })
        .catch(error => {
            return res.status(404).json({
                error: true,
                message: 'Username does not exist',
            });
        });
    },

    editProfile: async (req, res, next) => {
        let errors = {
            error: false,
            errorType: {
                password: '',
                username: '',
                email: ''
            }
        }
        const currentUser = await db.one('SELECT * FROM users WHERE username = ${username}', { username: req.username })
        const checkUser = await bcrypt.compare(req.password, currentUser.password, (err, valid) => {

            if (!valid) {
              errors.error = true;
              errors.errorType.password = 'Password is incorrect'
              return res.status(401).json(errors)
            }

        });

        let newUsername = req.newUsername;
        let email = req.email;
        let avatar = req.avatar;

        if (newUsername === '') {
            newUsername = currentUser.username;
        }
        if (email === '') {
            email = currentUser.email_address;
        }

        const updateUsername = await db.any('UPDATE users SET username = ${newUsername}, avatar = ${avatar} WHERE username = ${username}', 
            { newUsername, avatar, username: req.username})
            .catch(e => {
                errors.error = true;
                errors.errorType.username = 'Username already exists';
                console.log(errors)
            })
        const updateEmail = await db.any('UPDATE users SET email_address = ${email} where USERNAME = ${username}',
            { email, avatar, username: req.username })
            .catch(e => {
                errors.error = true;
                errors.errorType.email = 'Email already exists';
                console.log(errors);
            })
            
        if (errors.error) {
            console.log('There was an error');
            return res.status(401).json(errors)
        } else {
            const updatedUser = await db.one('SELECT * FROM users WHERE username = ${newUsername}', { newUsername })
            const token = await utils.generateToken(updatedUser);
            return res.json({ user: updatedUser, token})
            console.log('changed');
        }
    }

};


module.exports = {
    user: user
};
