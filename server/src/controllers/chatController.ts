import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message';
import Chat from '../models/Chat';
import User, { IUser } from '../models/User';

// Get all chats for a user
export const getUserChats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast user to any to access _id safely
    const userId = (req.user as any)?._id;
    
    console.log('[ChatController] getUserChats for userId:', userId);
    
    if (!userId) {
      console.log('[ChatController] userId not found in request');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Find all chats where the user is a participant
    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'username profilePicture')
      .populate({
        path: 'lastMessage',
        select: 'content createdAt read sender',
        populate: {
          path: 'sender',
          select: 'username'
        }
      })
      .sort({ updatedAt: -1 })
      .lean();
      
    console.log(`[ChatController] Found ${chats.length} chats for user`);

    // Prepare the response data
    const formattedChats = chats.map(chat => {
      // Filter out the current user from participants
      const otherParticipant = chat.participants.find(
        (p: any) => p._id.toString() !== userId.toString()
      );

      return {
        _id: chat._id,
        participant: otherParticipant,
        lastMessage: chat.lastMessage,
        updatedAt: chat.updatedAt,
        unreadCount: 0 // Will be updated with real count
      };
    });

    // Get unread counts in parallel for each chat
    const unreadPromises = formattedChats.map(async (chat: any) => {
      const count = await Message.countDocuments({
        chat: chat._id,
        recipient: userId,
        read: false
      });
      chat.unreadCount = count;
      return chat;
    });

    const chatsWithUnreadCounts = await Promise.all(unreadPromises);
    console.log(`[ChatController] Returning ${chatsWithUnreadCounts.length} chats with unread counts`);

    res.json(chatsWithUnreadCounts);
  } catch (error: any) {
    console.error('[ChatController] Error getting user chats:', error);
    res.status(500).json({ message: 'Failed to get user chats', error: error.message });
  }
};

// Get single chat between current user and another user
export const getSingleChat = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast user to any to access _id safely
    const userId = (req.user as any)?._id;
    const otherUserId = req.params.userId;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }

    // Verify the other user exists
    const otherUser = await User.findById(otherUserId).select('username profilePicture').lean();
    if (!otherUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Sort IDs to ensure consistent querying
    const participants = [userId, new mongoose.Types.ObjectId(otherUserId)].sort((a, b) => 
      a.toString().localeCompare(b.toString())
    );

    // Find or create chat
    let chat = await Chat.findOne({ 
      participants: { $all: participants },
      $expr: { $eq: [{ $size: '$participants' }, 2] } // Ensure exactly 2 participants
    });

    if (!chat) {
      // Create a new chat if it doesn't exist
      chat = await Chat.create({
        participants
      });
    }

    res.json({
      chatId: chat._id,
      participant: otherUser
    });
  } catch (error: any) {
    console.error('Error getting/creating chat:', error);
    res.status(500).json({ message: 'Failed to get/create chat', error: error.message });
  }
};

// Get messages for a specific chat
export const getChatMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast user to any to access _id safely
    const userId = (req.user as any)?._id;
    const chatId = req.params.chatId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      res.status(400).json({ message: 'Invalid chat ID' });
      return;
    }

    // Verify the chat exists and user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      res.status(404).json({ message: 'Chat not found or you are not a participant' });
      return;
    }

    // Get messages with pagination
    const messages = await Message.find({ 
      $or: [
        { sender: userId, recipient: { $in: chat.participants.filter(p => p.toString() !== userId.toString()) } },
        { recipient: userId, sender: { $in: chat.participants.filter(p => p.toString() !== userId.toString()) } }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'username profilePicture')
      .lean();

    // Mark messages as read
    await Message.updateMany(
      {
        recipient: userId,
        read: false,
        $or: [
          { sender: { $in: chat.participants.filter(p => p.toString() !== userId.toString()) } }
        ]
      },
      { read: true }
    );

    // Count total messages for pagination info
    const totalMessages = await Message.countDocuments({
      $or: [
        { sender: userId, recipient: { $in: chat.participants.filter(p => p.toString() !== userId.toString()) } },
        { recipient: userId, sender: { $in: chat.participants.filter(p => p.toString() !== userId.toString()) } }
      ]
    });

    res.json({
      messages: messages.reverse(), // Reverse to get oldest messages first
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages
      }
    });
  } catch (error: any) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({ message: 'Failed to get chat messages', error: error.message });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast user to any to access _id safely
    const userId = (req.user as any)?._id;
    const chatId = req.params.chatId;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      res.status(400).json({ message: 'Invalid chat ID' });
      return;
    }

    // Verify the chat exists and user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      res.status(404).json({ message: 'Chat not found or you are not a participant' });
      return;
    }

    // Mark all messages in this chat as read
    const result = await Message.updateMany(
      {
        recipient: userId,
        read: false,
        sender: { $in: chat.participants.filter(p => p.toString() !== userId.toString()) }
      },
      { read: true }
    );

    res.json({ 
      success: true, 
      markedAsRead: result.modifiedCount
    });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read', error: error.message });
  }
};

// Get unread message count
export const getUnreadMessageCount = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast user to any to access _id safely
    const userId = (req.user as any)?._id;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Count all unread messages for the user
    const count = await Message.countDocuments({
      recipient: userId,
      read: false
    });

    res.json({ unreadCount: count });
  } catch (error: any) {
    console.error('Error getting unread message count:', error);
    res.status(500).json({ message: 'Failed to get unread message count', error: error.message });
  }
}; 