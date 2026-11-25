import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error';
import { assertValidPassword } from '../../domain/password-policy';
import { User } from '../../domain/user';
import { UserRepository } from '../../domain/user.repository';
import { Email } from '../../domain/value-objects/email';
import { PasswordHasher } from '../ports/password-hasher';

export interface RegisterUserCommand {
  name: string;
  email: string;
  password: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<User> {
    const email = Email.create(command.email);

    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyRegisteredError();
    }

    assertValidPassword(command.password);
    const passwordHash = await this.passwordHasher.hash(command.password);
    const user = User.register({ name: command.name, email, passwordHash });

    await this.users.create(user);
    return user;
  }
}
