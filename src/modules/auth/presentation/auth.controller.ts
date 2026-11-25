import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { toUserResponse, UserResponse } from './user.response';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<{ usuario: UserResponse }> {
    const user = await this.registerUser.execute({
      name: dto.nombre,
      email: dto.email,
      password: dto.password,
    });
    return { usuario: toUserResponse(user) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ access_token: string; usuario: UserResponse }> {
    const { accessToken, user } = await this.loginUser.execute({
      email: dto.email,
      password: dto.password,
    });
    return { access_token: accessToken, usuario: toUserResponse(user) };
  }
}
