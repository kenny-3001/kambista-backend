import { JwtService } from '@nestjs/jwt';
import { Role } from '../../domain/role';
import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  const secret = 'a-test-secret-that-is-at-least-32-characters';
  const jwtService = new JwtService({
    secret,
    signOptions: { expiresIn: '1h' },
  });
  const tokenService = new JwtTokenService(jwtService);

  it('signs a verifiable token carrying the payload and a one hour expiry', async () => {
    const token = await tokenService.signAccessToken({
      sub: 'user-1',
      email: 'juan@example.com',
      role: Role.USER,
    });

    const decoded = await jwtService.verifyAsync<{
      sub: string;
      email: string;
      role: string;
      iat: number;
      exp: number;
    }>(token);

    expect(decoded).toMatchObject({
      sub: 'user-1',
      email: 'juan@example.com',
      role: 'user',
    });
    expect(decoded.exp - decoded.iat).toBe(3600);
  });

  it('produces a token that fails verification with another secret', async () => {
    const token = await tokenService.signAccessToken({
      sub: 'user-1',
      email: 'juan@example.com',
      role: Role.USER,
    });

    await expect(
      new JwtService({
        secret: 'another-secret-that-is-at-least-32-characters',
      }).verifyAsync(token),
    ).rejects.toThrow();
  });
});
