# STRIDE Threat Analysis Table

| Category | Threat | Current Mitigations | Vulnerabilities |
|----------|--------|-------------------|-----------------|
| **Spoofing** | Token Forgery/Replay Attacks | - Firebase Admin SDK verifies ID tokens cryptographically<br>- Token format validation (JWT structure check)<br>- Token length validation (min 100 chars)<br>- Revoked token checking in both `verifyToken` and `optionalAuth` (`verifyIdToken(token, true)`)<br>- Token expiration automatically validated by Firebase (checks `exp` claim)<br>- Expired token error handling (`auth/id-token-expired`) | - No token refresh mechanism validation |
| **Spoofing** | User ID Spoofing in Game Operations | - `getActiveGame()` checks userId matches game owner for authenticated users<br>- Session tokens required for guest games (prevents cross-guest access)<br>- Throws error if unauthorized | - Race condition: game could be deleted between check and access<br>- No audit logging for unauthorized access attempts |
| **Spoofing** | Email/Username Spoofing | - Email uniqueness constraint in database<br>- Username uniqueness constraint in database<br>- Email format validation (Zod schema) | - No email verification required<br>- Username auto-generated from email (could conflict)<br>- No protection against typosquatting |
| **Tampering** | Game State Manipulation | - Game state stored server-side (not client-side)<br>- Board generation happens server-side<br>- Cell reveal/flag operations validated server-side<br>- Game state updates go through service layer | - Game state in memory (could be manipulated if server compromised)<br>- No validation that revealed cells match board state<br>- No replay protection for game actions |
| **Tampering** | Request Body/Query Parameter Tampering | - Zod schema validation on all endpoints<br>- Type coercion and range validation (non-negative integers)<br>- UUID validation for `gameId`<br>- Enum validation for difficulty<br>- Session token validation for guest games | - No validation that row/col are within board bounds<br>- No validation that gameId exists before processing<br>- No rate limiting per gameId (could spam actions) |
| **Tampering** | Database Tampering | - Prisma ORM provides type safety<br>- Database transactions for atomic operations<br>- Foreign key constraints<br>- User ID validation in queries | - No database-level audit logging<br>- No checksums/hashes for critical data<br>- Direct database access could bypass application logic<br>- No row-level security policies |
| **Tampering** | Leaderboard Data Tampering | - Rate limiting on leaderboard endpoints<br>- Database queries use Prisma (SQL injection protection) | - No input validation on leaderboard query parameters<br>- No caching (could be expensive to query)<br>- No pagination limits enforced |
| **Repudiation** | Game Action Repudiation | - Game actions tied to authenticated user ID<br>- Game state stored server-side<br>- Completed games saved to database with timestamps<br>- Guest games tracked with session tokens | - No audit logging for game actions<br>- No request/response logging<br>- No action timestamps in game cache |
| **Repudiation** | Authentication Event Repudiation | - Firebase Authentication logs events<br>- Database timestamps (`created_at`, `updated_at`, `last_game_played`) | - No application-level audit logging<br>- No IP address logging for auth events<br>- No device/session tracking<br>- No failed login attempt logging |
| **Information Disclosure** | Database Information Disclosure | - Prisma ORM prevents SQL injection<br>- Parameterized queries<br>- Database credentials in environment variables<br>- User ID validation in queries | - No query result filtering (returns all user fields)<br>- No database encryption at rest mentioned |
| **Information Disclosure** | Game State Information Disclosure | - Board only revealed on game over<br>- Only revealed cells sent to client<br>- Mine positions not exposed during gameplay<br>- Game state stored server-side<br>- Session tokens prevent unauthorized game access | - Game cache in memory (could be dumped)<br>- No encryption for game state in transit |
| **Denial of Service** | Rate Limiting Bypass | - Rate limiting on all endpoints<br>- Different limits for different endpoint types<br>- IP-based rate limiting | - IP-based limiting vulnerable to IP rotation<br>- No user-based rate limiting (only IP) |
| **Denial of Service** | Resource Exhaustion (Memory/CPU) | - Request body size limit (10MB)<br>- Game cache cleanup (expired games removed)<br>- Game timeout (5 minutes max duration)<br>- Game cache expiration (2 hours) | - No limit on concurrent games per user<br>- No limit on total games in cache<br>- Large board sizes could consume memory |
| **Denial of Service** | Database DoS | - Prisma connection pooling<br>- Query limits on game history<br>- Indexed database queries (foreign keys) | - No query timeout configuration<br>- No connection pool size limits mentioned<br>- No database query rate limiting<br>- No database query monitoring |
| **Denial of Service** | Authentication DoS | - Rate limiting on auth endpoints (100 requests/minute)<br>- Firebase handles authentication<br>- Password hashing | - Rate limit is per-IP, needs to also be per user<br>- No account lockout after failed attempts<br> |
| **Elevation of Privilege** | Authorization Bypass | - Token verification middleware<br>- User ID validation in game service for authenticated users<br>- Session token validation for guest games<br>- Optional auth for guest games | - No resource-level permissions |
| **Elevation of Privilege** | Privilege Escalation via Token Manipulation | - Firebase verifies token signatures<br>- Token claims cannot be modified (cryptographically signed)<br>- No custom claims in current implementation<br>- Both `verifyToken` and `optionalAuth` verify token claims | |
| **Elevation of Privilege** | Database Privilege Escalation | - Prisma uses connection string (credentials in env)<br>- Database user should have limited permissions<br>- Prisma prevents direct SQL execution | - No verification of database user permissions<br>- Database credentials in environment (could be exposed)<br>- No database user role validation<br>- Prisma migrations could be run with elevated privileges |

