import { InvalidUserNameError } from './errors/invalid-user-name.error';
import { Role } from './role';
import { User } from './user';
import { Email } from './value-objects/email';

describe('User', () => {
  const email = Email.create('juan@example.com');

  describe('register', () => {
    it('always assigns the user role', () => {
      const user = User.register({
        name: 'Juan Pérez',
        email,
        passwordHash: 'hash',
      });

      expect(user.role).toBe(Role.USER);
      expect(user.isAdmin()).toBe(false);
    });

    it('generates a unique id and a creation date', () => {
      const first = User.register({ name: 'Juan', email, passwordHash: 'h' });
      const second = User.register({ name: 'Juan', email, passwordHash: 'h' });

      expect(first.id).toEqual(expect.any(String));
      expect(first.id).not.toBe(second.id);
      expect(first.createdAt).toBeInstanceOf(Date);
    });

    it('trims the name', () => {
      const user = User.register({
        name: '  Juan Pérez  ',
        email,
        passwordHash: 'h',
      });

      expect(user.name).toBe('Juan Pérez');
    });

    it('rejects a blank name', () => {
      expect(() =>
        User.register({ name: '   ', email, passwordHash: 'h' }),
      ).toThrow(InvalidUserNameError);
    });
  });

  it('can be promoted to admin', () => {
    const user = User.register({ name: 'Juan', email, passwordHash: 'h' });

    user.promoteToAdmin();

    expect(user.role).toBe(Role.ADMIN);
    expect(user.isAdmin()).toBe(true);
  });

  it('recognizes an admin restored from persistence', () => {
    const admin = User.restore({
      id: '1',
      name: 'Admin',
      email,
      passwordHash: 'h',
      role: Role.ADMIN,
      createdAt: new Date(),
    });

    expect(admin.isAdmin()).toBe(true);
  });
});
