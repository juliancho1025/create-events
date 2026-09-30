# Events

Admins create events (name, address, description, image, date, capacity); users sign up,
get waitlisted when an event is full, and are promoted automatically when a seat frees up.
Only admins and people signed up (confirmed or waitlisted) can see who's attending.

| Layer    | Tech                                                                       |
| -------- | -------------------------------------------------------------------------- |
| API      | NestJS 12 (ESM) · TypeScript 6 · Mongoose 9 · Passport (Google OAuth + JWT) |
| Web      | React 19 · Vite 8 · Tamagui 2 · TanStack Query · React Router 8            |
| Storage  | MongoDB 8 · S3-compatible object store (SeaweedFS locally, AWS S3 in prod) |
| Tests    | Vitest + Supertest + mongodb-memory-server (full-app e2e)                  |

## Quick start

```sh
corepack enable            # one-time: puts `pnpm` on your PATH (pinned in package.json)
pnpm install
cp .env.example apps/api/.env
pnpm infra:up              # MongoDB :27017 + S3 :8333 (docker compose)
pnpm dev                   # API :3000 + web :5173
```

Open http://localhost:5173 and use the **dev login**. `admin@example.com` is the admin
(see `ADMIN_EMAILS`); any other email is a regular user.

- OpenAPI / Swagger UI: http://localhost:3000/api/docs
- Tests: `pnpm test` (boots the whole app against an in-memory MongoDB, no Docker needed)
- Typecheck everything: `pnpm typecheck`

### Enabling Google login

1. Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID* (Web application).
2. Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
3. Put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `apps/api/.env`, restart the API.
4. Set `DEV_LOGIN_ENABLED=false` anywhere that isn't your laptop.

## Layout

```
apps/
  api/                NestJS REST API
  web/                Vite SPA (routing, pages, web-only adapters)
packages/
  shared/             types, fetch API client, auth context, React Query hooks  ← no DOM, RN-safe
  ui/                 Tamagui components + theme config                         ← RN-safe
```

Like a multi-module Maven build: `apps/*` are deployables, `packages/*` are libraries
consumed from source (`workspace:*`), so there's no separate build/publish step.

## For a Java developer: what maps to what

| Spring                                    | Here                                                           |
| ----------------------------------------- | -------------------------------------------------------------- |
| `@RestController`, `@Service`, `@Configuration` | `@Controller`, `@Injectable`, `@Module` (constructor DI)  |
| `@ConfigurationProperties`                | `src/config/app-config.ts` (`registerAs`, injected by key)     |
| Spring Data `@Document` + repository      | `@Schema` class + `Model<T>` via `@InjectModel`                |
| Bean Validation (`@NotBlank`, `@Min`)     | class-validator on DTOs + global `ValidationPipe`              |
| Spring Security filter chain              | global `JwtAuthGuard` (deny by default) + `RolesGuard`         |
| `permitAll()` / `@PreAuthorize`           | `@Public()` / `@Roles(Role.ADMIN)`                             |
| `@AuthenticationPrincipal`                | `@CurrentUser()`                                               |
| springdoc-openapi                         | `@nestjs/swagger` (`@ApiProperty`, served at `/api/docs`)      |
| `@SpringBootTest` + Testcontainers        | `test/events.e2e.spec.ts` + mongodb-memory-server              |

## Design notes

**Seat accounting without transactions.** Each event stores `confirmedCount`. Taking a seat is one
atomic conditional update (`$inc` only if `confirmedCount < capacity`), so concurrent sign-ups can't
overbook, which the e2e suite checks with parallel requests. A unique index on `(event, user)`
blocks double sign-ups. On cancel, the seat goes straight to the oldest waitlisted user. This avoids
multi-document transactions, which need a replica set (a standalone `mongo` container doesn't have one).

**Images.** Uploaded as `multipart/form-data`, max 5 MB, type checked by magic bytes (not the
client's `Content-Type`), stored in S3 under a random key, and streamed back by
`GET /api/events/:id/image`. That endpoint is public because `<img>` can't send a bearer token.
The key is part of the URL (`?v=`), so responses are cached as immutable.

**Auth.** Google OAuth → API issues a JWT → redirects to `/auth/callback#token=…` (the fragment
never reaches servers or logs). The web client stores it and sends `Authorization: Bearer`.
Roles are recomputed from `ADMIN_EMAILS` on each login, so a role change applies at next login.

**Why SeaweedFS instead of MinIO.** MinIO no longer publishes community Docker images. The API only
uses the AWS S3 SDK, so any S3-compatible store works. For AWS, drop `S3_ENDPOINT` and set real
credentials/bucket.

**Why TypeScript 6 and not 7.** TS 7 (the native Go compiler) doesn't yet have the programmatic API
that the Nest CLI and other tools depend on. Nest 12 still ships with TS 6.

## Porting to React Native

`packages/shared` and `packages/ui` contain no DOM code. An Expo app (`apps/mobile`) would:

- Wrap the app in the same `TamaguiProvider config={config}` and `ApiProvider`, with
  `baseUrl="https://your-api"` and a `TokenStorage` backed by `expo-secure-store`.
  `@tamagui/config/v5-css` automatically resolves to native animations on RN.
- Reuse `EventCard`, `EventDetails`, `AttendeeList`, `EventForm` and every hook as-is.
- Provide its own `DateTimeInput` / `ImageInput` for `EventForm` (e.g. `@react-native-community/datetimepicker`,
  `expo-image-picker`), the same way `apps/web/src/components/WebInputs.tsx` does for the browser.
  The image type already accepts RN's `{ uri, name, type }`.
- Use `expo-router` screens in place of the web `pages/`, and `expo-auth-session` for Google
  login (the API's OAuth callback would need a redirect target for the app scheme).
