var jwt = require('jsonwebtoken');

function generateToken(user) {
	console.log('user in generateToken', user);
	var u = {
		username: user.username,
		email_address: user.email_address,
		avatar: user.avatar,
		create_date: user.create_date,
	};

	return (token = jwt.sign(u, 'asdfvadasfdfasdfcv3234asdf', {
		// Expires in 24 hours
		expiresIn: 60 * 60 * 10
	}));
}

module.exports = {
	generateToken: generateToken
};
