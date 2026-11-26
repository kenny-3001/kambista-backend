import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'login_attempts', versionKey: false })
export class LoginAttemptDocument {
  /** SHA-256 of the key, so no email or IP is stored in clear text. */
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  count!: number;

  @Prop({ required: true })
  resetsAt!: Date;
}

export const LoginAttemptSchema =
  SchemaFactory.createForClass(LoginAttemptDocument);

// MongoDB deletes each window shortly after it ends.
LoginAttemptSchema.index({ resetsAt: 1 }, { expireAfterSeconds: 0 });
