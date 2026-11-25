import { UserNotFoundError } from '../domain/errors/user-not-found.error';
import { User } from '../domain/user';
import { UserRepository } from '../domain/user.repository';
import { Email } from '../domain/value-objects/email';

export class InMemoryUserRepository extends UserRepository {
  readonly users = new Map<string, User>();

  findByEmail(email: Email): Promise<User | null> {
    const user = [...this.users.values()].find((u) => u.email.equals(email));
    return Promise.resolve(user ?? null);
  }

  create(user: User): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  update(user: User): Promise<void> {
    if (!this.users.has(user.id)) {
      return Promise.reject(new UserNotFoundError());
    }
    this.users.set(user.id, user);
    return Promise.resolve();
  }
}
