import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** Served outside the /v1 prefix: http://localhost:3000/docs */
export const SWAGGER_PATH = 'docs';

const DESCRIPTION = `
API de cambio de divisas **USD ⇄ PEN**.

- **Autenticación:** registra un usuario, inicia sesión y pulsa *Authorize* con el \`access_token\` recibido.
- **Tipo de cambio:** se consulta a SUNAT (apis.net.pe) al iniciar y cada 30 segundos, y se guarda en MongoDB.
- **Cálculo:** USD → PEN usa \`monto × venta\`; PEN → USD usa \`monto ÷ compra\`. El resultado se redondea a 2 decimales.
- **Errores:** todos responden \`{ statusCode, error, message }\`; los de validación agregan \`details\` con el problema de cada campo.
`.trim();

export function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Kambista API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'access_token obtenido en POST /v1/auth/login',
    })
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(SWAGGER_PATH, app, () => buildSwaggerDocument(app), {
    customSiteTitle: 'Kambista API',
    // Keeps the token after a page reload while trying the endpoints.
    swaggerOptions: { persistAuthorization: true },
  });
}
