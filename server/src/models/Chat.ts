import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const ChatSchema = new Schema(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    }
  },
  { timestamps: true }
);

// Make sure the participants array is always sorted to ensure we can
// efficiently query for a conversation between two users
ChatSchema.pre('save', function(next) {
  console.log('[Mongoose] Pre-save hook for Chat model', {
    isNew: this.isNew,
    isModified: this.isModified('participants'),
    participants: this.participants
  });
  
  if (this.isModified('participants')) {
    // Sort by string value to ensure consistent ordering
    this.participants.sort((a, b) => 
      a.toString().localeCompare(b.toString())
    );
  }
  next();
});

// Create a compound index on participants for efficient querying
ChatSchema.index({ participants: 1 });
ChatSchema.index({ updatedAt: -1 });

const Chat = mongoose.model<IChat>('Chat', ChatSchema);

// Add console log to confirm model registration
console.log('[Mongoose] Chat model registered');

export default Chat; 