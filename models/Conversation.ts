import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);