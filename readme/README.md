# 🥋 Ravens BJJ Academy Management System — Deployment Hub

Welcome to the official deployment documentation for the **Ravens BJJ Academy Management System**.

This folder contains dedicated, separated step-by-step guides tailored specifically for **Linux** and **Windows** operating environments.

---

## 📌 Select Your Operating System

| Target Operating System | Deployment Guide | Primary Tools |
| :--- | :--- | :--- |
| 🐧 **Linux** (Ubuntu, Debian, RHEL, CentOS, Rocky, Arch) | [**👉 Linux Deployment Guide (readme/LINUX_DEPLOYMENT.md)**](./LINUX_DEPLOYMENT.md) | Node.js LTS, PM2 / systemd, Nginx, UFW / firewalld |
| 🪟 **Windows** (Windows 10, 11, Windows Server 2019/2022/2025) | [**👉 Windows Deployment Guide (readme/WINDOWS_DEPLOYMENT.md)**](./WINDOWS_DEPLOYMENT.md) | Node.js LTS (.msi), PowerShell / CMD, Batch scripts (`.bat`), Task Scheduler |

---

## 🎯 Quick Overview

- **Default Port**: `5555` for production server (`dist/server.cjs`), `3000` for development server (`vite`).
- **Database**: Local embedded canonical SQLite/JSON database (`database/bjj_master.db`, `src/data/academy_database.json`) with auto-seeding.
- **Default Accounts**:
  - **Admin**: `admin` / `admin123`
  - **Head Coach**: `coach` / `coach123`
  - **Desk Staff**: `staff` / `staff123`

---

## 📂 Documentation Structure

```text
├── readme/
│   ├── README.md               # This deployment hub overview
│   ├── LINUX_DEPLOYMENT.md     # 🐧 Dedicated, step-by-step Linux deployment guide
│   └── WINDOWS_DEPLOYMENT.md   # 🪟 Dedicated, step-by-step Windows deployment guide
├── README.md                   # Complete root documentation with separated sections
├── start_app.bat               # Windows quick-starter script
├── deploy_and_run.bat          # Windows automated deployer
├── stop_and_cleanup.bat        # Windows cleanup tool
├── health_check.bat            # Windows database checker
├── start_app.sh                # Linux quick-starter script
├── stop_and_cleanup.sh         # Linux cleanup tool
└── deploy_and_run.sh           # Linux automated deployer
```
