const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const uploadMessageFiles = require('../middlewares/uploadMessageFiles');
const {
  getContacts,
  getConversations,
  getMessages,
  createMessage,
  markRead,
  getAttachment,
  getUnreadCount,
  updateMessage,
  deleteMessage,
  getGroups,
  createGroup,
} = require('../controller/messagingController');

const router = express.Router();

router.use(protect);

router.get('/contacts', getContacts);
router.get('/conversations', getConversations);
router.get('/unread-count', getUnreadCount);
router.get('/messages', getMessages);
// Accept JSON (no files) or multipart/form-data (with optional files)
router.post('/messages', (req, res, next) => {
  const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');
  if (isMultipart) {
    uploadMessageFiles(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || 'File upload failed' });
      next();
    });
  } else {
    next();
  }
}, createMessage);
router.put('/messages/read', markRead);
router.put('/messages/:id', updateMessage);
router.delete('/messages/:id', deleteMessage);
router.get('/groups', getGroups);
router.post('/groups', createGroup);
router.get('/attachment/:filename', getAttachment);

module.exports = router;
