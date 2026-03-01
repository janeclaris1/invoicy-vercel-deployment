const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Message = require('../models/Message');
const ChatGroup = require('../models/ChatGroup');

const UPLOAD_DIR = path.join(__dirname, '../uploads/messages');
const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const REPLYING_TTL_MS = 12 * 1000; // 12 seconds

// In-memory: who is replying in which 1:1 conversation. Key = sorted "id1_id2", value = { userId, name, replyToMessageId, expiresAt }
const replyingStore = new Map();
const conversationKey = (id1, id2) => {
  const a = (id1 && id1.toString()) || '';
  const b = (id2 && id2.toString()) || '';
  return a < b ? `${a}_${b}` : `${b}_${a}`;
};
const pruneReplying = () => {
  const now = Date.now();
  for (const [k, v] of replyingStore.entries()) {
    if (v.expiresAt < now) replyingStore.delete(k);
  }
};

const getTeamMemberIds = async (currentUserId) => {
  try {
    if (!currentUserId) return [];
    const currentUser = await User.findById(currentUserId).select('createdBy').lean();
    if (!currentUser) return [currentUserId];
    if (!currentUser.createdBy) {
      const team = await User.find({ createdBy: currentUserId }).select('_id').lean();
      return [currentUserId, ...team.map((m) => m._id)];
    }
    const teamMembers = await User.find({
      $or: [
        { createdBy: currentUser.createdBy },
        { _id: currentUser.createdBy },
      ],
    }).select('_id').lean();
    return teamMembers.map((m) => m._id);
  } catch (err) {
    console.error('getTeamMemberIds error:', err);
    return [currentUserId];
  }
};

// @desc    Get list of team members (contacts) for messaging - exclude current user
exports.getContacts = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    const myId = req.user._id || req.user.id;
    if (!myId) return res.status(401).json({ message: 'Not authorized' });
    let teamMemberIds = [];
    try {
      teamMemberIds = await getTeamMemberIds(myId);
    } catch (teamErr) {
      console.error('Get contacts getTeamMemberIds error:', teamErr);
      return res.json([]);
    }
    const ids = Array.isArray(teamMemberIds) ? teamMemberIds : [];
    const excludeId = myId.toString();
    if (ids.length === 0) return res.json([]);
    const contacts = await User.find({ _id: { $in: ids } })
      .select('_id name email')
      .sort({ name: 1 })
      .lean();
    const filtered = contacts.filter((u) => (u._id && u._id.toString()) !== excludeId);
    res.json(filtered);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get conversations (1:1 + groups) with last message and unread count
exports.getConversations = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    const myId = req.user._id || req.user.id;
    if (!myId) return res.status(401).json({ message: 'Not authorized' });

    let teamMemberIds = [];
    try {
      teamMemberIds = await getTeamMemberIds(myId);
    } catch (teamErr) {
      console.error('Get conversations getTeamMemberIds error:', teamErr);
      return res.json([]);
    }

    let userConvos = [];
    try {
      const messages = await Message.find({
        $or: [{ sender: myId }, { recipient: myId }],
        deletedAt: null,
        group: null,
      })
        .populate('sender', 'name email')
        .populate('recipient', 'name email')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      const myIdStr = myId.toString();
      const byOther = {};
      for (const m of messages) {
        if (!m.sender || !m.recipient) continue;
        const senderId = (m.sender._id != null ? m.sender._id : m.sender).toString();
        const recipientId = (m.recipient._id != null ? m.recipient._id : m.recipient).toString();
        if (!senderId || !recipientId) continue;
        const otherUser = senderId === myIdStr ? m.recipient : m.sender;
        const otherIdVal = otherUser && (otherUser._id != null ? otherUser._id : otherUser).toString();
        if (!otherIdVal || !teamMemberIds.some((id) => id.toString() === otherIdVal)) continue;
        const key = otherIdVal;
        if (!byOther[key]) {
          byOther[key] = {
            type: 'user',
            otherUser: otherUser,
            lastMessage: null,
            unreadCount: 0,
          };
        }
        if (!byOther[key].lastMessage) {
          byOther[key].lastMessage = { body: m.body, createdAt: m.createdAt };
        }
        if (recipientId === myIdStr && !m.readAt) {
          byOther[key].unreadCount += 1;
        }
      }
      userConvos = Object.values(byOther);
    } catch (msgErr) {
      console.error('Get conversations messages error:', msgErr);
    }

    let groupConvos = [];
    try {
      const groups = await ChatGroup.find({ participants: myId })
        .populate('createdBy', 'name email')
        .populate('participants', 'name email')
        .sort({ updatedAt: -1 });
      for (const g of groups) {
        const lastMsg = await Message.findOne({ group: g._id, deletedAt: null })
          .sort({ createdAt: -1 })
          .populate('sender', 'name email');
        const unreadCount = await Message.countDocuments({
          group: g._id,
          deletedAt: null,
          sender: { $ne: myId },
          $nor: [{ readBy: { $elemMatch: { user: myId } } }],
        });
        groupConvos.push({
          type: 'group',
          group: { _id: g._id, name: g.name, participants: g.participants },
          lastMessage: lastMsg ? { body: lastMsg.body, createdAt: lastMsg.createdAt, sender: lastMsg.sender } : null,
          unreadCount,
        });
      }
    } catch (groupErr) {
      console.error('Get conversations groups error:', groupErr);
    }

    const all = [...userConvos, ...groupConvos].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : 0;
      return bTime - aTime;
    });
    res.json(all);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get messages (1:1 with ?with=userId or group with ?group=groupId); mark delivered/read
