import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'exchange_rates', versionKey: false })
export class ExchangeRateDocument {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  buy!: number;

  @Prop({ required: true })
  sell!: number;

  @Prop({ required: true })
  currency!: string;

  @Prop({ required: true })
  source!: string;

  @Prop({ required: true })
  date!: string;

  @Prop({ required: true })
  fetchedAt!: Date;
}

export const ExchangeRateSchema =
  SchemaFactory.createForClass(ExchangeRateDocument);

// Supports "latest rate" lookups without scanning the collection.
ExchangeRateSchema.index({ fetchedAt: -1 });
