import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isDuplicateKeyError } from '../../../../shared/infrastructure/database/mongo-errors';
import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import { User } from '../../domain/user';
import { UserRepository } from '../../domain/user.repository';
import { Email } from '../../domain/value-objects/email';
import { UserMapper } from './user.mapper';
import { UserDocument } from './user.schema';

@Injectable()
export class MongoUserRepository extends UserRepository {
  constructor(
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    const document = await this.userModel
      .findById(id)
      .lean<UserDocument>()
      .exec();
    return document ? UserMapper.toDomain(document) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const document = await this.userModel
      .findOne({ email: email.value })
      .lean<UserDocument>()
      .exec();
    return document ? UserMapper.toDomain(document) : null;
  }

  async create(user: User): Promise<void> {
    try {
      await this.userModel.create(UserMapper.toPersistence(user));
    } catch (error) {
      // The unique index is the last line of defense against two
      // concurrent registrations with the same email.
      if (isDuplicateKeyError(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  async update(user: User): Promise<void> {
    const { _id, ...fields } = UserMapper.toPersistence(user);
    const { matchedCount } = await this.userModel
      .updateOne({ _id }, { $set: fields })
      .exec();
    if (matchedCount === 0) {
      throw new UserNotFoundError();
    }
  }

  async search(params: { text?: string; limit: number }): Promise<User[]> {
    const text = params.text?.trim();
    const filter = text
      ? {
          $or: [
            { name: { $regex: escapeRegex(text), $options: 'i' } },
            { email: { $regex: escapeRegex(text), $options: 'i' } },
          ],
        }
      : {};
    const documents = await this.userModel
      .find(filter)
      // The collation makes the order ignore case and accents.
      .collation({ locale: 'es', strength: 2 })
      .sort({ name: 1, email: 1 })
      .limit(params.limit)
      .lean<UserDocument[]>()
      .exec();
    return documents.map((document) => UserMapper.toDomain(document));
  }
}

/** Makes user input match literally inside a regular expression. */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
