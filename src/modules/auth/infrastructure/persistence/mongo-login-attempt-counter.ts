import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Model } from 'mongoose';
import { isDuplicateKeyError } from '../../../../shared/infrastructure/database/mongo-errors';
import {
  LoginAttemptCounter,
  LoginAttemptWindow,
} from '../../application/ports/login-attempt-counter';
import { LoginAttemptDocument } from './login-attempt.schema';

@Injectable()
export class MongoLoginAttemptCounter extends LoginAttemptCounter {
  constructor(
    @InjectModel(LoginAttemptDocument.name)
    private readonly attemptModel: Model<LoginAttemptDocument>,
  ) {
    super();
  }

  async increment(
    key: string,
    now: Date,
    windowMs: number,
  ): Promise<LoginAttemptWindow> {
    try {
      return await this.incrementOnce(key, now, windowMs);
    } catch (error) {
      // Two first attempts at once may both try to insert the document;
      // the loser retries and finds it.
      if (isDuplicateKeyError(error)) {
        return this.incrementOnce(key, now, windowMs);
      }
      throw error;
    }
  }

  async reset(key: string): Promise<void> {
    await this.attemptModel.deleteOne({ _id: hashKey(key) }).exec();
  }

  private async incrementOnce(
    key: string,
    now: Date,
    windowMs: number,
  ): Promise<LoginAttemptWindow> {
    // A single atomic update: continue the open window, or start a new one
    // if there is none or it already ended (the TTL cleanup is not
    // immediate, so an ended window may still be stored).
    const isOpen = { $gt: ['$resetsAt', now] };
    const document = await this.attemptModel
      .findOneAndUpdate(
        { _id: hashKey(key) },
        [
          {
            $set: {
              count: { $cond: [isOpen, { $add: ['$count', 1] }, 1] },
              resetsAt: {
                $cond: [
                  isOpen,
                  '$resetsAt',
                  new Date(now.getTime() + windowMs),
                ],
              },
            },
          },
        ],
        { upsert: true, new: true },
      )
      .lean<LoginAttemptDocument>()
      .exec();

    return { count: document.count, resetsAt: document.resetsAt };
  }
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
