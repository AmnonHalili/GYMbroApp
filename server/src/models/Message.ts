import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  content: string;
  chat: mongoose.Types.ObjectId;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Add logging to each message save operation
MessageSchema.pre('save', function(next) {
  const message = this as IMessage;
  const isNew = message.isNew;
  console.log(`[Message Model] Saving message: ${message._id}, sender=${message.sender}, recipient=${message.recipient}, content="${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}", isNew=${isNew}`);
  next();
});

// Add index for better query performance
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, createdAt: -1 });
MessageSchema.index({ chat: 1, createdAt: -1 });
MessageSchema.index({ recipient: 1, read: 1 });

const Message = mongoose.model<IMessage>('Message', MessageSchema);

// Add console log to confirm model registration
console.log('[Models] Registered Message model');

export default Message; 