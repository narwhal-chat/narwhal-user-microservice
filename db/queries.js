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
                        message: 'Username or password is wrong',
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
            error: null,
            errorType: {
                password: '',
                username: '',
                email: ''
            }
        }
        const currentUser = await db.one('SELECT * FROM users WHERE username = ${username}', { username: req.username })
        try {
            bcrypt.compare(req.password, currentUser.password, async(err, valid) => {
                console.log('CHECKING PW')
                if (!valid) {
                    errors.error = true;
                    errors.errorType.password = true
                    console.log(errors);
                    return(res.status(404).json(errors))
                }
                let newUsername = req.newUsername;
                let email = req.email;
                let avatar = req.avatar;
                let uniqueUsername;
                let uniqueEmail;
                console.log(avatar, "avatar");

                // Checking to see if username/email is different
                const checkUsername = await db.any('SELECT * FROM users WHERE username = ${newUsername}', { newUsername: newUsername })
                const checkEmail = await db.any('SELECT * FROM users WHERE email_address = ${email}', { email: email })

                if (checkUsername.length !== 0) {
                    console.log('check un', checkUsername);
                    if (newUsername === checkUsername.username) {
                        uniqueUsername = false;
                    } else {
                        uniqueUsername = true;
                    }
                }

                if (checkEmail.length !== 0) {
                    console.log('checkem', checkEmail)
                    if (email === checkEmail.email_address) {
                        uniqueEmail = false;
                    } else {
                        uniqueEmail = true;
                    }
                }

                console.log('unique email', uniqueEmail)
                console.log('unique username', uniqueUsername);
                

                if (currentUser.username === newUsername && currentUser.email_address !== email) {
                    console.log('changing email');
                    if (checkEmail.length === 0) {
                        try {
                            const updateEmail = await db.one('UPDATE users SET email_address = ${email}, avatar = ${avatar} where USERNAME = ${username}',
                                { email: email, avatar: avatar, username: currentUser.username })
                                console.log('updateEmail', updateEmail)
                        } catch (e) {
                            console.log(e);
                        }
                    } else {
                        errors.error = true;
                        errors.errorType.email = true;
                    }
                }

                if (currentUser.email_address === email && currentUser.username !== newUsername) {
                    console.log('changing username');
                    if (checkUsername.length === 0) {
                        try {
                            console.log('hello in change un');
                            const updateUsername = await db.one('UPDATE users SET username = ${newUsername}, avatar = ${avatar} WHERE username = ${username}',
                                { newUsername: newUsername, avatar: avatar, username: currentUser.username})
                            console.log('updateUsername', updateUsername);
                        } catch (e) {
                            console.log(e)
                        }
                    } else {
                        errors.error = true;
                        errors.errorType.username = true;
                    }
                }

                if (currentUser.username !== newUsername && currentUser.email_address !== email) {
                    if (checkUsername.length === 0 && checkEmail.length === 0) {
                        try {
                            const updateUsername = await db.one('UPDATE users SET username = ${newUsername}, avatar = ${avatar} WHERE username = ${username}' +
                                'RETURNING username',
                                { newUsername: newUsername, avatar: avatar, username: currentUser.username})
                                console.log('UPDATEUSERNAME', updateUsername);
                        } catch (e) {
                            errors.error = true;
                            errors.errorType.username = true;
                        }
                        try {
                            const updateEmail = await db.one('UPDATE users SET email_address = ${email}, avatar = ${avatar} where USERNAME = ${username}',
                                { email: email, avatar: avatar, username: updateUsername.username })
                                console.log('UPDATEMAIL', updateEmail);
                        } catch (e) {
                            errors.error = true;
                            errors.errorType.email = true;
                        }
                    } else {
                        errors.error = true;
                        errors.errorType.email = true;
                        errors.errorType.username = true;
                    }
                }

                if (currentUser.username === newUsername && currentUser.email_address === email) {
                    try {
                        const updateUser = await db.one('UPDATE users SET avatar = ${avatar} where USERNAME = ${username}',
                        { avatar: avatar, username: newUsername })
                    } catch (e) {
                      errors.error = true;
                    }
                }

                // if (!uniqueUsername && !uniqueEmail) {
                //     errors.error = false;
                // }

                console.log('before if', errors);
                if (errors.errorType.username || errors.errorType.email || errors.errorType.password) {
                    console.log('There was an error');
                    return res.status(401).json(errors)
                } else {
                    console.log('hello');
                    const updatedUser = await db.one('SELECT * FROM users WHERE username = ${newUsername}', { newUsername: newUsername })
                    console.log(updatedUser);
                    const token = await utils.generateToken(updatedUser);
                    return res.json({ user: updatedUser, token})
                    console.log('changed');
                }

            });
        } catch (e) {
        // let newUsername = req.newUsername;
        // let email = req.email;
        // let avatar = req.avatar;

        // // Checking to see if username/email is different
        // const checkUsername = await db.any('SELECT * FROM users WHERE username = ${newUsername}', { newUsername: newUsername })
        // const checkEmail = await db.any('SELECT * FROM users WHERE email_address = ${email}', { email: email })
        // console.log('checkusername', checkUsername);
        // console.log(checkUsername.length)
        // console.log('checkemail', checkEmail);
        // console.log(checkEmail.length);
        // console.log('truthtest', currentUser.email_address === email);

        // console.log('currentUser.username', currentUser.username);
        // console.log('newUsername', newUsername);


        // if (currentUser.username === newUsername && currentUser.email !== email) {
        //     console.log('changing email');
        //     if (checkEmail.length === 0) {
        //         try {
        //             const updateEmail = await db.one('UPDATE users SET email_address = ${email}, avatar = ${avatar} where USERNAME = ${username}',
        //                 { email: email, avatar: avatar, username: currentUser.username })
        //                 console.log('updateEmail', updateEmail)
        //         } catch (e) {
        //             console.log(e);
        //         }
        //     } else {
        //         errors.error = true;
        //         errors.errorType.email = true;
        //     }
        // }

        // if (currentUser.email_address === email && currentUser.username !== newUsername) {
        //     console.log('changing username');
        //     if (checkUsername.length === 0) {
        //         try {
        //             const updateUsername = await db.one('UPDATE users SET username = ${newUsername}, avatar = ${avatar} WHERE username = ${username}',
        //                 { newUsername: newUsername, avatar: avatar, username: currentUser.username})
        //             console.log('updateUsername', updateUsername);
        //         } catch (e) {
        //             console.log(e)
        //         }
        //     } else {
        //         errors.error = true;
        //         errors.errorType.username = true;
        //     }
        // }

        // if (checkUsername.length === 0 && checkEmail.length === 0) {
        //     console.log('both are different');
        //     try {
        //         const updateUsername = await db.one('UPDATE users SET username = ${newUsername}, avatar = ${avatar} WHERE username = ${username}' +
        //             'RETURNING username',
        //             { newUsername: newUsername, avatar: avatar, username: currentUser.username},)
        //     } catch (e) {
        //         errors.error = true;
		// 		errors.errorType.username = true;
        //     }
        //     try {
        //         const updateEmail = await db.one('UPDATE users SET email_address = ${email}, avatar = ${avatar} where USERNAME = ${username}',
        //             { email: email, avatar: avatar, username: updateUsername.username })
        //     } catch (e) {
        //         errors.error = true;
		// 		errors.errorType.email = true;
        //     }
        // }

        // if (checkUsername.length === 1 && checkEmail.length === 1) {
        //     errors.error = true;
        //     errors.errorType.email = true;
        //     errors.errorType.username = true;
        // }

        // console.log('before if', errors);
        // if (errors.errorType.username || errors.errorType.email || errors.errorType.password) {
        //     console.log('There was an error');
        //     return res.status(401).json(errors)
        // } else {
        //     console.log('hello');
        //     const updatedUser = await db.one('SELECT * FROM users WHERE username = ${newUsername}', { newUsername: newUsername })
        //     console.log(updatedUser);
        //     const token = await utils.generateToken(updatedUser);
        //     return res.json({ user: updatedUser, token})
        //     console.log('changed');
        // }
    }
    }

};


module.exports = {
    user: user
};
