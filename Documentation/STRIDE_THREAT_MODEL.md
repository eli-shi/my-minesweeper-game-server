# STRIDE Threat Analysis Table

| ID | Category | Threat | Current Mitigations | Vulnerabilities |
|---|----------|--------|-------------------|-----------------|
| **T1** | **Spoofing** | Token Forgery/Replay Attacks | - Firebase Admin SDK verifies ID tokens cryptographically<br>- Token format validation (JWT structure check)<br>- Token length validation (min 100 chars)<br>- Revoked token checking in both `verifyToken` and `optionalAuth` (`verifyIdToken(token, true)`)<br>- Token expiration automatically validated by Firebase (checks `exp` claim)<br>- Expired token error handling (`auth/id-token-expired`) | - No token refresh mechanism validation |
| **T2** | **Spoofing** | User ID Spoofing in Game Operations | - `getActiveGame()` checks userId matches game owner for authenticated users<br>- Session tokens required for guest games (prevents cross-guest access)<br>- Throws error if unauthorized | - Race condition: game could be deleted between check and access<br>- No audit logging for unauthorized access attempts |
| **T3** | **Spoofing** | Email/Username Spoofing | - Email uniqueness constraint in database<br>- Username uniqueness constraint in database<br>- Email format validation (Zod schema) | - No email verification required<br>- Username auto-generated from email (could conflict)<br>- No protection against typosquatting |
| **T4** | **Tampering** | Game State Manipulation | - Game state stored server-side (not client-side)<br>- Board generation happens server-side<br>- Cell reveal/flag operations validated server-side<br>- Game state updates go through service layer | - Game state in memory (could be manipulated if server compromised)<br>- No validation that revealed cells match board state<br>- No replay protection for game actions |
| **T5** | **Tampering** | Request Body/Query Parameter Tampering | - Zod schema validation on all endpoints<br>- Type coercion and range validation (non-negative integers)<br>- UUID validation for `gameId`<br>- Enum validation for difficulty<br>- Session token validation for guest games | - No validation that row/col are within board bounds<br>- No validation that gameId exists before processing<br>- No rate limiting per gameId (could spam actions) |
| **T6** | **Tampering** | Database Tampering | - Prisma ORM provides type safety<br>- Database transactions for atomic operations<br>- Foreign key constraints<br>- User ID validation in queries | - No database-level audit logging<br>- No checksums/hashes for critical data<br>- Direct database access could bypass application logic<br>- No row-level security policies |
| **T7** | **Tampering** | Leaderboard Data Tampering | - Rate limiting on leaderboard endpoints<br>- Database queries use Prisma (SQL injection protection) | - No input validation on leaderboard query parameters<br>- No caching (could be expensive to query)<br>- No pagination limits enforced |
| **T8** | **Repudiation** | Game Action Repudiation | - Game actions tied to authenticated user ID<br>- Game state stored server-side<br>- Completed games saved to database with timestamps<br>- Guest games tracked with session tokens | - No audit logging for game actions<br>- No request/response logging<br>- No action timestamps in game cache |
| **T9** | **Repudiation** | Authentication Event Repudiation | - Firebase Authentication logs events<br>- Database timestamps (`created_at`, `updated_at`, `last_game_played`) | - No application-level audit logging<br>- No IP address logging for auth events<br>- No device/session tracking<br>- No failed login attempt logging |
| **T11** | **Information Disclosure** | Database Information Disclosure | - Prisma ORM prevents SQL injection<br>- Parameterized queries<br>- Database credentials in environment variables<br>- User ID validation in queries | - No query result filtering (returns all user fields)<br>- No database encryption at rest mentioned |
| **T12** | **Information Disclosure** | Game State Information Disclosure | - Board only revealed on game over<br>- Only revealed cells sent to client<br>- Mine positions not exposed during gameplay<br>- Game state stored server-side<br>- Session tokens prevent unauthorized game access | - Game cache in memory (could be dumped)<br>- No encryption for game state in transit |
| **T14** | **Denial of Service** | Rate Limiting Bypass | - Rate limiting on all endpoints<br>- Different limits for different endpoint types<br>- IP-based rate limiting | - IP-based limiting vulnerable to IP rotation<br>- No user-based rate limiting (only IP) |
| **T15** | **Denial of Service** | Resource Exhaustion (Memory/CPU) | - Request body size limit (10MB)<br>- Game cache cleanup (expired games removed)<br>- Game timeout (5 minutes max duration)<br>- Game cache expiration (2 hours) | - No limit on concurrent games per user<br>- No limit on total games in cache<br>- Large board sizes could consume memory |
| **T16** | **Denial of Service** | Database DoS | - Prisma connection pooling<br>- Query limits on game history<br>- Indexed database queries (foreign keys) | - No query timeout configuration<br>- No connection pool size limits mentioned<br>- No database query rate limiting<br>- No database query monitoring |
| **T17** | **Denial of Service** | Authentication DoS | - Rate limiting on auth endpoints (100 requests/minute)<br>- Firebase handles authentication<br>- Password hashing | - Rate limit is per-IP, needs to also be per user<br>- No account lockout after failed attempts<br> |
| **T18** | **Elevation of Privilege** | Authorization Bypass | - Token verification middleware<br>- User ID validation in game service for authenticated users<br>- Session token validation for guest games<br>- Optional auth for guest games | - No resource-level permissions |
| **T19** | **Elevation of Privilege** | Privilege Escalation via Token Manipulation | - Firebase verifies token signatures<br>- Token claims cannot be modified (cryptographically signed)<br>- No custom claims in current implementation<br>- Both `verifyToken` and `optionalAuth` verify token claims | |
| **T20** | **Elevation of Privilege** | Database Privilege Escalation | - Prisma uses connection string (credentials in env)<br>- Database user should have limited permissions<br>- Prisma prevents direct SQL execution | - No verification of database user permissions<br>- Database credentials in environment (could be exposed)<br>- No database user role validation<br>- Prisma migrations could be run with elevated privileges |

---

## Security Controls Checklist

### Implemented
- [x] Firebase ID token verification
- [x] Password hashing (bcrypt)
- [x] Input validation (Zod)
- [x] Rate limiting
- [x] CORS configuration
- [x] Helmet.js security headers
- [x] Error handling
- [x] Game state server-side
- [x] Database transactions
- [x] Foreign key constraints
- [x] Session tokens for guest games (prevents cross-guest access)
- [x] Cryptographically secure UUIDs for game IDs

### Recommended
- [ ] User-based rate limiting
- [ ] Audit logging
- [ ] Account lockout
- [ ] Email verification
- [ ] Resource limits
- [ ] Database audit logging
- [ ] Session management (for authenticated users)
- [ ] implement Redis instead of in-memory solution
