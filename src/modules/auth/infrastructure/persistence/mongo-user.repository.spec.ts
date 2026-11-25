import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error';
import { Role } from '../../domain/role';
import { User } from '../../domain/user';
import { Email } from '../../domain/value-objects/email';
import { MongoUserRepository } from './mongo-user.repository';
import { UserDocument, UserSchema } from './user.schema';

// The first run downloads the MongoDB binary used by mongodb-memory-server.
const MONGO_STARTUP_TIMEOUT_MS = 120_000;

describe('MongoUserRepository (integration)', () => {
  let mongo: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let repository: MongoUserRepository;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
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

  it('translates a duplicate email into a domain error', async () => {
    await repository.create(newUser());

    await expect(repository.create(newUser())).rejects.toThrow(
      EmailAlreadyRegisteredError,
    );
  });
});
