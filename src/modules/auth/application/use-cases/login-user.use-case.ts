import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { User } from '../../domain/user';
import { UserRepository } from '../../domain/user.repository';
import { Email } from '../../domain/value-objects/email';
import { PasswordHasher } from '../ports/password-hasher';
import { TokenService } from '../ports/token-service';

export interface LoginUserCommand {
  email: string;
  password: string;
}

export interface LoginUserResult {
  accessToken: string;
  user: User;
}

export class LoginUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginUserCommand): Promise<LoginUserResult> {
    const user = await this.users.findByEmail(Email.create(command.email));

    if (!user) {
      // Spend the same hashing time as a real check so response times
      // do not reveal which emails are registered.
      await this.passwordHasher.hash(command.password);
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.compare(
      command.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    return { accessToken, user };
  }
}
