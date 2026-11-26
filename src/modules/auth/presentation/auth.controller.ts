import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrors } from '../../../shared/presentation/swagger/api-errors.decorator';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  LoginResponse,
  RegisterResponse,
  toUserResponse,
} from './user.response';

@ApiTags('Autenticación')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar un usuario',
    description:
      'El rol siempre es `user`; un campo `rol` enviado en el body se ignora. Los administradores se crean con `npm run seed:admin`.',
  })
  @ApiCreatedResponse({ type: RegisterResponse })
  @ApiErrors(
    {
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'La contraseña debe tener al menos 8 caracteres',
      details: [
        {
          field: 'password',
          message: 'La contraseña debe tener al menos 8 caracteres',
        },
      ],
    },
    {
      statusCode: 409,
      error: 'EMAIL_ALREADY_REGISTERED',
      message: 'Ya existe un usuario registrado con este email',
    },
  )
  async register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    const user = await this.registerUser.execute({
      name: dto.nombre,
      email: dto.email,
      password: dto.password,
    });
    return { usuario: toUserResponse(user) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Devuelve el `access_token` (JWT) que se envía como `Authorization: Bearer <token>` en las demás rutas.',
  })
  @ApiOkResponse({ type: LoginResponse })
  @ApiErrors(
    {
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'El email es obligatorio',
      details: [{ field: 'email', message: 'El email es obligatorio' }],
    },
    {
      statusCode: 401,
      error: 'INVALID_CREDENTIALS',
      message: 'Email o contraseña incorrectos',
    },
  )
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    const { accessToken, user } = await this.loginUser.execute({
      email: dto.email,
      password: dto.password,
    });
    return { access_token: accessToken, usuario: toUserResponse(user) };
  }
}
