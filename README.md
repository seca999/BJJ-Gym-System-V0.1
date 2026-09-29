# 🦅 Ravens BJJ Academy Management System — Master Deployment Guide

A production-ready Brazilian Jiu-Jitsu Academy Operations and Mat Management Platform for **Ravens BJJ Academy**. Designed for gym owners, head coaches, and desk staff.

---

## 🧭 Deployment Navigation

Detailed documentation has been separated into dedicated guides in the [`readme/`](./readme/) folder:

- 🐧 **[Dedicated Linux Deployment Guide (`readme/LINUX_DEPLOYMENT.md`)](./readme/LINUX_DEPLOYMENT.md)**
- 🪟 **[Dedicated Windows Deployment Guide (`readme/WINDOWS_DEPLOYMENT.md`)](./readme/WINDOWS_DEPLOYMENT.md)**
- 📂 **[Deployment Hub Overview (`readme/README.md`)](./readme/README.md)**

Below are the complete, step-by-step instructions for both operating systems.

---

# 🐧 PART 1: LINUX DEPLOYMENT

> ### 📢 Notice: The following steps are for Linux.
> *(If you are deploying on Windows, scroll down to [Part 2: Windows Deployment](#-part-2-windows-deployment) or read [readme/WINDOWS_DEPLOYMENT.md](./readme/WINDOWS_DEPLOYMENT.md)).*

Follow this exact step-by-step procedure to deploy the system on **Ubuntu, Debian, AlmaLinux, Rocky Linux, RHEL, CentOS, Fedora, or Arch Linux**.

### Linux Step 1: System Requirements & Package Updates
Open your Linux terminal (or SSH into your server):

```bash
# On Ubuntu / Debian:
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw

# On RHEL / Rocky Linux / AlmaLinux / CentOS:
sudo dnf update -y
sudo dnf install -y curl wget git gcc-c++ make firewalld
```

### Linux Step 2: Install Node.js LTS (v20+ or v22+)
The system requires Node.js LTS. Install via the official NodeSource repository:

```bash
# Ubuntu / Debian:
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# RHEL / Rocky / AlmaLinux:
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation:
node -v   # Expected v20+ or v22+
npm -v    # Expected 10+
```

### Linux Step 3: Setup Project Directory
```bash
# Create application directory
sudo mkdir -p /var/www/bjj-academy
sudo chown -R $USER:$USER /var/www/bjj-academy

# Clone repo or copy your project files
git clone https://github.com/YOUR_ORGANIZATION/YOUR_REPO.git /var/www/bjj-academy
cd /var/www/bjj-academy

# Make helper scripts executable
chmod +x *.sh 2>/dev/null || true
```

### Linux Step 4: Install Dependencies
```bash
cd /var/www/bjj-academy
npm install
```

### Linux Step 5: Build the Production Application
```bash
npm run build
```
This builds both the client SPA in `dist/` and the backend Express bundle in `dist/server.cjs`.

### Linux Step 6: Test Run the Server
```bash
# Launch production server:
npm start

# Or launch development server:
npm run dev
```
Verify the server starts on `http://localhost:5555` (or port `3000` for dev). Press `Ctrl + C` to stop.

### Linux Step 7: Continuous Production Daemon (PM2)
To keep the application running 24/7 and auto-restart on system reboot:

```bash
# 1. Install PM2 globally
sudo npm install -g pm2

# 2. Start the application daemon
pm2 start dist/server.cjs --name "bjj-academy" --env PORT=5555

# 3. Configure PM2 to launch on Linux boot
pm2 startup
# (Run the sudo env PATH=... command printed on screen by PM2)
pm2 save
```

### Linux Step 8: Configure Linux Firewall
Allow incoming connections on port `5555` from local gym Wi-Fi / devices:

```bash
# Ubuntu / Debian (UFW):
sudo ufw allow 5555/tcp comment "BJJ Academy Server"
sudo ufw allow ssh
sudo ufw enable

# RHEL / Rocky / AlmaLinux (Firewalld):
sudo firewall-cmd --permanent --add-port=5555/tcp
sudo firewall-cmd --reload
```

### Linux Step 9: Access from Any Device
Find your server's local IP address with `ip addr show` or `hostname -I`.
From any tablet, phone, or computer on the gym network, open:
`http://<YOUR_LINUX_IP>:5555`

---

# 🪟 PART 2: WINDOWS DEPLOYMENT

> ### 📢 Notice: The following steps are for Windows.
> *(If you are deploying on Linux, scroll up to [Part 1: Linux Deployment](#-part-1-linux-deployment) or read [readme/LINUX_DEPLOYMENT.md](./readme/LINUX_DEPLOYMENT.md)).*

Follow this exact step-by-step procedure to deploy the system on **Windows 10, Windows 11, or Windows Server (2016/2019/2022/2025)**.

### Windows Step 1: Install Node.js LTS
1. Open your web browser on Windows and visit [https://nodejs.org/](https://nodejs.org/).
2. Download the **LTS (Long Term Support)** `.msi` Windows x64 installer (Node 20 or Node 22).
3. Run the downloaded installer. Keep default settings, ensuring the **"Add to PATH"** checkbox is selected.
4. Open **Command Prompt (`cmd`)** and verify:
   ```cmd
   node -v
   npm -v
   ```

### Windows Step 2: Set Up Application Folder
Place or extract the project files into a directory on drive `C:\` (recommended: `C:\BJJ Academy\Code`):

```cmd
:: Create directory and navigate into it
mkdir "C:\BJJ Academy\Code"
cd "C:\BJJ Academy\Code"
```
*(Copy or extract your project files into this directory)*.

### Windows Step 3: Install Dependencies
Open Command Prompt or PowerShell inside `C:\BJJ Academy\Code`:

```cmd
npm install
```

### Windows Step 4: Build the Production Application
```cmd
npm run build
```
This compiles the client web app into `dist/` and the server into `dist/server.cjs`.

### Windows Step 5: Start the Production Server
```cmd
npm start
```
The server will start on port `5555`:
```text
BJJ Academy Local Server running on http://localhost:5555
```
Open your browser at **`http://localhost:5555`**.

### Windows Step 6: One-Click Automated Launch via Batch Files
You can skip manual command line entry by double-clicking the included batch files in File Explorer:
- **`start_app.bat`**: Starts the application silently in the background (no open CMD window), automatically installs dependencies if missing, frees port 5555, and opens the browser at `http://localhost:5555`.
- **`stop_app.bat`**: Safely stops the background application server and frees port 5555 while keeping all database records intact.

### Windows Step 7: Configure Windows Defender Firewall (For Tablet / Local Network Access)
To allow tablets, front desk check-in iPads, and coach laptops on the gym Wi-Fi to access the system:

1. Right-click the Windows Start menu and select **Terminal (Admin)** or **Windows PowerShell (Admin)**.
2. Run this command:
   ```powershell
   New-NetFirewallRule -DisplayName "BJJ Academy System (Port 5555)" -Direction Inbound -LocalPort 5555 -Protocol TCP -Action Allow
   ```
3. Type `ipconfig` to find your Windows PC's local IPv4 address (e.g., `192.168.1.150`).
4. Other devices on the same Wi-Fi can now connect via:
   `http://192.168.1.150:5555`

### Windows Step 8: Auto-Start on Windows Boot (Task Scheduler)
To have the application start automatically when the computer turns on:
1. Press `Win + R`, type `taskschd.msc`, and press Enter.
2. Click **Create Basic Task...** in the right menu.
3. Task Name: `Ravens BJJ Academy Auto-Start`.
4. Trigger: Choose **When the computer starts** or **When I log on**.
5. Action: Choose **Start a program**.
6. Program/script: Browse and select `C:\BJJ Academy\Code\start_app.bat`.
7. Start in: `C:\BJJ Academy\Code\`.
8. Check **Run with highest privileges** in properties and click **Finish**.

---

## 🔑 Default Login Credentials (All Platforms)

| Account | Username | Password | Intended Role |
| :--- | :--- | :--- | :--- |
| **Academy Admin** | `admin` | `admin123` | Full access: Settings, Financials, Pro Shop, Belt Criteria |
| **Head Coach** | `coach` | `coach123` | Class Matboard, Attendance, Member Belt Promotions |
| **Front Desk Staff** | `staff` | `staff123` | Student Check-in Kiosk, Waivers, Membership Lookups |

---

## 📦 Database & Auto-Seeding
- The application automatically initializes and maintains the embedded database in `src/data/academy_database.json` and SQLite database in `database/bjj_master.db`.
- When deployed on any fresh Linux or Windows machine, the app will automatically seed the initial master database with members, rank structures, schedules, and pro shop inventory.

---

## 📁 Summary of Deployment Files

```text
├── readme/
│   ├── README.md               # Deployment Hub overview
│   ├── LINUX_DEPLOYMENT.md     # 🐧 Dedicated, step-by-step Linux deployment guide
│   └── WINDOWS_DEPLOYMENT.md   # 🪟 Dedicated, step-by-step Windows deployment guide
├── README.md                   # This master documentation file
├── start_app.bat               # Windows background runner (no CMD window)
├── stop_app.bat                # Windows background stop tool
├── start_app.sh                # Linux quick-starter script
├── stop_and_cleanup.sh         # Linux cleanup tool
└── deploy_and_run.sh           # Linux automated deployer
```
