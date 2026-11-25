import { User } from './user';
import { Email } from './value-objects/email';

/**
 * Persistence contract for users. Declared as an abstract class so it can
 * double as the dependency injection token without coupling the domain
 * to the framework.
 */
export abstract class UserRepository {
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract create(user: User): Promise<void>;
}
