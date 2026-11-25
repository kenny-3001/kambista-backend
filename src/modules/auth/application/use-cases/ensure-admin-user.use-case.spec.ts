import { InvalidEmailError } from '../../domain/errors/invalid-email.error';
import { InvalidPasswordError } from '../../domain/errors/invalid-password.error';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import { Email } from '../../domain/value-objects/email';
import { FakePasswordHasher } from '../../testing/fake-password-hasher';
import { InMemoryUserRepository } from '../../testing/in-memory-user.repository';
import { EnsureAdminUserUseCase } from './ensure-admin-user.use-case';

describe('EnsureAdminUserUseCase', () => {
  let users: InMemoryUserRepository;
  let ensureAdmin: EnsureAdminUserUseCase;

  const command = {
    name: 'Administrador',
    email: 'admin@example.com',
    password: 'Admin12345',
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    ensureAdmin = new EnsureAdminUserUseCase(users, new FakePasswordHasher());
  });

  it('creates an admin when the email is not registered', async () => {
    const { user, outcome } = await ensureAdmin.execute(command);

    expect(outcome).toBe('created');
    expect(user.role).toBe(Role.ADMIN);
    expect(user.passwordHash).toBe('hashed:Admin12345');
    expect(users.users.get(user.id)).toBe(user);
  });

  it('promotes an existing user without touching the password', async () => {
    const existing = User.register({
      name: 'Juan',
      email: Email.create('admin@example.com'),
      passwordHash: 'hashed:original-password',
    });
    await users.create(existing);

    const { user, outcome } = await ensureAdmin.execute({
      ...command,
      email: 'ADMIN@example.com',
    });

    expect(outcome).toBe('promoted');
    expect(user.id).toBe(existing.id);
    expect(user.role).toBe(Role.ADMIN);
    expect(user.passwordHash).toBe('hashed:original-password');
    expect(users.users.size).toBe(1);
  });

  it('is idempotent when the user is already an admin', async () => {
    await ensureAdmin.execute(command);
    const { outcome } = await ensureAdmin.execute(command);

    expect(outcome).toBe('unchanged');
    expect(users.users.size).toBe(1);
  });

  it('rejects a weak password when it has to create the admin', async () => {
    await expect(
      ensureAdmin.execute({ ...command, password: '123' }),
    ).rejects.toThrow(InvalidPasswordError);
    expect(users.users.size).toBe(0);
  });

  it('rejects an invalid email', async () => {
    await expect(
      ensureAdmin.execute({ ...command, email: 'admin@' }),
    ).rejects.toThrow(InvalidEmailError);
  });
});
