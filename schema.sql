-- ==========================================================
-- Local Water Quality Monitoring and Complaint Tracking System
-- Supabase PostgreSQL Schema & Security Policies
-- ==========================================================

-- 1. Create Wards Table
CREATE TABLE IF NOT EXISTS wards (
  ward_id SERIAL PRIMARY KEY,
  ward_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

-- 2. Create Water Quality Tests Table
CREATE TABLE IF NOT EXISTS water_tests (
  test_id SERIAL PRIMARY KEY,
  ward_id INT REFERENCES wards(ward_id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ph NUMERIC(4, 2) NOT NULL,
  tds NUMERIC(6, 2) NOT NULL,
  turbidity NUMERIC(5, 2) NOT NULL,
  source TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_test_per_ward_day UNIQUE (ward_id, test_date)
);

-- 3. Create Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id SERIAL PRIMARY KEY,
  ward_id INT REFERENCES wards(ward_id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Complaint Progress Updates Table
CREATE TABLE IF NOT EXISTS complaint_updates (
  id SERIAL PRIMARY KEY,
  complaint_id INT REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  remark TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- Row Level Security (RLS) Configuration
-- ==========================================================

ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_updates ENABLE ROW LEVEL SECURITY;

-- Public Read Access Policies
CREATE POLICY "Allow public read access on wards" 
  ON wards FOR SELECT USING (true);

CREATE POLICY "Allow public read access on water_tests" 
  ON water_tests FOR SELECT USING (true);

CREATE POLICY "Allow public read access on complaints" 
  ON complaints FOR SELECT USING (true);

CREATE POLICY "Allow public read access on complaint_updates" 
  ON complaint_updates FOR SELECT USING (true);

-- Public Grievance Submission Policy
CREATE POLICY "Allow public to insert complaints" 
  ON complaints FOR INSERT WITH CHECK (true);

-- Authenticated Staff/Admin Access Policies
CREATE POLICY "Allow authenticated full access to water_tests" 
  ON water_tests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated to update complaints" 
  ON complaints FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated to insert complaint_updates" 
  ON complaint_updates FOR INSERT TO authenticated WITH CHECK (true);

-- ==========================================================
-- Sample Seed Data (Bangalore Wards)
-- ==========================================================

INSERT INTO wards (ward_id, ward_name, latitude, longitude) VALUES
  (1, 'Ward 1 - Malleshwaram', 13.0031, 77.5643),
  (2, 'Ward 2 - Indiranagar', 12.9784, 77.6408),
  (3, 'Ward 3 - Koramangala', 12.9352, 77.6245),
  (4, 'Ward 4 - Jayanagar', 12.9308, 77.5838),
  (5, 'Ward 5 - Whitefield', 12.9698, 77.7500)
ON CONFLICT (ward_id) DO NOTHING;
