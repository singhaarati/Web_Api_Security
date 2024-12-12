const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const router = express.Router()
const User = require('../models/User')
const { hash } = require('bcryptjs')
const userController = require('../controllers/userController')
const { verifyUser } = require('../middlewares/auth')

router.post('/register', (req, res, next) => {
    const { username, password, fullname, email, role } = req.body;

    // Specify the minimum and maximum password length
    const minPasswordLength = 8;
    const maxPasswordLength = 12;

    // Check if the password meets the length requirements
    if (password.length < minPasswordLength || password.length > maxPasswordLength) {
        return res.status(400).json({ error: `Password must be between ${minPasswordLength} and ${maxPasswordLength} characters long.` });
    }

    // Check for password complexity using regular expressions
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const numberRegex = /[0-9]/;
    const specialCharRegex = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/;

    if (!uppercaseRegex.test(password) || !lowercaseRegex.test(password) || !numberRegex.test(password) || !specialCharRegex.test(password)) {
        return res.status(400).json({
            error: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character.'
        });
    }

    User.findOne({ username: username })
        .then((user) => {
            if (user) return res.status(400).json({ error: 'Duplicate user' });

            bcrypt.hash(password, 10, (err, hash) => {
                if (err) return res.status(500).json({ error: err.message });

                User.create({ username, password: hash, fullname, role, email })
                    .then((user) => {
                        res.status(201).json(user);
                    })
                    .catch(next);
            });
        })
        .catch(next);
});



router.post('/login', async (req, res, next) => {
    try {
        const user = await User.findOne({ username: req.body.username });

        if (!user) {
            return res.status(400).json({ error: 'User is not registered' });
        }

        // Check if the account is locked
        if (user.loginAttempts >= 5) {
            return res.status(401).json({ error: 'Account is locked due to too many failed login attempts. Please contact support.' });
        }

        const isPasswordCorrect = await bcrypt.compare(req.body.password, user.password);

        if (!isPasswordCorrect) {
            // Increment the loginAttempts counter
            user.loginAttempts += 1;
            await user.save();

            return res.status(400).json({ error: 'Password does not match' });
        }

        // Reset loginAttempts counter on successful login
        user.loginAttempts = 0;
        await user.save();

        // Check if the password has expired
        const passwordExpiryDays = 90; // Change this value according to your policy
        const currentDate = new Date();
        const lastPasswordChangeDate = user.lastPasswordChange || user.createdAt;

        const daysSinceLastChange = Math.floor((currentDate - lastPasswordChangeDate) / (24 * 60 * 60 * 1000));

        if (daysSinceLastChange > passwordExpiryDays) {
            return res.status(401).json({ error: 'Password has expired. Please change your password.' });
        }

        // Generate JWT token
        const payload = {
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            role: user.role,
        };

        jwt.sign(payload, process.env.SECRET, { expiresIn: '30d' }, (err, token) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ status: 'success', token });
        });
    } catch (error) {
        next(error);
    }
});

router.route('/userinfo')
    .get(verifyUser, userController.getUserById)
    .post((req, res) => {
        res.status(405).json({ error: 'POST request is not allowed' })
    })
    .put(verifyUser, userController.updateUserById)
//.delete(verifyUser, userController.deleteUserById)
module.exports = router