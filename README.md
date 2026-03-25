# 🅿️ ParkOS — Parking Management System

**Developed by: Alisha**  
*Version 2.1.0 | Kolkata, India*

---

## Overview

ParkOS is a scalable, real-time parking management platform designed for single and multi-location parking facilities. It handles vehicle entry/exit, automated slot allocation, user management, billing, and comprehensive reporting.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend Core | **Java 21 + Spring Boot 3.2** | REST API, business logic, JPA |
| API Gateway | **Go 1.22 + Gin** | Auth, rate limiting, WebSocket |
| Database | **PostgreSQL 16** | Primary data store |
| Cache | **Redis 7** | Session cache, pub/sub events |
| Messaging | **Apache Kafka** | Real-time event streaming |
| Frontend | **HTML5/CSS3/JS** | Dashboard UI |
| Container | **Docker + Compose** | Local & cloud deployment |
| Migrations | **Flyway** | DB version control |

---

## Features

### Parking Slot Management
- Auto-allocation using First-Available strategy per zone
- Zone-based slot map (A–D across 4 floors)
- Real-time occupancy updates via WebSocket
- EV charging slot priority for electric vehicles

### Vehicle Entry & Exit
- Plate number registration with owner details
- Timestamped entry/exit logging
- Duration calculation with minimum billing (30 min)
- Slot freed automatically on exit

### User Management
- Roles: `ADMIN`, `STAFF`, `DRIVER`
- JWT-based authentication (24h expiry)
- Role-based access control on all endpoints
- 2FA support (configurable)

### Billing
- Configurable hourly rates per vehicle type
- Auto bill generation on exit
- Transaction log with export

### Reporting
- Daily/monthly summary views
- Occupancy rate trends
- Peak hour analysis
- Revenue breakdown by vehicle type

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Login, get JWT |
| `POST` | `/api/v1/auth/register` | Register user |
| `POST` | `/api/v1/parking/entry` | Record vehicle entry |
| `POST` | `/api/v1/parking/exit/{id}` | Process exit + bill |
| `GET` | `/api/v1/parking/stats` | Live occupancy stats |
| `GET` | `/api/v1/parking/slots` | All slot statuses |
| `GET` | `/api/v1/parking/vehicles` | Vehicle list (paginated) |
| `GET` | `/api/v1/users` | User management |
| `GET` | `/api/v1/reports/daily` | Daily summary |
| `GET` | `/api/v1/reports/revenue` | Revenue report |
| `WS` | `ws://gateway:9090/ws` | Real-time events |

---

## Setup

### Prerequisites
- Docker & Docker Compose
- Java 21 (for local dev)
- Go 1.22 (for gateway dev)

### Quick Start

```bash
# Clone and start all services
git clone https://github.com/alisha/parkos.git
cd parkos

# Copy env file
cp .env.example .env

# Start everything
docker-compose up -d

# Open dashboard
open http://localhost
```

### Environment Variables

```env
JWT_SECRET=your-256-bit-secret
DB_USER=parkos
DB_PASS=parkos_secure_pass
REDIS_HOST=localhost
KAFKA_SERVERS=localhost:9092
```

---

## Database Schema

```
facilities     → Parking locations/branches
users          → Admins, staff, drivers
parking_slots  → Individual slots (A-01 to D-20)
vehicles       → Parking sessions (entry + exit)
transactions   → Billing records
audit_log      → System activity log
```

---

## Architecture

```
Browser/App
    │
    ▼
[Go Gateway :9090]  ← Rate Limiting, Auth, WebSocket
    │
    ├── /api/* → [Spring Boot API :8080]
    │                   │
    │              [PostgreSQL 16]
    │              [Redis Cache]
    │              [Kafka Producer]
    │
    └── /ws   → WebSocket Hub
                    ▲
               [Redis Pub/Sub] ← [Kafka Consumer in Java]
```

---

## Pricing Configuration

| Vehicle Type | Rate (INR/hour) |
|-------------|----------------|
| Car | ₹60 |
| Bike/Scooter | ₹30 |
| Truck/Van | ₹120 |
| EV | ₹50 |

*Minimum charge: 30 minutes*

---

## Security

- JWT authentication with configurable expiry
- Bcrypt password hashing (cost 12)
- Role-based access control (RBAC)
- Rate limiting: 100 req/min per IP
- All DB queries use parameterized statements
- Audit logging for all sensitive operations
- CORS configured for known origins only

---

## Scalability Notes

- Stateless Spring Boot API — horizontal scaling ready
- Redis for distributed session/cache
- Kafka for async event processing
- PostgreSQL connection pooling via HikariCP (max 20)
- Database indexes on `plate_number`, `status`, `entry_time`
- `pg_trgm` index for fuzzy plate search

---

*Developed by **Alisha** — ParkOS v2.1.0*
