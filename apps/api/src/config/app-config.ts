import { registerAs } from '@nestjs/config';

/**
 * Typed configuration, the equivalent of a Spring @ConfigurationProperties class.
 * Inject with `@Inject(appConfig.KEY) config: AppConfig`.
 */
export const appConfig = registerAs('app', () => {
  const env = process.env;
  const required = (name: string): string => {
    const value = env[name];
    if (!value) throw new Error(`Missing required env var ${name}`);
    return value;
  };

  return {
    port: Number(env.PORT ?? 3000),
    webUrl: env.WEB_URL ?? 'http://localhost:5173',
    mongoUri: required('MONGO_URI'),
    jwt: {
      secret: required('JWT_SECRET'),
      expiresIn: env.JWT_EXPIRES_IN ?? '7d',
    },
    adminEmails: (env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    devLoginEnabled: env.DEV_LOGIN_ENABLED === 'true',
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      callbackUrl:
        env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3000/api/auth/google/callback',
    },
    s3: {
      endpoint: env.S3_ENDPOINT || undefined,
      region: env.S3_REGION ?? 'us-east-1',
      bucket: required('S3_BUCKET'),
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    },
  };
});

export type AppConfig = ReturnType<typeof appConfig>;
