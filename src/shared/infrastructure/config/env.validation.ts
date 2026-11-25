import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  MONGO_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  JWT_SECRET: Joi.string().min(32).required(),
  // Positive duration such as 900s, 15m, 1h or 1d.
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^[1-9]\d*[smhd]$/)
    .default('1h'),
  EXCHANGE_RATE_API_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('https://api.apis.net.pe/v1/tipo-cambio-sunat'),
  EXCHANGE_RATE_REFRESH_INTERVAL_MS: Joi.number()
    .integer()
    .min(1000)
    .default(30_000),
  EXCHANGE_RATE_TIMEOUT_MS: Joi.number().integer().min(100).default(5_000),
});
