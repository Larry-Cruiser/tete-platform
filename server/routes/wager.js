const express = require('express');
const router = express.Router();
const wagerController = require('../controllers/wagerController');
const { authMiddleware } = require('../middleware/auth');

// Public routes (can view without auth)
router.get('/public', wagerController.getWagers);
router.get('/details/:wagerId', wagerController.getWagerDetails);

// Protected routes
router.use(authMiddleware);

router.post('/create', wagerController.createWager);
router.post('/:wagerId/join', wagerController.joinWager);
router.post('/:wagerId/approve', wagerController.approveJoiner);
router.post('/:wagerId/outcome', wagerController.submitOutcome);
router.post('/:wagerId/cancel', wagerController.cancelWager);
router.get('/my-wagers', wagerController.getMyWagers);

module.exports = router;