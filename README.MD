# Local Water Information System
> Ward-level Water Quality Monitoring and Grievance Redressal Portal

A modern, responsive civic-tech web application that bridges the gap between residents and municipal authorities regarding potable water quality and distribution infrastructure.

Residents can check laboratory test records (pH, TDS, turbidity against **BIS IS 10500** limits), calculate Water Quality Index (WQI), report local water problems with photos, track grievance resolutions in real time, scan ward QR codes, and view a geographic hotspot risk map. Authorities manage test records, update complaints, and monitor risks via an authenticated admin dashboard.

---

## ✨ Features

### For Citizens
* **Live Water Quality Index (WQI):** Interactive gauge calculating water safety score (0-100) per ward.
* **Standards Compliance:** Real-time comparison with Indian Standard **BIS IS 10500** reference values.
* **Problem Reporting:** Submit grievances with photo upload ($\le 2\text{ MB}$) to Supabase Storage.
* **Instant Tracking & Timeline:** Real-time stage progression (*Submitted → Reviewed → In Progress → Resolved*) with official remarks.
* **Device Complaint History:** Remembers filed complaint IDs locally without requiring an account.
* **In-App Camera QR Scanner:** Built-in mobile camera scanner using `html5-qrcode` to scan ward tap stickers.
* **Geographic Hotspot Map:** Rule-based Leaflet risk map color-coding wards based on complaints and test violations.

### For Municipal Authorities (Admins)
* **Secure Staff Authentication:** Supabase Auth-protected dashboard.
* **Water Test Records Management:** Full insert, edit, and delete capabilities with duplicate record prevention (`one_test_per_ward_day` constraint).
* **Complaint Workflow & Remarks:** Filter complaints by ward, advance resolution status, and publish citizen-visible timeline notes.
* **Embedded Hotspot Map:** Direct spatial monitoring from within the admin dashboard.
* **CSV Export:** Sanitized reporting for complaints and water test records.
* **Ward QR Code Generator:** Generate and download high-resolution QR codes linking directly to each ward.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Modern CSS3 (Mobile-first app shell, custom variables, Plus Jakarta Sans), Vanilla JavaScript (ES6+).
* **Backend as a Service:** [Supabase](https://supabase.com/)
  * **Database:** PostgreSQL with Row Level Security (RLS)
  * **Auth:** Email & Password authentication
  * **Storage:** Bucket for citizen complaint photos (`complaint-photos`)
* **Mapping:** [Leaflet.js](https://leafletjs.com/) with OpenStreetMap tiles.
* **QR Codes & Camera:** [QRCode.js](https://davidshimjs.github.io/qrcodejs/) & [Html5-QRCode](https://unpkg.com/html5-qrcode).

---

## 📁 Project Structure

```
water-quality-system/
├── index.html              # Modern mobile civic portal & live WQI preview
├── water.html              # Detailed ward water test records & history
├── complaint.html          # Public grievance filing form with photo upload
├── track.html              # Step-by-step complaint progress tracking
├── my-complaints.html      # Device-cached complaint history list
├── scan.html               # Real-time camera QR code scanner
├── qr.html                 # Ward QR code generator & PNG download
├── map.html                # Leaflet hotspot map & risk table
├── admin-login.html        # Secure staff login interface
├── admin.html              # Full administrative management dashboard
├── schema.sql              # Complete PostgreSQL schema, constraints, and RLS
├── css/
│   └── style.css           # Unified design system & responsive app layout
└── js/
    ├── app.js              # Home page logic, ward picker & dynamic WQI
    ├── water.js            # Water quality analysis & limits evaluator
    ├── complaint.js        # Photo upload & grievance submission
    ├── track.js            # Complaint status tracking & XSS sanitation
    ├── my-complaints.js    # Local complaint retrieval
    ├── map.js              # Multi-factor hotspot scoring algorithm
    ├── admin.js            # Admin dashboard logic, CRUD & CSV export
    ├── admin-login.js      # Authentication handler
    └── config.js           # Supabase client configuration
```

---

## 📊 Hotspot Scoring Algorithm

Wards accumulate points based on 30-day activity:
1. **Complaint Volume:** $\ge 10$ complaints (+2 pts), $5 - 9$ complaints (+1 pt).
2. **Rising Trend:** Recent $\ge 3$ and complaints $\ge 2\times$ previous 30-day period (+1 pt).
3. **Water Test Values:** Outside permissible limits (+2 pts), above acceptable limit (+1 pt).

* **$\ge 3$ Points:** 🔴 High Priority
* **$1 - 2$ Points:** 🟡 Attention
* **$0$ Points:** 🟢 Normal

---

## 🚀 Setup & Deployment

1. **Database:**
   * Run the queries in [`schema.sql`](schema.sql) inside your Supabase **SQL Editor**.
   * Create a public storage bucket named `complaint-photos`.
2. **Configuration:**
   * Update [`js/config.js`](js/config.js) with your project URL and public anon key.
3. **Run Locally:**
   * Open the folder in VS Code and launch with **Live Server** (`http://127.0.0.1:5500`).
   * To view on a mobile device on the same Wi-Fi, open `http://<YOUR_PC_IP>:5500`.
4. **Deploy:**
   * Host directly on **GitHub Pages** or **Vercel** with zero build configuration needed.
