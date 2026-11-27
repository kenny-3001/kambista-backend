import type { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import { Email } from '../../domain/value-objects/email';
import { MongoUserRepository } from './mongo-user.repository';
import { UserDocument, UserSchema } from './user.schema';
import {
  MONGO_STARTUP_TIMEOUT_MS,
  startTestMongo,
} from '../../../../shared/testing/test-mongo';

describe('MongoUserRepository (integration)', () => {
  let mongo: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let repository: MongoUserRepository;

  beforeAll(async () => {
    mongo = await startTestMongo();
    await mongoose.connect(mongo.getUri());
    userModel = mongoose.model(UserDocument.name, UserSchema);
    await userModel.init(); // builds the unique email index
    repository = new MongoUserRepository(userModel);
  }, MONGO_STARTUP_TIMEOUT_MS);

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  const newUser = (email = 'juan@example.com') =>
    User.register({
      name: 'Juan Pérez',
      email: Email.create(email),
      passwordHash: 'hash',
    });

  it('saves a user and finds it by email', async () => {
    const user = newUser();
    await repository.create(user);

    const found = await repository.findByEmail(
      Email.create('juan@example.com'),
    );

    expect(found).not.toBeNull();
    expect(found!.id).toBe(user.id);
    expect(found!.name).toBe('Juan Pérez');
    expect(found!.role).toBe(Role.USER);
    expect(found!.passwordHash).toBe('hash');
    expect(found!.createdAt).toEqual(user.createdAt);
  });

  it('returns null when the email is not registered', async () => {
    await expect(
      repository.findByEmail(Email.create('nadie@example.com')),
    ).resolves.toBeNull();
  });

  it('finds a user by id', async () => {
    const user = newUser();
    await repository.create(user);

    await expect(repository.findById(user.id)).resolves.toMatchObject({
      id: user.id,
      name: 'Juan Pérez',
    });
    await expect(repository.findById('no-existe')).resolves.toBeNull();
  });

  it('persists changes made to an existing user', async () => {
    const user = newUser();
    await repository.create(user);

    user.promoteToAdmin();
    user.changePassword('new-hash');
    await repository.update(user);

    const found = await repository.findByEmail(user.email);
    expect(found!.role).toBe(Role.ADMIN);
    expect(found!.passwordHash).toBe('new-hash');
    expect(await userModel.countDocuments()).toBe(1);
  });

  it('fails loudly when updating a user that does not exist', async () => {
    await expect(repository.update(newUser())).rejects.toThrow(
      UserNotFoundError,
    );
  });

  it('translates a duplicate email into a domain error', async () => {
    await repository.create(newUser());

    await expect(repository.create(newUser())).rejects.toThrow(
      EmailAlreadyRegisteredError,
    );
  });

  describe('search', () => {
    const add = (name: string, email: string) =>
      repository.create(
        User.register({ name, email: Email.create(email), passwordHash: 'h' }),
      );

    const emails = async (params: { text?: string; limit: number }) =>
      (await repository.search(params)).map((user) => user.email.value);

    it('matches part of the name or the email, ignoring case', async () => {
      await add('Juan Pérez', 'juan@example.com');
      await add('Rosa Díaz', 'rosa@corp.pe');
      await add('Beto Ríos', 'beto@example.com');

      await expect(emails({ text: 'JUAN', limit: 10 })).resolves.toEqual([
        'juan@example.com',
      ]);
      await expect(emails({ text: 'CORP', limit: 10 })).resolves.toEqual([
        'rosa@corp.pe',
      ]);
    });

    it('takes the search text literally, not as a pattern', async () => {
      await add('Ana', 'a.b@example.com');
      await add('Beto', 'axb@example.com');

      await expect(emails({ text: 'a.b', limit: 10 })).resolves.toEqual([
        'a.b@example.com',
      ]);
      await expect(emails({ text: '(', limit: 10 })).resolves.toEqual([]);
    });

    it('orders by name ignoring case and accents, then by email', async () => {
      await add('beto', 'beto@example.com');
      await add('Ángel', 'angel@example.com');
      await add('Ana', 'z@example.com');
      await add('ana', 'a@example.com');

      await expect(emails({ limit: 10 })).resolves.toEqual([
        'a@example.com',
        'z@example.com',
        'angel@example.com',
        'beto@example.com',
      ]);
    });

    it('returns at most the requested number of users', async () => {
      for (let i = 0; i < 5; i++) {
        await add(`User ${i}`, `u${i}@example.com`);
      }

      await expect(emails({ limit: 3 })).resolves.toHaveLength(3);
    });
  });
});
