# Database Setup Guide

PostgreSQL + Prisma setup for the Eternal Journal Web2 tier.

---

## Architecture Overview

```
Frontend (Next.js)
    |
    | HTTP (REST API)
    |
API (NestJS)
    |
    | Prisma Client
    |
PostgreSQL
```

### What Prisma does

Prisma is the ORM (Object-Relational Mapper) that sits between the NestJS API and PostgreSQL. It:

1. Translates TypeScript code into SQL queries
2. Provides type-safe database access (auto-complete, compile-time checks)
3. Manages database schema changes via migrations
4. Generates a client from `prisma/schema.prisma`

### Database models

| Model            | Purpose                                 | Key fields                                                                                                        |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **User**         | Google OAuth users                      | `id` (cuid), `googleId` (unique), `email`, `name`, `picture`                                                      |
| **JournalEntry** | Encrypted journal entries per user      | `id` (cuid), `userId` (FK), `ciphertext` (Base64 AES-256-GCM encrypted), `timestamp`                              |
| **SharedQuote**  | Anonymously shared quotes for community | `id` (cuid), `userId` (FK), `ciphertext` (admin-encrypted), `sourceEntryId`, `status` (PENDING/APPROVED/REJECTED) |

---

## Development (Local)

### Prerequisites

- **Docker** installed ([Get Docker](https://docs.docker.com/get-docker/))
- **Node.js** 18+

### Step 1: Start PostgreSQL with Docker

```bash
docker run -d \
  --name eternal-journal-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=eternal_journal \
  postgres:16
```

This creates a container named `eternal-journal-db` with:

- Port: 5432 (default PostgreSQL port)
- User: `postgres`
- Password: `postgres`
- Database: `eternal_journal`

### Step 2: Configure environment

In `apps/api/.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eternal_journal?schema=public
```

### Step 3: Run migrations

```bash
cd apps/api
yarn prisma migrate dev --name init
```

This will:

1. Create the `User` and `JournalEntry` tables
2. Generate the Prisma Client

### Step 4: Start the API

```bash
yarn dev:api
```

### Useful Docker commands

```bash
docker ps                              # List running containers
docker stop eternal-journal-db         # Stop the database
docker start eternal-journal-db        # Restart it
docker rm eternal-journal-db           # Delete (data is lost)
docker logs eternal-journal-db         # View logs
```

### Useful Prisma commands

```bash
yarn prisma studio                     # Open visual database editor (http://localhost:5555)
yarn prisma migrate dev --name <name>  # Create and apply a new migration
yarn prisma generate                   # Regenerate client after schema changes
yarn prisma db push                    # Push schema without creating migration (prototyping only)
yarn prisma migrate reset              # Reset database (drops all data)
```

---

## Staging

Staging uses AWS RDS PostgreSQL to simulate production.

### Step 1: Create RDS instance

1. Go to **AWS Console > RDS > Create database**
2. Settings:
   - **Engine**: PostgreSQL 16
   - **Template**: Free tier
   - **Instance**: db.t3.micro
   - **Storage**: 20 GB
   - **Master username**: `postgres`
   - **Master password**: Choose a strong password
3. Connectivity:
   - **Public access**: Yes (for staging only; production should be private)
   - **VPC security group**: Add inbound rule for port 5432, source: your IP or CIDR range

### Step 2: Configure environment

Set `DATABASE_URL` in your staging environment:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/eternal_journal?schema=public
```

The RDS endpoint looks like: `eternal-journal-staging.xxxxx.us-east-1.rds.amazonaws.com`

### Step 3: Run migrations

```bash
cd apps/api
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/eternal_journal?schema=public" \
  yarn prisma migrate deploy
```

Note: `migrate deploy` (not `migrate dev`) is used for non-local environments. It applies pending migrations without creating new ones.

---

## Production

Production uses RDS PostgreSQL inside a private VPC for security.

### Step 1: Create RDS instance

Same as staging, but with these differences:

| Setting              | Staging     | Production                  |
| -------------------- | ----------- | --------------------------- |
| **Public access**    | Yes         | **No**                      |
| **Instance class**   | db.t3.micro | db.t3.small or larger       |
| **Multi-AZ**         | No          | Yes (for high availability) |
| **Storage**          | 20 GB       | 50+ GB with auto-scaling    |
| **Backup retention** | 1 day       | 7+ days                     |
| **Encryption**       | Optional    | **Enabled**                 |

### Step 2: Security

- RDS is **not publicly accessible**; only the API (running in the same VPC) can reach it
- Security Group inbound rule: PostgreSQL (5432) from the API's security group only
- Use **AWS Secrets Manager** or **SSM Parameter Store** for the DATABASE_URL
- Enable **automated backups** and set retention to 7+ days
- Enable **encryption at rest**

### Step 3: Deploy migrations

Migrations run as part of the deployment pipeline (CI/CD), before the API starts:

```bash
yarn prisma migrate deploy
```

If using Docker for the API, include this in the startup script:

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

### Step 4: Monitoring

- Enable **RDS Performance Insights** (free for db.t3 instances)
- Set up **CloudWatch Alarms** for CPU, storage, and connection count
- Review **slow query logs** periodically

---

## Summary

| Environment | Database          | Access         | Migrations                      | Connection |
| ----------- | ----------------- | -------------- | ------------------------------- | ---------- |
| **Dev**     | Docker (local)    | localhost:5432 | `prisma migrate dev`            | Direct     |
| **Staging** | RDS (public)      | RDS endpoint   | `prisma migrate deploy`         | Direct     |
| **Prod**    | RDS (private VPC) | Internal only  | `prisma migrate deploy` (CI/CD) | Via VPC    |
