# Minesweeper Game Server

A backend server for a Minesweeper game built with Node.js, Express, TypeScript, Prisma, and Firebase Authentication.

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/eli-shi/my-minesweeper-game-server.git
   cd my-minesweeper-game-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

   # Firebase Admin SDK
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

   # Server
   PORT=3000
   NODE_ENV=development

   # CORS (comma-separated origins, or * for all)
   CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

   # Sentry (optional)
   SENTRY_DSN="your-sentry-dsn"
   ```

4. **Set up the database**

   Run migrations:
   ```bash
   npm run prisma:migrate
   ```

   Seed the database with difficulty levels:
   ```bash
   npm run prisma:seed
   ```

   This creates three difficulty records (Easy, Medium, Hard) required for the game to function.

5. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

## Running the Server

### Development Mode
```bash
npm run dev
```
Server runs on `http://localhost:3000` with hot reload.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio (database GUI) |
| `npm run prisma:seed` | Seed database with initial data |

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with Firebase token
- `POST /auth/logout` - Logout (revoke refresh tokens)
- `POST /auth/refresh-token` - Verify token
- `POST /auth/password-reset-request` - Request password reset
- `POST /auth/password-reset` - Reset password

### Game
- `GET /games/difficulties` - Get available difficulty levels
- `POST /games` - Create new game
- `POST /games/reveal` - Reveal a cell
- `POST /games/flag` - Toggle flag on a cell
- `GET /games/history` - Get user's game history (authenticated)

### Leaderboard
- `GET /games/leaderboard` - Get leaderboard data

## Architecture

### Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express 5
- **Database**: PostgreSQL with Prisma ORM
- **Database Hosting**: Neon
- **Authentication**: Firebase Admin SDK
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting
- **Error Tracking**: Sentry
- **Caching**: In-memory cache for active games
- **Deployment**: planned to be with Render


## General Architecture
```mermaid
graph TB
    subgraph "External Systems"
        FE[Frontend/Client]
        FA[Firebase Auth]
    end

    subgraph "Express Server"
        subgraph "Middleware Layer"
            CORS[CORS Middleware]
            HELMET[Helmet Security]
            RATE[Rate Limiter]
            VALID[Validation Middleware]
            AUTH_MW[Auth Middleware<br/>verifyToken/optionalAuth]
        end

        subgraph "Routes"
            AUTH_R[Auth Routes<br/>/auth/*]
            GAME_R[Game Routes<br/>/games/*]
            USER_R[User Routes<br/>/users/*]
        end

        subgraph "Controllers"
            AUTH_C[AuthController]
            GAME_C[GameController]
            USER_C[UserController]
        end

        subgraph "Services"
            AUTH_S[AuthService]
            GAME_S[GameService]
        end
    end

    subgraph "Data Storage"
        CACHE[In-Memory Cache<br/>Active Games]
        DB[(PostgreSQL<br/>Users, Games, Stats)]
    end

    FE -->|HTTPS Requests| CORS
    CORS --> HELMET
    HELMET --> RATE
    RATE --> VALID
    VALID --> AUTH_MW
    AUTH_MW --> AUTH_R
    AUTH_MW --> GAME_R
    AUTH_MW --> USER_R

    AUTH_R --> AUTH_C
    GAME_R --> GAME_C
    USER_R --> USER_C

    AUTH_C --> AUTH_S
    GAME_C --> GAME_S
    USER_C --> AUTH_S

    AUTH_S <-->|Verify ID Tokens| FA
    AUTH_S <-->|User CRUD| DB
    GAME_S <-->|Active Game State| CACHE
    GAME_S <-->|Completed Games & Stats| DB

    style FE fill:#e1f5ff
    style FA fill:#fff4e1
    style CACHE fill:#ffe1f5
    style DB fill:#e1ffe1
```

## Database Schema

### Core Models
- **User** - Player accounts with Firebase UID as primary key
- **Game** - Completed game records
- **Difficulty** - Game difficulty configurations (Easy, Medium, Hard)
- **EasyMode/MediumMode/HardMode** - Per-user statistics by difficulty
- **Friend** - User relationships (for future social features)

See `prisma/schema.prisma` for full schema details.

## Configuration

### Rate Limits
- **General**: 100 requests/minute per IP
- **Authentication**: 100 requests/minute per IP
- **Game Actions**: 200 requests/15 minutes per IP
- **Leaderboard**: 30 requests/15 minutes per IP

### Game Rules
- **Max Game Duration**: 20 minutes
- **Cache TTL**: 2 hours for active games
- **Cache Cleanup**: Runs every 5 minutes

## Development Tools

### Prisma Studio
Visual database browser:
```bash
npm run prisma:studio
```
Opens at `http://localhost:5555`

### Health Check
```bash
curl http://localhost:3000/health
```

## License

ISC

## Repository

https://github.com/eli-shi/my-minesweeper-game-server

## Notice
This document was generated by AI and altered by me
