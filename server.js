const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const app = express();
const bcrypt = require('bcrypt');
const db = require('./db/queries');
const util = require('./utility');

const PORT = process.env.PORT || 3033;

// body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Route to register a user
app.post('/register', (req, res, next) => {
	const body = req.body;

	const hash = bcrypt.hashSync(body.password.trim(), 10);
	const user = {
		username: body.username,
		password: hash,
		email_address: body.email_address,
		avatar: body.avatar,
		create_date: body.create_date,
	};

	db.user.createUser(user, res, next);
});

// Route to log in
app.post('/login', (req, res, next) => {
	db.user.loginUser({ username: req.body.username, password: req.body.password }, res, next);
});

// Route to edit a profile
app.post('/editProfile', (req, res, next) => {
	console.log('edit profile in microservice', req.body);
	db.user.editProfile(req.body, res, next);
});

// Listening to port
app.listen(PORT);
