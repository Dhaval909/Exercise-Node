const express = require('express');
const { register, login, verifyEmail, renderCustomerRegister, renderAdminRegister, renderAdminLogin } = require('../controllers/authController');
const router = express.Router();

router.get('/register/customer', renderCustomerRegister);
router.get('/register/admin', renderAdminRegister);
router.get('/login', renderAdminLogin);

router.post('/register/customer', (req, res) => register(req, res, 'customer'));
router.post('/register/admin', (req, res) => register(req, res, 'admin'));
router.post('/login', login);
router.get('/verify-email', verifyEmail);

module.exports = router;
