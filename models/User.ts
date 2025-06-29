import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  lastSeenString?: string; // Virtual field for frontend
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  avatar: {
    type: String,
    default: '',
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Convert lastSeen to string for frontend compatibility
      if (ret.lastSeen) {
        ret.lastSeen = ret.lastSeen.toISOString();
      }
      return ret;
    }
  }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);