# 🦅 Ravens BJJ Academy Management System

A production-ready Brazilian Jiu-Jitsu Academy Operations and Mat Management Platform for **Ravens BJJ Academy**. Designed for gym owners, head coaches, and desk staff to manage students, IBJJF age & belt promotion pathways, matboard schedules, tuition packages, and attendance check-ins.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- Git installed on your system

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```
Open your browser at **`http://localhost:3000`**.

### 3. Build & Run Full Production App
```bash
npm run build
npm start
```
The production server will run at **`http://localhost:5555`** (or `http://localhost:3000` in dev mode).

---

## 📤 How to Push to Your GitHub Repository

To push this application to your GitHub repository:

```bash
# 1. Initialize Git repository (if not already initialized)
git init

# 2. Add all files
git add .

# 3. Commit changes
git commit -m "Ravens BJJ Academy Management System with embedded testing database"

# 4. Rename default branch to main
git branch -M main

# 5. Connect to your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 💻 Deploying to Another Device / Computer

To deploy and run **Ravens BJJ Academy System** on another laptop or desktop:

1. **Clone the repository on the new device**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   cd YOUR_REPOSITORY
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm run dev
   ```
   *or* for production mode:
   ```bash
   npm run build
   npm start
   ```

### 📦 Pre-loaded Dummy Testing Database
- The application includes the **pre-seeded testing database** stored in `src/data/academy_database.json`.
- When launched on any new device or browser for the first time, the application **automatically seeds** all students, coaches, payments, attendance records, subscription plans, matboard time slots, and Ravens branding out-of-the-box.
- You can also export or restore full database backups anytime from **System Settings > Database & Backups** (JSON backup file or SQLite/SQL export).

---

## 🗂️ Project Structure

```
├── src/
│   ├── components/         # React Views (Matboard, Check-in, Members, Payments, Promotions)
│   ├── data/               # Canonical testing database (academy_database.json)
│   ├── types.ts            # IBJJF belts, members, classes & system types
│   ├── utils/              # IBJJF age transition engine, storage & database manager
│   └── App.tsx             # Main Application Shell
├── version/                # Version tracking for GitHub releases (version.json)
├── database/               # Local database storage directory
├── public/                 # Static assets & public database mirrors
├── server.ts               # Production Express API server
├── package.json            # Project dependencies & npm scripts
└── README.md               # Deployment guide
```

---

## 🔑 Default Login Credentials

- **Admin Account**: `admin` / `admin123`
- **Head Coach Account**: `coach` / `coach123`
- **Desk Staff Account**: `staff` / `staff123`

---

## 🛡️ License & Credits
Built for **Ravens BJJ Academy** — IBJJF Compliant Belt & Age Division Management.
