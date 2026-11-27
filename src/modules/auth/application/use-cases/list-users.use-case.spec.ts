import { User } from '../../domain/user';
import { Email } from '../../domain/value-objects/email';
import { InMemoryUserRepository } from '../../testing/in-memory-user.repository';
import { ListUsersUseCase } from './list-users.use-case';

describe('ListUsersUseCase', () => {
  let users: InMemoryUserRepository;
  let list: ListUsersUseCase;

  const add = (name: string, email: string) =>
    users.create(
      User.register({ name, email: Email.create(email), passwordHash: 'h' }),
    );

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    list = new ListUsersUseCase(users);
    await add('Beto Ríos', 'beto@example.com');
    await add('ana Torres', 'ana@example.com');
    await add('Juan Pérez', 'juan@example.com');
    await add('Juana Díaz', 'diaz@corp.pe');
  });

  const names = async (params?: { search?: string; limit?: number }) =>
    (await list.execute(params)).map((u) => u.name);

  it('lists everyone ordered by name, ignoring case', async () => {
    expect(await names()).toEqual([
      'ana Torres',
      'Beto Ríos',
      'Juan Pérez',
      'Juana Díaz',
    ]);
  });

  it('filters by part of the name or the email, ignoring case', async () => {
    expect(await names({ search: 'JUAN' })).toEqual([
      'Juan Pérez',
      'Juana Díaz',
    ]);
    expect(await names({ search: 'corp.pe' })).toEqual(['Juana Díaz']);
  });

  it('treats a blank search as no filter', async () => {
    expect(await names({ search: '   ' })).toHaveLength(4);
  });

  it('answers an empty list when nobody matches', async () => {
    expect(await names({ search: 'zzz' })).toEqual([]);
  });

  it('breaks name ties by email', async () => {
    await add('Ana Torres', 'a2@example.com');

    const result = await list.execute({ search: 'torres' });

    expect(result.map((u) => u.email.value)).toEqual([
      'a2@example.com',
      'ana@example.com',
    ]);
  });

  it('defaults to 20 results and never exceeds 50', async () => {
    for (let i = 0; i < 60; i++) {
      await add(`User ${i}`, `u${i}@example.com`);
    }

    expect(await names()).toHaveLength(20);
    expect(await names({ limit: 500 })).toHaveLength(50);
    expect(await names({ limit: 3 })).toHaveLength(3);
  });
});