exports.getMessages = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    const myId = req.user._id || req.user.id;
    if (!myId) return res.status(401).json({ message: 'Not authorized' });

    const otherUserId = req.query.with;
    const groupId = req.query.group;

    if (groupId) {
      const group = await ChatGroup.findById(groupId);
      if (!group || !group.participants.some((id) => id.toString() === myId.toString())) {
        return res.status(403).json({ message: 'Not authorized to view this group' });
      }
      const messages = await Message.find({ group: groupId, deletedAt: null })
        .populate('sender', 'name email')
        .populate({ path: 'replyTo', select: 'body createdAt', populate: { path: 'sender', select: 'name' } })
        .sort({ createdAt: 1 });
      await Message.updateMany(
        { group: groupId, sender: { $ne: myId }, deletedAt: null, $nor: [{ readBy: { $elemMatch: { user: myId } } }] },
        { $push: { readBy: { user: myId, readAt: new Date() } } }
      );
      return res.json(messages);
    }

    if (!otherUserId) return res.status(400).json({ message: 'Missing with (user id) or group' });

    let teamMemberIds = [];
    try {
      teamMemberIds = await getTeamMemberIds(myId);
    } catch (teamErr) {
      console.error('Get messages getTeamMemberIds error:', teamErr);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!teamMemberIds.some((id) => id.toString() === otherUserId)) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }
    await Message.updateMany(
      { sender: otherUserId, recipient: myId, deliveredAt: null, deletedAt: null },
      { deliveredAt: new Date() }
    );
    await Message.updateMany(
      { sender: otherUserId, recipient: myId, readAt: null, deletedAt: null },
      { readAt: new Date() }
    );
    const messages = await Message.find({
      deletedAt: null,
      group: null,
      $or: [
        { sender: myId, recipient: otherUserId },
        { sender: otherUserId, recipient: myId },
      ],
    })
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate({ path: 'replyTo', select: 'body createdAt', populate: { path: 'sender', select: 'name' } })
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message (1:1 or group; optionally with file attachments)
exports.createMessage = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    const myId = req.user._id || req.user.id;
    if (!myId) return res.status(401).json({ message: 'Invalid user' });

    const recipientId = req.body?.recipientId;
    const groupId = req.body?.groupId;
    const body = (req.body?.body != null ? String(req.body.body) : '').trim();
    const replyToMessageId = req.body?.replyToMessageId || null;
    const files = req.files || [];
    if (!recipientId && !groupId) {
      return res.status(400).json({ message: 'recipientId or groupId is required' });
    }
    if (!body && files.length === 0) {
      return res.status(400).json({ message: 'Message must have text and/or attachments' });
    }
    const attachments = files.map((f) => ({
      url: f.filename,
      filename: f.originalname,
      contentType: f.mimetype || 'application/octet-stream',
    }));
    if (groupId) {
      const group = await ChatGroup.findById(groupId);
      if (!group || !group.participants.some((id) => id.toString() === myId.toString())) {
        return res.status(403).json({ message: 'Not authorized to message this group' });
      }
      const message = await Message.create({
        sender: myId,
        group: groupId,
        body,
        replyTo: replyToMessageId || undefined,
        attachments: attachments.length ? attachments : undefined,
      });
      await ChatGroup.findByIdAndUpdate(groupId, { updatedAt: new Date() });
      const populated = await Message.findById(message._id)
        .populate('sender', 'name email')
        .populate({ path: 'replyTo', select: 'body createdAt', populate: { path: 'sender', select: 'name' } });
      return res.status(201).json(populated);
    }

    const teamMemberIds = await getTeamMemberIds(myId);
    if (!teamMemberIds.some((id) => id.toString() === recipientId)) {
      return res.status(403).json({ message: 'Not authorized to message this user' });
    }
    const message = await Message.create({
      sender: myId,
      recipient: recipientId,
      body,
      replyTo: replyToMessageId || undefined,
      attachments: attachments.length ? attachments : undefined,
    });
    const populated = await Message.findById(message._id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate({ path: 'replyTo', select: 'body createdAt', populate: { path: 'sender', select: 'name' } });
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark messages from a user as read (and delivered)
exports.markRead = async (req, res) => {
  try {
    const { fromUserId } = req.body;
    if (!fromUserId) return res.status(400).json({ message: 'fromUserId is required' });
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    if (!teamMemberIds.some((id) => id.toString() === fromUserId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Message.updateMany(
      { sender: fromUserId, recipient: req.user._id, readAt: null, deletedAt: null },
      { readAt: new Date(), deliveredAt: new Date() }
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Set or clear "I am replying" in a 1:1 conversation (so the other party can show "X is replying")
exports.setReplying = async (req, res) => {
  try {
    pruneReplying();
    const myId = (req.user._id && req.user._id.toString()) || '';
    const withUserId = req.body?.withUserId ? String(req.body.withUserId).trim() : null;
    const replyToMessageId = req.body?.replyToMessageId || null;
    if (!withUserId || withUserId === myId) {
      return res.json({ ok: true });
    }
    const key = conversationKey(myId, withUserId);
    if (req.body?.clear) {
      const existing = replyingStore.get(key);
      if (existing && existing.userId === myId) replyingStore.delete(key);
      return res.json({ ok: true });
    }
    const expiresAt = Date.now() + REPLYING_TTL_MS;
    replyingStore.set(key, {
      userId: myId,
      name: req.user.name || req.user.email || 'Someone',
      replyToMessageId: replyToMessageId || null,
      expiresAt,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Set replying error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get whether the other user (with=userId) is currently replying in conversation with me
exports.getReplying = async (req, res) => {
  try {
    pruneReplying();
    const myId = (req.user._id && req.user._id.toString()) || '';
    const withUserId = req.query.with ? String(req.query.with).trim() : null;
    if (!withUserId || withUserId === myId) {
      return res.json({ replying: false });
    }
    const key = conversationKey(myId, withUserId);
    const entry = replyingStore.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      return res.json({ replying: false });
    }
    // They are replying if the stored userId is the "other" user (withUserId)
    if (entry.userId !== withUserId) {
      return res.json({ replying: false });
    }
    res.json({
      replying: true,
      userId: entry.userId,
      name: entry.name,
      replyToMessageId: entry.replyToMessageId || undefined,
    });
  } catch (err) {
    console.error('Get replying error:', err);
    res.status(500).json({ replying: false });
  }
};

// @desc    Get total unread count (for badge)
exports.getUnreadCount = async (req, res) => {
  try {
    const myId = req.user._id;
    const oneToOne = await Message.countDocuments({
      recipient: myId,
      deletedAt: null,
      readAt: null,
    });
    const groupMsgs = await Message.aggregate([
      { $match: { group: { $ne: null }, sender: { $ne: myId }, deletedAt: null } },
      { $match: { $nor: [{ readBy: { $elemMatch: { user: myId } } }] } },
      { $lookup: { from: 'chatgroups', localField: 'group', foreignField: '_id', as: 'g' } },
      { $unwind: '$g' },
      { $match: { 'g.participants': myId } },
      { $count: 'count' },
    ]);
    const groupCount = (groupMsgs[0] && groupMsgs[0].count) || 0;
    res.json({ count: oneToOne + groupCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Edit a message (sender only, within time window)
exports.updateMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg || msg.deletedAt) return res.status(404).json({ message: 'Message not found' });
    if (msg.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }
    const age = Date.now() - new Date(msg.createdAt).getTime();
    if (age > EDIT_WINDOW_MS) return res.status(400).json({ message: 'Message can only be edited within 15 minutes' });
    const body = (req.body.body != null ? req.body.body : '').trim();
    if (body !== undefined) {
      msg.body = body;
      msg.editedAt = new Date();
    }
    await msg.save();
    const populated = await Message.findById(msg._id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email');
    res.json(populated);
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a message (soft delete; sender only)
exports.deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg || msg.deletedAt) return res.status(404).json({ message: 'Message not found' });
    if (msg.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    msg.deletedAt = new Date();
    await msg.save();
    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------- Groups --------
exports.getGroups = async (req, res) => {
  try {
    const groups = await ChatGroup.find({ participants: req.user._id })
      .populate('createdBy', 'name email')
      .populate('participants', 'name email')
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Group name is required' });
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const valid = (participantIds || []).filter((id) => teamMemberIds.some((mid) => mid.toString() === id));
    const participants = [req.user._id, ...valid.filter((id) => id.toString() !== req.user._id.toString())];
    const group = await ChatGroup.create({
      name: name.trim(),
      createdBy: req.user._id,
      participants,
    });
    const populated = await ChatGroup.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('participants', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Serve a message attachment file (auth required)
exports.getAttachment = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes('..')) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Get attachment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
  