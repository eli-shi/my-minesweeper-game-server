# Database Use Cases - Minesweeper Backend

## 1. User Management

### 1.1 Create User
**Service:** `authService.createUser()`  
**Operation:** `prisma.user.create()`  
**Trigger:** User signs up via Firebase authentication  
**Data Created:**
- User ID (from Firebase)
- Username (generated or provided)
- Email
- Password hash
- Timestamps (created_at, updated_at)

### 1.2 Get or Create User
**Service:** `authService.getOrCreateUser()`  
**Operations:** 
- `prisma.user.findFirst()` - Check if user exists
- `prisma.user.create()` - Create if doesn't exist  
**Trigger:** User logs in with Firebase token  
**Logic:** Creates user on first login, returns existing user on subsequent logins

### 1.3 Get Current User
**Service:** `authService.getCurrentUser()`  
**Operation:** `prisma.user.findUnique()`  
**Trigger:** User requests their profile  
**Returns:** User profile data (id, username, email, timestamps)

### 1.4 Update User Profile
**Service:** `authService.updateUserProfile()`  
**Operation:** `prisma.user.update()`  
**Trigger:** User updates their profile information  
**Updatable Fields:** Username, email, other profile data

### 1.5 Update Last Game Played
**Service:** `gameService.saveCompletedGame()` (within transaction)  
**Operation:** `tx.user.update()`  
**Trigger:** User completes a game (win or loss)  
**Updates:** `last_game_played` timestamp

### 1.6 Delete User
**Service:** `authService.deleteUser()`  
**Operations:**
- `auth.deleteUser()` - Delete from Firebase
- `prisma.user.delete()` - Delete from database  
**Trigger:** User deletes their account  
**Cascade:** Deletes related games, stats, friendships

---

## 2. Game Management

### 2.1 Save Completed Game (Transaction)
**Service:** `gameService.saveCompletedGame()`  
**Operation:** `prisma.$transaction()`  
**Trigger:** User wins or loses a game  
**Transaction Steps:**
1. **Create Game Record** - `tx.game.create()`
   - User ID
   - Difficulty ID
   - Status (won/lost)
   - Solved time (if won)
   - Created timestamp

2. **Update User** - `tx.user.update()`
   - Update `last_game_played` timestamp

3. **Update Difficulty Stats** - `updateGameModeStatsWithTransaction()`
   - Increment played count
   - Increment won count (if applicable)

**Atomicity:** All 3 operations succeed or all fail (rolled back)

### 2.2 Get User Game History
**Service:** `gameService.getUserGames()`  
**Operation:** `prisma.game.findMany()`  
**Trigger:** User requests their game history  
**Query:**
- Filter by user_id
- Order by created_at (descending)
- Limit results (default: 10)
- Include difficulty details  
**Returns:** Array of completed games with metadata

### 2.3 Validate Difficulty Exists
**Service:** `gameService.saveCompletedGame()`  
**Operation:** `prisma.difficulty.findUnique()`  
**Trigger:** Before saving a game  
**Purpose:** Ensure difficulty ID is valid before creating game record

---

## 3. Difficulty Stats (Per User, Per Mode)

### 3.1 Update Easy Mode Stats
**Service:** `gameService.updateGameModeStatsWithTransaction()`  
**Operations:**
- `tx.easyMode.findUnique()` - Check if record exists
- `tx.easyMode.update()` - Update existing record
- `tx.easyMode.create()` - Create if doesn't exist  
**Trigger:** User completes easy difficulty game  
**Updates:**
- Increment `played` count
- Increment `won` count (if game won)
- Update `updated_at` timestamp

### 3.2 Update Medium Mode Stats
**Service:** `gameService.updateGameModeStatsWithTransaction()`  
**Operations:**
- `tx.mediumMode.findUnique()` - Check if record exists
- `tx.mediumMode.update()` - Update existing record
- `tx.mediumMode.create()` - Create if doesn't exist  
**Trigger:** User completes medium difficulty game  
**Updates:** Same as Easy Mode

### 3.3 Update Hard Mode Stats
**Service:** `gameService.updateGameModeStatsWithTransaction()`  
**Operations:**
- `tx.hardMode.findUnique()` - Check if record exists
- `tx.hardMode.update()` - Update existing record
- `tx.hardMode.create()` - Create if doesn't exist  
**Trigger:** User completes hard difficulty game  
**Updates:** Same as Easy Mode

---

## 4. Leaderboards

### 4.1 Get Easy Mode Leaderboard
**Service:** `leaderboardService.getLeaderboard('easy')`  
**Operation:** `prisma.easyMode.findMany()`  
**Query:**
- Include user details
- Order by won (descending), then played (ascending)
- Limit to top 100  
**Returns:** Array of {username, won, played, winRate}

### 4.2 Get Medium Mode Leaderboard
**Service:** `leaderboardService.getLeaderboard('medium')`  
**Operation:** `prisma.mediumMode.findMany()`  
**Query:** Same as Easy Mode  
**Returns:** Same as Easy Mode

### 4.3 Get Hard Mode Leaderboard
**Service:** `leaderboardService.getLeaderboard('hard')`  
**Operation:** `prisma.hardMode.findMany()`  
**Query:** Same as Easy Mode  
**Returns:** Same as Easy Mode

---

## Database Entities Summary

| Entity | Primary Key | Purpose | Related Tables |
|--------|-------------|---------|----------------|
| **User** | id (String) | User accounts | Game, EasyMode, MediumMode, HardMode, Friend |
| **Game** | id (Int, auto) | Completed game records | User, Difficulty |
| **Difficulty** | diff_id (Int) | Difficulty levels (easy=1, medium=2, hard=3) | Game, EasyMode, MediumMode, HardMode |
| **EasyMode** | user_id (String) | Easy difficulty stats per user | User, Difficulty |
| **MediumMode** | user_id (String) | Medium difficulty stats per user | User, Difficulty |
| **HardMode** | user_id (String) | Hard difficulty stats per user | User, Difficulty |
| **Friend** | id (Int, auto) | User relationships (not yet implemented) | User |

---

## Transaction Usage

### Implemented Transactions:
✅ **Save Completed Game** - 3 operations (game create, user update, stats update)

### Not Using Transactions (Safe):
- Single read operations (findUnique, findFirst, findMany)
- Single create operations (user creation on signup)
- Single update operations (profile updates)

### Potential Future Transactions:
- Friend relationship management (add/remove friends)
- Bulk stat updates
- User deletion with cascade (if manual cascade needed)

---

## Query Performance Considerations

### Indexed Fields:
- ✅ User: id (primary key), username (unique), email (unique)
- ✅ Game: id (primary key), user_id (foreign key), diff_id (foreign key)
- ✅ EasyMode/MediumMode/HardMode: user_id (primary key), diff_id (foreign key)
- ✅ Difficulty: diff_id (primary key)

### Common Queries:
- **Most Frequent:** Game creation, stat updates (every completed game)
- **Moderate:** Leaderboard queries (on page load)
- **Infrequent:** User profile queries, game history queries

### Optimization:
- Prisma connection pooling enabled (default)
- Indexes on all foreign keys (automatic)
- Leaderboard queries limited to 100 results
- Game history queries limited to 10 results (default)

---

## Use Cases NOT Implemented (Database Tables Exist)

### Friend System:
- **Table:** `Friend` (exists in schema)
- **Operations:** None implemented yet
- **Future Use Cases:**
  - Add friend
  - Remove friend
  - Get user's friends list
  - Get friend requests


## Note
This document was generated with Copilot and then altered by me