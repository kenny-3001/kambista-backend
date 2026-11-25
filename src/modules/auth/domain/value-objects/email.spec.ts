import { InvalidEmailError } from '../errors/invalid-email.error';
import { Email } from './email';

describe('Email', () => {
  it('normalizes the address to trimmed lowercase', () => {
    expect(Email.create('  Juan@Example.COM ').value).toBe('juan@example.com');
  });

  it.each(['', 'juan', 'juan@', '@example.com', 'juan@example', 'a b@c.com'])(
    'rejects the invalid address "%s"',
    (raw) => {
      expect(() => Email.create(raw)).toThrow(InvalidEmailError);
    },
  );

  it('considers two addresses equal regardless of casing', () => {
    expect(
      Email.create('juan@example.com').equals(Email.create('JUAN@example.com')),
    ).toBe(true);
  });
});
