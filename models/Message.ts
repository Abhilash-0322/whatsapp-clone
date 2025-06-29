import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file';
  readBy: {
    user: mongoose.Types.ObjectId;
    readAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);