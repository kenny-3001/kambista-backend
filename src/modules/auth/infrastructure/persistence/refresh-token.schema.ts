import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'refresh_tokens', versionKey: false })
export class RefreshTokenDocument {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  familyId!: string;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true })
  createdAt!: Date;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;
}

export const RefreshTokenSchema =
  SchemaFactory.createForClass(RefreshTokenDocument);

// Closing a session or every session of a user.
RefreshTokenSchema.index({ familyId: 1 });
RefreshTokenSchema.index({ userId: 1 });
// MongoDB deletes each token shortly after it expires. Used tokens are kept
// until then, so reusing one is still detected.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
