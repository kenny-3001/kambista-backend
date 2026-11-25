import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from '../../domain/role';

@Schema({ collection: 'users', versionKey: false })
export class UserDocument {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: String, required: true, enum: Object.values(Role) })
  role!: Role;

  @Prop({ required: true })
  createdAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
