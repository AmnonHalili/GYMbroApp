import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getUserChats,
  getSingleChat,
  getChatMessages,
  markMessagesAsRead,
  getUnreadMessageCount
} from '../controllers/chatController';
import Message from '../models/Message';
import Chat from '../models/Chat';
import mongoose from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Get all chats for the logged-in user
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's chats
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticateToken, getUserChats);

/**
 * @swagger
 * /api/chats/unread:
 *   get:
 *     summary: Get count of unread messages for the logged-in user
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread message count
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/unread', authenticateToken, getUnreadMessageCount);

/**
 * @swagger
 * /api/chats/user/{userId}:
 *   get:
 *     summary: Get or create a chat with a specific user
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the chat partner
 *     responses:
 *       200:
 *         description: Chat details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', authenticateToken, getSingleChat);

/**
 * @swagger
 * /api/chats/{chatId}:
 *   get:
 *     summary: Get a chat by ID
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.get('/:chatId', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  Chat.findById(chatId)
    .then(chat => {
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
      return res.status(200).json(chat);
    })
    .catch(error => {
      console.error('Error getting chat:', error);
      return res.status(500).json({ error: 'Failed to get chat' });
    });
});

/**
 * @swagger
 * /api/chats/{chatId}/messages:
 *   get:
 *     summary: Get messages for a specific chat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Chat messages
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.get('/:chatId/messages', authenticateToken, getChatMessages);

/**
 * @swagger
 * /api/chats/{chatId}/read:
 *   post:
 *     summary: Mark all messages in a chat as read
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.post('/:chatId/read', authenticateToken, markMessagesAsRead);

// Create a new message in a chat
router.post('/:chatId/messages', authenticateToken, async (req: any, res: any) => {
  const { chatId } = req.params;
  const { content, recipient } = req.body;
  const senderId = req.user._id;

  if (!content) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    // Verify chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Verify sender is part of this chat
    if (!chat.participants.includes(senderId)) {
      return res.status(403).json({ error: 'You are not a participant in this chat' });
    }

    // Create the message
    const message = new Message({
      sender: senderId,
      recipient,
      content,
      chat: chatId,
      read: false
    });

    await message.save();

    // Update the chat's last message
    // Need to use the string version and convert to ObjectId explicitly
    chat.lastMessage = new mongoose.Types.ObjectId(message._id.toString());
    chat.updatedAt = new Date();
    await chat.save();

    // Populate sender info for the response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profilePicture')
      .lean();

    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    return res.status(500).json({ error: 'Failed to create message' });
  }
});

export default router; 