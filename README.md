# CRM Try 1

React + Spring Boot CRM starter with login, forgot password/user ID flows, and dashboard shell UI.

## Project Structure

- `frontend/` - React + Vite UI
- `backend/` - Spring Boot API (JWT auth)
- `database/` - SQL scripts for PostgreSQL/Oracle setup and migration helpers
- `ERROR` - Empty helper file for pasting runtime errors for troubleshooting

## Prerequisites

- Java 21 (verified with Maven wrapper)
- Node.js + npm
- Oracle Database (default runtime) OR optional H2 mode

## 1) Backend Setup and Run

Open terminal in `backend/`.

### Option A: Run with Oracle (default)

The backend defaults in `application.yml` use:

- URL: `jdbc:oracle:thin:@//localhost:1521/XEPDB1`
- Username: `SYSTEM`
- Password: `Oracle@1234`

You can override with env variables:

- `DATASOURCE_URL`
- `DATASOURCE_USERNAME`
- `DATASOURCE_PASSWORD`

Run:

```powershell
.\mvnw.cmd spring-boot:run
```

Backend URL: `http://localhost:8080`

### Option B: Run without Oracle (H2 in-memory)

```powershell
.\mvnw.cmd spring-boot:run -Ph2 -Dspring-boot.run.profiles=h2
```

H2 console (if needed): `http://localhost:8080/h2-console`

## 2) Frontend Setup and Run

Open another terminal in `frontend/`.

Install packages (first run only):

```powershell
npm install
```

Run dev server:

```powershell
npm run dev
```

Frontend URL: `http://localhost:5173`

Vite proxies `/api/*` requests to backend `http://localhost:8080`.

## 3) Login Credentials (Seeded Demo User)

On successful backend start, `DataInitializer` seeds:

- Username (User ID): `admin`
- Password: `ChangeMe!1`

Important:

- Login expects **username**, not numeric database `user_id`.
- DB column used by the app is `user_name`.

## 4) Build / Verify Commands

### Backend compile

```powershell
cd backend
.\mvnw.cmd -q -DskipTests compile
```

### Frontend production build

```powershell
cd frontend
npm run build
```

## 5) Password Hash Utility

A helper class exists at:

- `backend/src/main/java/com/crm/tools/PasswordHashGenerator.java`

Generate hash for a password:

```powershell
cd backend
.\mvnw.cmd -q compile exec:java "-Dexec.args=YourPasswordHere"
```

Use output as:

- `password_hash` = generated BCrypt hash

## 6) Oracle SQL Scripts (Useful)

Inside `database/`:

- `01_create_tables_oracle.sql` - Oracle tables
- `02_seed_groups_oracle.sql` - Group seed data
- `04_oracle_migrate_timestamps_plain.sql` - Timestamp migration helper
- `05_oracle_drop_legacy_username_column.sql` - Optional cleanup helper
- `09_oracle_drop_password_salt_column.sql` - Optional helper to drop old `password_salt` column
- `10_oracle_create_table_sequences.sql` - Optional helper to create/use explicit Oracle sequences for table IDs

## 7) Common Troubleshooting

- **401 on login**:
  - Ensure API call reaches `/api/auth/login` in browser Network tab.
  - Ensure `user_name='admin'` exists and `password_hash` matches typed password.
- **Oracle ORA-12514**:
  - Fix service name in `DATASOURCE_URL`.
- **Oracle ORA-01400 USER_NAME**:
  - Ensure column `user_name` is populated (not `username`).
- **Frontend cannot call API**:
  - Confirm backend is running on port 8080 and frontend on 5173.

## 8) Error Sharing Workflow

If anything fails, paste full stacktrace/error text into the root file:

- `ERROR`

Then share that file contents for analysis.
