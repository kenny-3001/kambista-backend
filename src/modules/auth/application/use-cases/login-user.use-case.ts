import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { TooManyLoginAttemptsError } from '../../domain/errors/too-many-login-attempts.error';
import { User } from '../../domain/user';
import { UserRepository } from '../../domain/user.repository';
import { Email } from '../../domain/value-objects/email';
import { LoginAttemptCounter } from '../ports/login-attempt-counter';
import { PasswordHasher } from '../ports/password-hasher';
import { TokenService } from '../ports/token-service';

export interface LoginUserCommand {
  email: string;
  password: string;
  /** Address the request comes from; part of the brute-force limit key. */
  clientIp: string;
}

export interface LoginUserResult {
  accessToken: string;
  user: User;
}

export interface LoginAttemptPolicy {
  /** Failed attempts allowed per email and IP within one window. */
  maxFailedAttempts: number;
  windowMs: number;
}

export class LoginUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly attempts: LoginAttemptCounter,
    private readonly policy: LoginAttemptPolicy,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(command: LoginUserCommand): Promise<LoginUserResult> {
    const email = Email.create(command.email);
    // Keyed by email and IP: an attacker cannot lock the owner out from
    // another address, and cannot try many passwords from their own.
    const attemptKey = `${email.value}|${command.clientIp}`;

    // The attempt is counted before checking the password, atomically, so
    // a burst of concurrent requests cannot slip past the limit. A
    // successful login resets the count: in effect only failures add up.
    const now = this.now();
    const window = await this.attempts.increment(
      attemptKey,
      now,
      this.policy.windowMs,
    );
    if (window.count > this.policy.maxFailedAttempts) {
      // Rejected even with the right password: the attacker learns nothing.
      throw new TooManyLoginAttemptsError(
        Math.max(
          1,
          Math.ceil((window.resetsAt.getTime() - now.getTime()) / 1000),
        ),
      );
    }

    const user = await this.authenticate(email, command.password);
    await this.attempts.reset(attemptKey);

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    return { accessToken, user };
  }

  private async authenticate(email: Email, password: string): Promise<User> {
    const user = await this.users.findByEmail(email);

    if (!user) {
      // Spend the same hashing time as a real check so response times
      // do not reveal which emails are registered.
      await this.passwordHasher.hash(password);
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.compare(
      password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }
    return user;
  }
}
