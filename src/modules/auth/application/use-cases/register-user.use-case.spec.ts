import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error';
import { InvalidEmailError } from '../../domain/errors/invalid-email.error';
import { InvalidPasswordError } from '../../domain/errors/invalid-password.error';
import { Role } from '../../domain/role';
import { FakePasswordHasher } from '../../testing/fake-password-hasher';
import { InMemoryUserRepository } from '../../testing/in-memory-user.repository';
import { RegisterUserUseCase } from './register-user.use-case';

describe('RegisterUserUseCase', () => {
  let users: InMemoryUserRepository;
  let registerUser: RegisterUserUseCase;

  const command = {
    name: 'Juan Pérez',
    email: 'juan@example.com',
    password: 'contraseña123',
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    registerUser = new RegisterUserUseCase(users, new FakePasswordHasher());
  });

  it('persists a new user with the user role', async () => {
    const user = await registerUser.execute(command);

    expect(users.users.get(user.id)).toBe(user);
    expect(user.role).toBe(Role.USER);
    expect(user.name).toBe('Juan Pérez');
    expect(user.email.value).toBe('juan@example.com');
  });

  it('stores a hash instead of the plain password', async () => {
    const user = await registerUser.execute(command);

    expect(user.passwordHash).toBe('hashed:contraseña123');
    expect(user.passwordHash).not.toBe(command.password);
  });

  it('rejects an email that is already registered, ignoring case', async () => {
    await registerUser.execute(command);

    await expect(
      registerUser.execute({ ...command, email: 'JUAN@example.com' }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
    expect(users.users.size).toBe(1);
  });

  it('enforces the password policy even without the HTTP validation layer', async () => {
    await expect(
      registerUser.execute({ ...command, password: 'corta' }),
    ).rejects.toThrow(InvalidPasswordError);
    expect(users.users.size).toBe(0);
  });

  it('rejects an invalid email without persisting anything', async () => {
    await expect(
      registerUser.execute({ ...command, email: 'not-an-email' }),
    ).rejects.toThrow(InvalidEmailError);
    expect(users.users.size).toBe(0);
  });
});
