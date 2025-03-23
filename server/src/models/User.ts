import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    image: {
      type: String
    }
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function(next) {
  const user = this as unknown as IUser;
  if (user.isModified('password') && user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const user = this as unknown as IUser;
  console.log('Password comparison:', { 
    hasPassword: !!user.password,
    candidateLength: candidatePassword?.length,
    storedPasswordLength: user.password?.length
  });
  
  if (!user.password) return false;
  
  const isMatch = await bcrypt.compare(candidatePassword, user.password);
  console.log('Password match result:', isMatch);
  return isMatch;
};

export default mongoose.model<IUser>('User', UserSchema); 