const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../models/user');

const sendVerificationEmail = (user) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.MAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: user.email,
    subject: 'Email Verification',
    text: `Please verify your email by clicking the link: http://localhost:3000/auth/verify-email?token=${user.verification_token}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

exports.renderCustomerRegister = (req, res) => {
  res.render('customer_register');
};

exports.renderAdminRegister = (req, res) => {
  res.render('admin_register');
};

exports.renderAdminLogin = (req, res) => {
  res.render('admin_login');
};

exports.register = async (req, res, role) => {
    const { first_name, last_name, email, password } = req.body;
  
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = jwt.sign({ email }, 'secret', { expiresIn: '1h' });
  
      await db.query('INSERT INTO users (first_name, last_name, email, password, role, verification_token) VALUES (?, ?, ?, ?, ?, ?)', [first_name, last_name, email, hashedPassword, role, verificationToken]);
  
      const [userRows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      const user = userRows[0];
      const token = user.verification_token;
      
      // Render the verify.ejs view
      res.render('verify', { token });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, 'secret');
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [decoded.email]);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    await db.query('UPDATE users SET is_verified = TRUE WHERE email = ?', [decoded.email]);

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user.is_verified) {
      return res.status(400).json({ message: 'Please verify your email' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not allowed to login from here' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, 'secret', { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
