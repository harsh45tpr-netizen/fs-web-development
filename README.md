# SKY & SEA — Private Jets & Superyachts Charter Platform

> **Pinnacle of Private Aviation & Maritime Luxury**  
> Workspace containing two distinct, world-class implementations:
> 1. **`pro-1`**: HTML + CSS + React.js + Local Dummy JSON Database
> 2. **`pro-2`**: Fullstack MERN (HTML + CSS + JS + React.js + Node/Express.js + MongoDB Database)

---

## 📁 Project 1: `pro-1` — React.js + Dummy JSON DB
**A lightweight, standalone React application powered by a local dummy JSON database.**

- **Tech Stack**:
  - **Structure & Layout**: HTML5, React 18 (Vite)
  - **Styling**: Vanilla CSS3 Luxury Design System (Obsidian night, warm amber gold, glassmorphism)
  - **Database**: Local Dummy JSON Database (`src/data/fleet.json`, `src/data/destinations.json`, `src/data/inquiries.json`) with `localStorage` persistence
- **Key Features**:
  - 12 curated 8K luxury assets (jets, superyachts, destinations)
  - Interactive Charter Booking Widget (From, To, Date, Guests, instant pricing quote)
  - Full specifications modal for Gulfstream G700, Bombardier Global 7500, Dassault Falcon 8X, Lürssen Eclipse, Feadship Savannah, and Royal Huisman Athena
  - VIP Concierge Inquiry modal (saves directly to dummy DB)
  - Real-time **Inquiries Drawer** (review, mark handled, or dismiss bookings)
  - 1-click **Reset DB** button to restore initial seed data
- **Quickstart**:
  ```bash
  cd pro-1
  npm run dev
  ```
  Runs at: [http://localhost:5173](http://localhost:5173)

---

## 📁 Project 2: `pro-2` — Fullstack MERN (React + Express + MongoDB)
**A complete, production-grade fullstack application with backend REST API and MongoDB/Mongoose.**

- **Tech Stack**:
  - **Frontend (`pro-2/client`)**: React 18 (Vite), Vanilla CSS3 Design System, REST API service client with automatic reverse proxy
  - **Backend (`pro-2/server`)**: Node.js, Express.js REST API with CORS and JSON body-parser
  - **Database**: MongoDB via Mongoose ORM
  - **Zero-Crash Resilience**: Intelligent in-memory database fallback that automatically activates if the local MongoDB daemon is not running during a college practical exam or viva
- **Key Features**:
  - Real-time communication with Express REST API:
    - `GET /api/fleet` — query private jets & superyachts
    - `GET /api/destinations` — query luxury destinations
    - `POST /api/inquiries` — create bookings in MongoDB
    - `GET /api/inquiries` — live administrative inquiry drawer
    - `DELETE /api/inquiries/:id` — delete records from MongoDB
    - `POST /api/seed` — reset collection to default seed state
  - Real-time Database connection badge in navbar (`MongoDB Live` 🟢 vs `In-Memory DB` 🟡)
- **Quickstart**:
  1. **Terminal 1 (Backend Server)**:
     ```bash
     cd pro-2/server
     npm start
     ```
     Runs at: [http://localhost:5000](http://localhost:5000)

  2. **Terminal 2 (Frontend Client)**:
     ```bash
     cd pro-2/client
     npm run dev
     ```
     Runs at: [http://localhost:5174](http://localhost:5174)

---

## 💎 Comparison Summary

| Feature | `pro-1` (Dummy JSON DB) | `pro-2` (Fullstack MERN) |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vanilla CSS | React 18 + Vanilla CSS |
| **Backend** | None (Client-side JSON) | Node.js + Express.js API |
| **Database** | `fleet.json` + `localStorage` | MongoDB + Mongoose Schema |
| **Ports** | `5173` | `5000` (Backend) & `5174` (Client) |
| **Offline Safety**| 100% Standalone (zero DB needed) | Auto In-Memory Fallback if MongoDB is down |
| **Use Case** | Quick Viva / Front-End Demo | Full Stack Lab Internals Examination |

