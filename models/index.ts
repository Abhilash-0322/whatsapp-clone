import mongoose from 'mongoose';

// Import all models to ensure they are registered
import './User';
import './Conversation';
import './Message';

// Export the models
export { default as User } from './User';
export { default as Conversation } from './Conversation';
export { default as Message } from './Message';

// Ensure models are registered only once
const models = {
  User: mongoose.models.User || require('./User').default,
  Conversation: mongoose.models.Conversation || require('./Conversation').default,
  Message: mongoose.models.Message || require('./Message').default,
};

export default models; 