---
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
            AUTH_MW[Auth Middleware&lt;br/&gt;verifyToken/optionalAuth]
        end

        subgraph "Routes"
            AUTH_R[Auth Routes&lt;br/&gt;/auth/*]
            GAME_R[Game Routes&lt;br/&gt;/games/*]
            USER_R[User Routes&lt;br/&gt;/users/*]
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
        CACHE[In-Memory Cache&lt;br/&gt;Active Games]
        DB["(PostgreSQL&lt;br/&gt;Users, Games, Stats)"]
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
    GAME_S <-->|Completed Games &amp; Stats| DB

    %% STRIDE Threats
    S1[S: Token Theft]:::spoofing --> FE
    S2[S: Token Forgery]:::spoofing --> FA
    T1[T: Request Tampering]:::tampering --> CORS
    R1[R: Action Denial]:::repudiation --> AUTH_MW
    I1[I: Data Exposure]:::info --> AUTH_C
    D1[D: API Flooding]:::dos --> RATE
    E1[E: Privilege Escalation]:::elevation --> USER_C
    T2[T: Game State Manipulation]:::tampering --> CACHE
    I2[I: Sensitive Data Leak]:::info --> DB

    style FE fill:#e1f5ff
    style FA fill:#fff4e1
    style CACHE fill:#ffe1f5
    style DB fill:#e1ffe1

    classDef spoofing fill:#ff9999;
    classDef tampering fill:#ffcc99;
    classDef repudiation fill:#ffff99;
    classDef info fill:#99ff99;
    classDef dos fill:#99ffff;
    classDef elevation fill:#ff99ff;
```
---

### Implemented
- Firebase ID token verification
- Password hashing (bcrypt)
- Input validation (Zod)
- Rate limiting
- CORS configuration
- Helmet.js security headers
- Error handling
- Game state server-side
- Database transactions
- Foreign key constraints
- Session tokens for guest games (prevents cross-guest access)
- Cryptographically secure UUIDs for game IDs

### To Be Implemented
- User-based rate limiting
- Audit logging
- Account lockout
- Email verification
- Resource limits
- Database audit logging
- Session management (for authenticated users)
- implement Redis instead of in-memory solution
