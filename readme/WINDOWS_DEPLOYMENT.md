# 🪟 Windows Deployment Guide — Ravens BJJ Academy System

> **NOTICE:** **The following steps are for Windows.** If you are deploying on a Linux machine, please refer to the [Linux Deployment Guide](./LINUX_DEPLOYMENT.md).

This guide walks you through every step to deploy, run, and maintain the **Ravens BJJ Academy Management System** on Windows machines, including **Windows 10, Windows 11, Windows Server 2019, Windows Server 2022, and Windows Server 2025**.

---

## 📋 Table of Contents
1. [Windows Prerequisites](#1-windows-prerequisites)
2. [Step 1: Install Node.js LTS for Windows](#step-1-install-nodejs-lts-for-windows)
3. [Step 2: Place or Clone the Project Directory](#step-2-place-or-clone-the-project-directory)
4. [Step 3: Open Command Prompt or PowerShell](#step-3-open-command-prompt-or-powershell)
5. [Step 4: Install Dependencies](#step-4-install-dependencies)
6. [Step 5: Build the Production Application](#step-5-build-the-production-application)
7. [Step 6: Launch the Production Server](#step-6-launch-the-production-server)
8. [Step 7: Automated 1-Click Deployment with Batch Scripts](#step-7-automated-1-click-deployment-with-batch-scripts)
9. [Step 8: Configure Windows Defender Firewall (For Local Network / Tablet Access)](#step-8-configure-windows-defender-firewall)
10. [Step 9: Auto-Start on Windows Boot (Task Scheduler or PM2)](#step-9-auto-start-on-windows-boot)
11. [Step 10: Multi-Device Deployment (Laptops, Front Desk PCs)](#step-10-multi-device-deployment)
12. [Step 11: Windows Batch Utilities Reference](#step-11-windows-batch-utilities-reference)
13. [Step 12: Default Login Credentials](#step-12-default-login-credentials)

---

## 1. Windows Prerequisites

Before starting, ensure your Windows machine meets these requirements:
- **Operating System**: Windows 10 (64-bit), Windows 11 (64-bit), or Windows Server 2016/2019/2022/2025.
- **Node.js LTS**: v20 or v22 LTS (Download installer from [https://nodejs.org](https://nodejs.org)).
- **Git for Windows** *(Optional, recommended)*: Download from [https://git-scm.com/download/win](https://git-scm.com/download/win).
- **RAM**: Minimum 2 GB (4 GB recommended).
- **Hard Drive Space**: 1 GB available storage.

---

## Step 1: Install Node.js LTS for Windows

1. Visit [https://nodejs.org/](https://nodejs.org/) and download the **LTS (Long Term Support)** `.msi` Windows installer (e.g., v20.x or v22.x 64-bit).
2. Run the `.msi` installer.
3. Accept the license agreement, leave the default installation path (`C:\Program Files\nodejs\`), and ensure **"Add to PATH"** is checked.
4. Complete the installer.
5. Verify the installation by pressing `Win + R`, typing `cmd`, and hitting Enter:
   ```cmd
   node -v
   npm -v
   ```
   Both commands should output version numbers without errors.

---

## Step 2: Place or Clone the Project Directory

You can organize the application in any directory. The recommended standard path is:
`C:\BJJ Academy\Code`

### Option A: Extract from ZIP
1. Download or transfer your `Ravens-BJJ-Academy.zip` file.
2. Extract the contents to `C:\BJJ Academy\Code` (or your preferred folder, e.g. `C:\Users\YourUser\Documents\Ravens-BJJ-System`).

### Option B: Clone via Git
Open Command Prompt:
```cmd
mkdir "C:\BJJ Academy"
cd "C:\BJJ Academy"
git clone https://github.com/YOUR_ORGANIZATION/YOUR_REPO.git Code
cd Code
```

---

## Step 3: Open Command Prompt or PowerShell

1. Navigate to the project directory:
   ```cmd
   cd "C:\BJJ Academy\Code"
   ```
2. Verify you see `package.json`, `server.ts`, `vite.config.ts`, and `src/`:
   ```cmd
   dir
   ```

---

## Step 4: Install Dependencies

In Command Prompt or PowerShell, run:

```cmd
npm install
```

This installs all dependencies (React 19, Tailwind CSS, Vite, Express, Lucide React, Confetti, and PDF generator).

---

## Step 5: Build the Production Application

Compile the client SPA and the Node.js production server bundle:

```cmd
npm run build
```

This command will:
1. Run Vite build to create the optimized production web assets inside `dist/`.
2. Bundle `server.ts` into a standalone Node backend at `dist/server.cjs`.

---

## Step 6: Launch the Production Server

Start the production server:

```cmd
npm start
```

You will see:
```text
BJJ Academy Local Server running on http://localhost:5555
```

Open Google Chrome, Microsoft Edge, or Firefox and go to:
**`http://localhost:5555`**

*(To run in development mode with hot-reloading instead: `npm run dev` at `http://localhost:3000`)*.

---

## Step 7: Automated 1-Click Launch with Batch Scripts

For non-technical staff or quick deployment, the project includes 2 pre-configured Windows batch files:

### Background Launch (`start_app.bat`):
1. Navigate to your project folder in Windows File Explorer.
2. Double-click **`start_app.bat`**.
3. It runs silently in the background (no open CMD window), automatically checks/installs dependencies, frees port 5555, and opens your browser at `http://localhost:5555`!

### Stop Server (`stop_app.bat`):
1. Double-click **`stop_app.bat`**.
2. It safely stops the background Node server and frees port 5555 while keeping all database records intact.

---

## Step 8: Configure Windows Defender Firewall

If you want front desk tablets, iPads, or other PCs connected to the gym's Wi-Fi router to access the system:

1. Open **PowerShell as Administrator** (Right-click Start > Terminal / PowerShell (Admin)).
2. Run this command to open port 5555:
   ```powershell
   New-NetFirewallRule -DisplayName "BJJ Academy System (Port 5555)" -Direction Inbound -LocalPort 5555 -Protocol TCP -Action Allow
   ```
3. Find your Windows PC's local IP address:
   ```cmd
   ipconfig
   ```
   *(Look for `IPv4 Address`, e.g., `192.168.1.150`)*.
4. From any tablet, iPad, or laptop on the gym Wi-Fi, open the browser and navigate to:
   `http://192.168.1.150:5555`

---

## Step 9: Auto-Start on Windows Boot

### Option A: Windows Task Scheduler (Recommended for Windows Desktops)
1. Press `Win + R`, type `taskschd.msc`, and press Enter.
2. Click **Create Basic Task...** in the right pane.
3. Name it: `Start Ravens BJJ Academy`.
4. Trigger: Select **When the computer starts** or **When I log on**.
5. Action: Select **Start a program**.
6. Program/script: Browse to `C:\BJJ Academy\Code\start_app.bat`.
7. Start in: `C:\BJJ Academy\Code\`.
8. Check **Open the Properties dialog** and check **Run with highest privileges**.
9. Click **Finish**.

### Option B: PM2 on Windows
```cmd
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
pm2 start dist/server.cjs --name "bjj-academy" --env PORT=5555
pm2 save
```

---

## Step 10: Multi-Device Deployment

To deploy this application onto a second Windows laptop (e.g., front desk check-in kiosk):
1. Install Node.js on the second laptop.
2. Copy the project folder over USB or network share.
3. Double-click `start_app.bat`.
4. The system boots immediately with automatic seeding of sample members, belt progression criteria, and class schedules!

---

## Step 11: Windows Batch Utilities Reference

| Batch File | Function |
| :--- | :--- |
| **`start_app.bat`** | Launches server in the background (no open CMD window), frees port 5555, and opens browser |
| **`stop_app.bat`** | Safely terminates the background server process and frees port 5555 |

---

## Step 12: Default Login Credentials

| Role | Username | Default Password | Features Available |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full admin dashboard, academy settings, pro shop management, financials |
| **Head Coach** | `coach` | `coach123` | Class management, attendance tracker, promotion eligibility, belt stripes |
| **Front Desk Staff** | `staff` | `staff123` | Student check-in kiosk, waiver verification, membership lookups |

---

> ℹ️ **Need Linux Instructions?** Please see the companion guide: [Linux Deployment Guide](./LINUX_DEPLOYMENT.md).
