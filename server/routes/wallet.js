const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authMiddleware } = require('../middleware/auth');

// All wallet routes require authentication
router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.post('/deposit', walletController.initiateDeposit);
router.post('/verify-deposit', walletController.verifyDeposit);
router.post('/withdraw', walletController.initiateWithdrawal);
router.get('/transactions', walletController.getTransactions);

module.exports = router;
