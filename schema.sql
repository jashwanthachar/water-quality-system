-- ==========================================================
-- Local Water Quality Monitoring and Complaint Tracking System
-- Exact Supabase Database Schema & Setup Script
-- ==========================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS wards (
  ward_id SERIAL PRIMARY KEY,
  ward_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS water_tests (
  test_id SERIAL PRIMARY KEY,
  ward_id INT REFERENCES wards(ward_id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ph NUMERIC NOT NULL,
  tds NUMERIC NOT NULL,
  turbidity NUMERIC NOT NULL,
  source TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_test_per_ward_day UNIQUE (ward_id, test_date)
);

CREATE TABLE IF NOT EXISTS complaints (
  complaint_id SERIAL PRIMARY KEY,
  ward_id INT REFERENCES wards(ward_id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_updates (
  id SERIAL PRIMARY KEY,
  complaint_id INT REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  remark TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 2. Storage Bucket Setup (for complaint photos)
-- ==========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-photos', 'complaint-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public upload photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'complaint-photos');

-- ==========================================================
-- 3. Row Level Security (RLS) & Policies
-- ==========================================================

ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read wards" ON wards FOR SELECT USING (true);
CREATE POLICY "public read tests" ON water_tests FOR SELECT USING (true);
CREATE POLICY "public read complaints" ON complaints FOR SELECT USING (true);
CREATE POLICY "public insert complaints" ON complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "public read updates" ON complaint_updates FOR SELECT USING (true);

-- ==========================================================
-- 4. Initial Seed Data (Wards 1-7 & Baseline Tests)
-- ==========================================================

INSERT INTO wards (ward_name, latitude, longitude) VALUES
  ('Ward 1', 12.9880, 77.5800),
  ('Ward 2', 12.9750, 77.6000),
  ('Ward 3', 12.9650, 77.5900),
  ('Ward 4', 12.9600, 77.6100),
  ('Ward 5', 12.9980, 77.6200),
  ('Ward 6', 12.9500, 77.5700),
  ('Ward 7', 12.9700, 77.6300)
ON CONFLICT DO NOTHING;

INSERT INTO water_tests (ward_id, test_date, ph, tds, turbidity, source) VALUES
  (1, '2026-10-01', 7.1, 310, 0.6, 'Local Water Testing Unit'),
  (2, '2026-10-01', 7.4, 280, 0.8, 'Local Water Testing Unit'),
  (3, '2026-09-28', 7.0, 350, 0.9, 'Local Water Testing Unit'),
  (4, '2026-09-20', 7.5, 400, 1.5, 'Local Water Testing Unit'),
  (4, '2026-09-25', 7.2, 430, 2.1, 'Local Water Testing Unit'),
  (5, '2026-09-30', 6.4, 520, 1.2, 'Local Water Testing Unit'),
  (6, '2026-10-02', 7.3, 300, 0.7, 'Local Water Testing Unit'),
  (7, '2026-09-29', 7.8, 640, 3.5, 'Local Water Testing Unit')
ON CONFLICT DO NOTHING;
