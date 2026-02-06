import * as Joi from 'joi';

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_PREFIX: string;
  DATABASE_URL: string;
  REDIS_URL?: string;
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRATION: string;
  CORS_ORIGIN: string;
  LOG_LEVEL: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_SECURE?: boolean;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM?: string;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const schema = Joi.object<EnvironmentVariables>({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    PORT: Joi.number().default(3000),
    API_PREFIX: Joi.string().default('api'),

    // Required
    DATABASE_URL: Joi.string().required().messages({
      'any.required': 'DATABASE_URL is required',
    }),
    JWT_SECRET: Joi.string().min(32).required().messages({
      'string.min': 'JWT_SECRET must be at least 32 characters',
      'any.required': 'JWT_SECRET is required',
    }),
    JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
      'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters',
      'any.required': 'JWT_REFRESH_SECRET is required',
    }),

    // Optional with defaults
    JWT_EXPIRATION: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
    CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
    LOG_LEVEL: Joi.string().default('info'),
    REDIS_URL: Joi.string().optional(),

    // Stripe (optional for dev)
    STRIPE_SECRET_KEY: Joi.string().optional(),
    STRIPE_WEBHOOK_SECRET: Joi.string().optional(),

    // Email (optional)
    SMTP_HOST: Joi.string().optional(),
    SMTP_PORT: Joi.number().optional(),
    SMTP_SECURE: Joi.boolean().optional(),
    SMTP_USER: Joi.string().optional(),
    SMTP_PASSWORD: Joi.string().optional(),
    SMTP_FROM: Joi.string().optional(),
  });

  const { error, value } = schema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    const messages = error.details.map((d) => d.message).join(', ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return value;
}
