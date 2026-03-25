-- ============================================================
-- ParkOS — PostgreSQL Schema
-- Version: V1__initial_schema.sql
-- Developed by: Alisha
-- Stack: PostgreSQL 16
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy plate search

-- ── FACILITIES ──────────────────────────────────────────────
CREATE TABLE facilities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    address         TEXT,
    city            VARCHAR(60),
    state           VARCHAR(60),
    total_slots     INTEGER NOT NULL DEFAULT 0,
    operating_from  TIME NOT NULL DEFAULT '06:00',
    operating_to    TIME NOT NULL DEFAULT '23:00',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    phone           VARCHAR(15),
    password_hash   TEXT NOT NULL,
    role            VARCHAR(10) NOT NULL CHECK (role IN ('ADMIN','STAFF','DRIVER')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    facility_id     UUID REFERENCES facilities(id) ON DELETE SET NULL,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ── PARKING SLOTS ───────────────────────────────────────────
CREATE TABLE parking_slots (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_number         VARCHAR(10) NOT NULL UNIQUE,
    zone                CHAR(1) NOT NULL CHECK (zone IN ('A','B','C','D')),
    floor_level         SMALLINT NOT NULL DEFAULT 0,
    slot_type           VARCHAR(12) NOT NULL DEFAULT 'STANDARD'
                            CHECK (slot_type IN ('STANDARD','COMPACT','OVERSIZED','EV','DISABLED')),
    status              VARCHAR(12) NOT NULL DEFAULT 'AVAILABLE'
                            CHECK (status IN ('AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE')),
    is_ev_charging      BOOLEAN NOT NULL DEFAULT FALSE,
    is_disabled_friendly BOOLEAN NOT NULL DEFAULT FALSE,
    facility_id         UUID REFERENCES facilities(id) ON DELETE CASCADE,
    last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_slots_status    ON parking_slots(status);
CREATE INDEX idx_slots_zone      ON parking_slots(zone);
CREATE INDEX idx_slots_available ON parking_slots(status, zone) WHERE status = 'AVAILABLE';

-- ── VEHICLES / PARKING SESSIONS ─────────────────────────────
CREATE TABLE vehicles (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate_number     VARCHAR(20) NOT NULL,
    owner_name       VARCHAR(100),
    owner_phone      VARCHAR(15),
    vehicle_type     VARCHAR(8) NOT NULL CHECK (vehicle_type IN ('CAR','BIKE','TRUCK','EV')),
    user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    slot_id          UUID REFERENCES parking_slots(id) ON DELETE SET NULL,
    entry_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_time        TIMESTAMPTZ,
    duration_minutes BIGINT,
    total_amount     NUMERIC(10,2),
    status           VARCHAR(10) NOT NULL DEFAULT 'PARKED'
                         CHECK (status IN ('PARKED','EXITED','RESERVED')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_plate      ON vehicles(plate_number);
CREATE INDEX idx_vehicles_status     ON vehicles(status);
CREATE INDEX idx_vehicles_entry      ON vehicles(entry_time DESC);
CREATE INDEX idx_vehicles_plate_trgm ON vehicles USING gin(plate_number gin_trgm_ops);

-- ── BILLING / TRANSACTIONS ──────────────────────────────────
CREATE TABLE transactions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id       UUID NOT NULL REFERENCES vehicles(id),
    plate_number     VARCHAR(20) NOT NULL,
    slot_number      VARCHAR(10),
    entry_time       TIMESTAMPTZ NOT NULL,
    exit_time        TIMESTAMPTZ NOT NULL,
    duration_minutes BIGINT NOT NULL,
    hourly_rate      NUMERIC(8,2) NOT NULL,
    total_amount     NUMERIC(10,2) NOT NULL,
    payment_method   VARCHAR(20) DEFAULT 'CASH',
    payment_status   VARCHAR(10) NOT NULL DEFAULT 'PAID'
                         CHECK (payment_status IN ('PAID','PENDING','REFUNDED')),
    facility_id      UUID REFERENCES facilities(id),
    processed_by     UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_txn_vehicle   ON transactions(vehicle_id);
CREATE INDEX idx_txn_date      ON transactions(created_at DESC);
CREATE INDEX idx_txn_facility  ON transactions(facility_id, created_at DESC);

-- ── AUDIT LOG ───────────────────────────────────────────────
CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(60) NOT NULL,
    entity_type VARCHAR(40),
    entity_id   UUID,
    details     JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user   ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);

-- ── SEED: Default Facility ───────────────────────────────────
INSERT INTO facilities (name, address, city, state, total_slots)
VALUES ('ParkOS Central Hub', '12 Park Street', 'Kolkata', 'West Bengal', 100);

-- ── SEED: Admin User (Alisha) ────────────────────────────────
INSERT INTO users (full_name, email, phone, password_hash, role, facility_id)
SELECT 'Alisha', 'alisha@parkos.in', '+91 98765 00000',
       '$2a$12$hashed_password_here', 'ADMIN', id
FROM facilities LIMIT 1;

-- ── SEED: Parking Slots (100 slots across 4 zones) ───────────
DO $$
DECLARE
  zones CHAR[] := ARRAY['A','B','C','D'];
  zone_counts INT[] := ARRAY[30, 25, 25, 20];
  z CHAR;
  cnt INT;
  i INT;
  slot_num TEXT;
  floor INT;
  fid UUID;
BEGIN
  SELECT id INTO fid FROM facilities LIMIT 1;
  FOR zi IN 1..4 LOOP
    z := zones[zi];
    cnt := zone_counts[zi];
    floor := zi - 1;
    FOR i IN 1..cnt LOOP
      slot_num := z || '-' || LPAD(i::TEXT, 2, '0');
      INSERT INTO parking_slots (slot_number, zone, floor_level, facility_id,
        is_ev_charging, slot_type)
      VALUES (
        slot_num, z, floor, fid,
        (z = 'D' AND i <= 5),
        CASE WHEN z = 'D' AND i <= 5 THEN 'EV'
             WHEN i = cnt THEN 'DISABLED'
             ELSE 'STANDARD' END
      );
    END LOOP;
  END LOOP;
END $$;

-- ── REPORTING VIEW ───────────────────────────────────────────
CREATE OR REPLACE VIEW daily_summary AS
SELECT
    DATE(entry_time)                           AS parking_date,
    COUNT(*)                                   AS total_vehicles,
    COUNT(*) FILTER (WHERE status = 'EXITED')  AS completed_sessions,
    SUM(total_amount) FILTER (WHERE status = 'EXITED') AS total_revenue,
    AVG(duration_minutes) FILTER (WHERE status = 'EXITED') AS avg_duration_min,
    COUNT(*) FILTER (WHERE vehicle_type = 'CAR')   AS cars,
    COUNT(*) FILTER (WHERE vehicle_type = 'BIKE')  AS bikes,
    COUNT(*) FILTER (WHERE vehicle_type = 'TRUCK') AS trucks,
    COUNT(*) FILTER (WHERE vehicle_type = 'EV')    AS evs
FROM vehicles
GROUP BY DATE(entry_time)
ORDER BY parking_date DESC;
