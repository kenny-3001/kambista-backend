import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Currency } from '../../domain/currency';

@Schema({ collection: 'transactions', versionKey: false })
export class TransactionDocument {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ type: String, required: true, enum: Currency })
  sourceCurrency!: Currency;

  @Prop({ type: String, required: true, enum: Currency })
  targetCurrency!: Currency;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  convertedAmount!: number;

  @Prop({ required: true })
  rate!: number;

  @Prop({ required: true })
  createdAt!: Date;
}

export const TransactionSchema =
  SchemaFactory.createForClass(TransactionDocument);

// The history is read per user and date range, newest first with _id as the
// tie-breaker. The index follows that exact order so MongoDB never has to
// sort in memory.
TransactionSchema.index({ userId: 1, createdAt: -1, _id: -1 });
