import { assertValidPassword } from '../../domain/password-policy';
import { User } from '../../domain/user';
import { UserRepository } from '../../domain/user.repository';
import { Email } from '../../domain/value-objects/email';
import { PasswordHasher } from '../ports/password-hasher';

export interface EnsureAdminUserCommand {
  name: string;
  email: string;
  password: string;
}

export type EnsureAdminUserOutcome = 'created' | 'promoted' | 'unchanged';

export interface EnsureAdminUserResult {
  user: User;
  outcome: EnsureAdminUserOutcome;
}

/**
 * Idempotently guarantees that an admin exists for the given email:
 * creates it when missing, promotes an existing user otherwise, and leaves
 * an existing admin untouched.
 *
 * Registration is public, so anyone could sign up with the admin email before
 * the seed runs. Promoting that account as it is would hand admin rights to
 * whoever chose its password; that is why a promoted user always gets the
 * configured password.
 */
export class EnsureAdminUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    command: EnsureAdminUserCommand,
  ): Promise<EnsureAdminUserResult> {
    const email = Email.create(command.email);
    const existing = await this.users.findByEmail(email);

    if (existing) {
      if (existing.isAdmin()) {
        return { user: existing, outcome: 'unchanged' };
      }
      assertValidPassword(command.password);
      existing.changePassword(await this.passwordHasher.hash(command.password));
      existing.promoteToAdmin();
      await this.users.update(existing);
      return { user: existing, outcome: 'promoted' };
    }

    assertValidPassword(command.password);
    const user = User.register({
      name: command.name,
      email,
      passwordHash: await this.passwordHasher.hash(command.password),
    });
    user.promoteToAdmin();
    await this.users.create(user);
    return { user, outcome: 'created' };
  }
}
