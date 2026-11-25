import { User } from '../../domain/user';
import { Email } from '../../domain/value-objects/email';
import { UserDocument } from './user.schema';

export const UserMapper = {
  toDomain(document: UserDocument): User {
    return User.restore({
      id: document._id,
      name: document.name,
      email: Email.create(document.email),
      passwordHash: document.passwordHash,
      role: document.role,
      createdAt: document.createdAt,
    });
  },

  toPersistence(user: User): UserDocument {
    return {
      _id: user.id,
      name: user.name,
      email: user.email.value,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: user.createdAt,
    };
  },
};
