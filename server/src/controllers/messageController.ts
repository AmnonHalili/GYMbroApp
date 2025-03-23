import { Request, Response } from 'express';
import Message from '../models/Message';
import Chat from '../models/Chat';
import mongoose from 'mongoose';

/**
 * Get messages for a specific chat
 */
export const getChatMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[MessageController] Getting messages for chat:', req.params.chatId);
    const userId = req.userId;
    const { chatId } = req.params;
    const { page = '1', limit = '20' } = req.query;
    
    if (!userId) {
      console.log('[MessageController] No userId found in request');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    // Validate chat exists and user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });
    
    if (!chat) {
      console.log('[MessageController] Chat not found or user not a participant:', chatId);
      res.status(404).json({ message: 'Chat not found' });
      return;
    }
    
    console.log('[MessageController] Found chat:', chat._id);
    console.log('[MessageController] Fetching messages with pagination');
    
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Get messages for this chat
    const messages = await Message.find({
      chat: chatId
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .populate('sender', 'username profilePicture')
      .lean();
    
    // Get total count for pagination
    const total = await Message.countDocuments({ chat: chatId });
    
    console.log(`[MessageController] Retrieved ${messages.length} messages out of ${total} total`);
    
    // Mark messages as read if recipient is the current user
    const unreadMessages = messages.filter(
      message => message.recipient?.toString() === userId.toString() && !message.read
    );
    
    if (unreadMessages.length > 0) {
      console.log(`[MessageController] Marking ${unreadMessages.length} messages as read`);
      const messageIds = unreadMessages.map(message => message._id);
      
      await Message.updateMany(
        { 
          _id: { $in: messageIds }
        },
        { 
          $set: { 
            read: true,
            readAt: new Date()
          }
        }
      );
      
      // Update the returned messages to show they're read
      unreadMessages.forEach(message => {
        message.read = true;
        message.readAt = new Date();
      });
    }
    
    res.status(200).json({
      messages: messages.reverse(), // Reverse to get chronological order for client
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber)
      }
    });
    
  } catch (error) {
    console.error('[MessageController] Error getting chat messages:', error);
    res.status(500).json({ message: 'Failed to get messages' });
  }
};

/**
 * Get unread message counts for all chats
 */
export const getUnreadMessageCounts = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[MessageController] Getting unread message counts for user');
    const userId = req.userId;
    
    if (!userId) {
      console.log('[MessageController] No userId found in request');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    // Find all chats for this user
    const chats = await Chat.find({
      participants: userId
    });
    
    console.log(`[MessageController] Found ${chats.length} chats for user`);
    
    // Get unread message counts for each chat
    const chatIds = chats.map(chat => chat._id);
    
    const pipeline = [
      {
        $match: {
          chat: { $in: chatIds },
          recipient: new mongoose.Types.ObjectId(userId as string),
          read: false
        }
      },
      {
        $group: {
          _id: '$chat',
          count: { $sum: 1 }
        }
      }
    ];
    
    const unreadCounts = await Message.aggregate(pipeline);
    
    console.log(`[MessageController] Found unread messages in ${unreadCounts.length} chats`);
    
    const result = chatIds.map(chatId => {
      const unreadInfo = unreadCounts.find(
        item => item._id.toString() === chatId.toString()
      );
      return {
        chatId: chatId.toString(),
        unreadCount: unreadInfo ? unreadInfo.count : 0
      };
    });
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('[MessageController] Error getting unread messages count:', error);
    res.status(500).json({ message: 'Failed to get unread message counts' });
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[MessageController] Marking messages as read');
    const userId = req.userId;
    const { messageIds } = req.body;
    
    if (!userId) {
      console.log('[MessageController] No userId found in request');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      console.log('[MessageController] No valid messageIds provided:', messageIds);
      res.status(400).json({ message: 'No message IDs provided' });
      return;
    }
    
    console.log(`[MessageController] Marking ${messageIds.length} messages as read:`, messageIds);
    
    // Update messages where the current user is the recipient
    const result = await Message.updateMany(
      { 
        _id: { $in: messageIds },
        recipient: userId,
        read: false
      },
      { 
        $set: { 
          read: true,
          readAt: new Date()
        }
      }
    );
    
    console.log(`[MessageController] Updated ${result.modifiedCount} messages`);
    
    res.status(200).json({ 
      success: true,
      markedAsRead: result.modifiedCount
    });
    
  } catch (error) {
    console.error('[MessageController] Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
}; 