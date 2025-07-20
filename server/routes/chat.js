const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/auth');

// All chat routes require authentication
router.use(authMiddleware);

router.post('/:wagerId/send', chatController.sendMessage);
router.get('/:wagerId/messages', chatController.getMessages);

module.exports = router;