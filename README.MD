# Local Water Quality Monitoring and Complaint Tracking System

A ward-level web platform where residents can view water-test records,
report water problems, and track complaints. Authorities can manage test
records and complaints through an admin dashboard and view a ward-level
hotspot map.

**Live demo:** https://YOUR-PROJECT.vercel.app

## Features
- Ward-wise water-quality records (pH, TDS, turbidity) with test date and source
- Informational status compared with BIS IS 10500 reference limits
- Complaint submission with optional photo and unique complaint ID
- Complaint tracking timeline (Submitted, Reviewed, In Progress, Resolved)
- Admin login, test-record entry, complaint status updates with remarks
- Water Quality and Complaint Hotspot Map (rule-based, free OpenStreetMap)
- QR code for each ward

## Tech Stack
HTML, CSS, JavaScript | Supabase (PostgreSQL, Auth, Storage) |
Leaflet + OpenStreetMap | GitHub | Vercel

## Hotspot Logic
Points per ward: complaints in last 30 days (5-9 = +1, 10+ = +2),
rising trend (+1), latest water test above acceptable limit (+1) or outside
permissible limit (+2).
0 = Normal, 1-2 = Attention, 3+ = High Priority.

## Disclaimer
Status shown is informational. It compares entered values with selected
BIS IS 10500 reference limits and does not replace laboratory testing.

## Project Structure
- index.html, water.html, complaint.html, track.html: citizen pages
- map.html, qr.html: hotspot map and QR generator
- admin-login.html, admin.html: admin pages
- css/, js/: styles and scripts

## Team
Add your 4 member names here.

## Future Scope
Sensor integration, SMS/WhatsApp notifications, OTP-verified complaints,
Kannada language support, official lab data integration, ward boundary polygons.