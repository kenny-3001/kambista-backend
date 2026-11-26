import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrors } from '../../../shared/presentation/swagger/api-errors.decorator';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RefreshSessionUseCase } from '../application/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import {
  LoginResponse,
  RegisterResponse,
  toLoginResponse,
  toUserResponse,
} from './user.response';

@ApiTags('Autenticación')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logoutUser: LogoutUseCase,
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
      'Devuelve el `access_token` (JWT, 15 minutos por defecto) que se envía como `Authorization: Bearer <token>` en las demás rutas, y el `refresh_token` (7 días por defecto) para renovarlo sin volver a iniciar sesión. Protección contra fuerza bruta: por defecto, tras 5 intentos fallidos con el mismo email desde la misma IP en 15 minutos, el login responde 429 hasta que termina ese periodo; la cabecera `Retry-After` indica los segundos de espera (configurable con `LOGIN_MAX_FAILED_ATTEMPTS` y `LOGIN_ATTEMPTS_WINDOW_MINUTES`).',
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
    {
      statusCode: 429,
      error: 'TOO_MANY_LOGIN_ATTEMPTS',
      message:
        'Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.',
    },
  )
  async login(
    @Body() dto: LoginDto,
    @Ip() clientIp: string,
  ): Promise<LoginResponse> {
    const { accessToken, refreshToken, user } = await this.loginUser.execute({
      email: dto.email,
      password: dto.password,
      clientIp,
    });
    return toLoginResponse(accessToken, refreshToken, user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar la sesión',
    description:
      'Entrega un nuevo `access_token` y un nuevo `refresh_token`; el enviado deja de servir. Si se presenta un `refresh_token` que ya fue usado, se asume que fue copiado y se cierra esa sesión por completo. El rol se lee de nuevo, así que un cambio de rol se aplica al renovar.',
  })
  @ApiOkResponse({ type: LoginResponse })
  @ApiErrors(
    {
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'El refresh_token es obligatorio',
      details: [
        { field: 'refresh_token', message: 'El refresh_token es obligatorio' },
      ],
    },
    {
      statusCode: 401,
      error: 'INVALID_REFRESH_TOKEN',
      message: 'La sesión expiró o no es válida. Inicia sesión nuevamente.',
    },
  )
  async refresh(@Body() dto: RefreshTokenDto): Promise<LoginResponse> {
    const { accessToken, refreshToken, user } =
      await this.refreshSession.execute(dto.refresh_token);
    return toLoginResponse(accessToken, refreshToken, user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Invalida el `refresh_token` y toda su sesión. Responde 204 aunque el token no exista. El `access_token` ya emitido sigue siendo válido hasta que expire, por eso dura poco.',
  })
  @ApiNoContentResponse({ description: 'Sesión cerrada' })
  @ApiErrors({
    statusCode: 400,
    error: 'VALIDATION_ERROR',
    message: 'El refresh_token es obligatorio',
    details: [
      { field: 'refresh_token', message: 'El refresh_token es obligatorio' },
    ],
  })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.logoutUser.execute(dto.refresh_token);
  }
}
