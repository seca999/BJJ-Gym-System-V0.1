# 🐧 Linux Deployment Guide — Ravens BJJ Academy System

> **NOTICE:** **The following steps are for Linux.** If you are deploying on a Windows machine, please refer to the [Windows Deployment Guide](./WINDOWS_DEPLOYMENT.md).

This guide walks you through every step to deploy, run, and maintain the **Ravens BJJ Academy Management System** on Linux distributions including **Ubuntu, Debian, AlmaLinux, Rocky Linux, RHEL, CentOS, Fedora, and Arch Linux**.

---

## 📋 Table of Contents
1. [Linux System Requirements](#1-linux-system-requirements)
2. [Step 1: Update Linux Packages & Install Essentials](#step-1-update-linux-packages--install-essentials)
3. [Step 2: Install Node.js LTS (v20+ or v22+)](#step-2-install-nodejs-lts-v20-or-v22)
4. [Step 3: Clone or Copy Application Files](#step-3-clone-or-copy-application-files)
5. [Step 4: Set Proper File Permissions](#step-4-set-proper-file-permissions)
6. [Step 5: Install Project Dependencies](#step-5-install-project-dependencies)
7. [Step 6: Build the Production Application](#step-6-build-the-production-application)
8. [Step 7: Quick Verification Run (Development & Production)](#step-7-quick-verification-run)
9. [Step 8: Production Daemon Setup with PM2 (Recommended)](#step-8-production-daemon-setup-with-pm2-recommended)
10. [Step 9: Alternative Production Setup with systemd](#step-9-alternative-production-setup-with-systemd)
11. [Step 10: Configure Linux Firewall (UFW / Firewalld)](#step-10-configure-linux-firewall-ufw--firewalld)
12. [Step 11: Set Up Nginx Reverse Proxy with HTTPS / SSL (Optional)](#step-11-set-up-nginx-reverse-proxy-with-https--ssl-optional)
13. [Step 12: Stopping & Managing the Application](#step-12-stopping--managing-the-application)
14. [Step 13: Default Login Credentials](#step-13-default-login-credentials)

---

## 1. Linux System Requirements

- **Operating System**: Ubuntu 20.04/22.04/24.04 LTS, Debian 11/12, Rocky Linux 8/9, AlmaLinux 8/9, Fedora 38+, or Arch Linux.
- **CPU**: 1 core (minimum), 2+ cores (recommended).
- **RAM**: 1 GB (minimum), 2 GB+ (recommended for building).
- **Disk Space**: ~500 MB free space.
- **Network Ports**:
  - `5555` (Production Node/Express server)
  - `3000` (Optional development server)
  - `80` / `443` (Optional if using Nginx reverse proxy)

---

## Step 1: Update Linux Packages & Install Essentials

Open your Linux terminal (or connect via SSH) and update your system package repositories:

### For Ubuntu / Debian:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw
```

### For RHEL / CentOS / Rocky Linux / AlmaLinux:
```bash
sudo dnf update -y
sudo dnf install -y curl wget git gcc-c++ make firewalld
```

---

## Step 2: Install Node.js LTS (v20+ or v22+)

The application requires Node.js v20 LTS or newer.

### Recommended Method: NodeSource Binary Distributions

#### On Ubuntu / Debian:
```bash
# Download and setup NodeSource repository for Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs
```

#### On RHEL / Rocky Linux / AlmaLinux:
```bash
# Download and setup NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -

# Install Node.js
sudo dnf install -y nodejs
```

#### Verify Installation:
```bash
node -v   # Expected: v20.x.x or v22.x.x
npm -v    # Expected: 10.x.x or newer
```

---

## Step 3: Clone or Copy Application Files

Choose a standard Linux directory for production web applications, such as `/var/www/bjj-academy` or `~/bjj-academy`.

### Option A: Using Git
```bash
# Create directory and clone repository
sudo mkdir -p /var/www/bjj-academy
sudo chown -R $USER:$USER /var/www/bjj-academy
git clone https://github.com/YOUR_ORGANIZATION/YOUR_REPO.git /var/www/bjj-academy
cd /var/www/bjj-academy
```

### Option B: Copying from ZIP or Flash Drive
```bash
# Extract your project archive
unzip Ravens-BJJ-Academy.zip -d /var/www/bjj-academy
cd /var/www/bjj-academy
```

---

## Step 4: Set Proper File Permissions

Ensure your current user owns the application directory and scripts have execute permissions:

```bash
# Ensure current user ownership
sudo chown -R $USER:$USER /var/www/bjj-academy

# Make scripts executable
chmod +x /var/www/bjj-academy/*.sh 2>/dev/null || true
```

---

## Step 5: Install Project Dependencies

Run `npm install` inside the project root directory:

```bash
cd /var/www/bjj-academy
npm install
```

*(This installs React, Vite, Express, Lucide icons, Tailwind CSS, and all necessary build tools).*

---

## Step 6: Build the Production Application

Compile the client bundle and build the server bundle:

```bash
npm run build
```

This generates:
- `dist/`: The optimized client-side SPA (HTML, CSS, JS bundles).
- `dist/server.cjs`: The compiled production Express backend.

---

## Step 7: Quick Verification Run

### A. Test Production Server
Run the production server to verify everything works:

```bash
npm start
```
You should see:
```text
BJJ Academy Local Server running on http://localhost:5555
```
Open a browser on your Linux desktop or navigate from a local network machine to:
`http://<YOUR_LINUX_IP>:5555`

*(Press `Ctrl + C` in the terminal to stop the test run).*

### B. Quick Development Mode (Optional)
If you want to run the live reload Vite dev server:
```bash
npm run dev
```
Available at `http://localhost:3000`.

---

## Step 8: Production Daemon Setup with PM2 (Recommended)

To ensure the application runs continuously in the background, automatically restarts if it crashes, and boots automatically upon Linux system reboots, use **PM2**:

### 1. Install PM2 globally:
```bash
sudo npm install -g pm2
```

### 2. Start the application:
```bash
cd /var/www/bjj-academy
pm2 start dist/server.cjs --name "bjj-academy" --env PORT=5555
```

### 3. Check status:
```bash
pm2 status
pm2 logs bjj-academy --lines 20
```

### 4. Enable automatic start on Linux system reboot:
```bash
# Generate and configure startup script
pm2 startup

# Follow any command instructions printed by PM2 (e.g., sudo env PATH=... pm2 startup systemd -u youruser)
pm2 save
```

Now, even if your Linux server reboots, the BJJ Academy system will start automatically.

---

## Step 9: Alternative Production Setup with systemd

If you prefer native Linux **systemd** service management without PM2:

### 1. Create a systemd service file:
```bash
sudo nano /etc/systemd/system/bjj-academy.service
```

### 2. Paste the following configuration:
*(Replace `YOUR_LINUX_USERNAME` with your actual Linux user, e.g., `ubuntu` or `bjjadmin`)*:

```ini
[Unit]
Description=Ravens BJJ Academy Management System
After=network.target

[Service]
Type=simple
User=YOUR_LINUX_USERNAME
WorkingDirectory=/var/www/bjj-academy
ExecStart=/usr/bin/node /var/www/bjj-academy/dist/server.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=5555

[Install]
WantedBy=multi-user.target
```

### 3. Reload systemd, enable, and start the service:
```bash
# Reload daemon
sudo systemctl daemon-reload

# Enable service on boot
sudo systemctl enable bjj-academy

# Start service
sudo systemctl start bjj-academy

# Check status
sudo systemctl status bjj-academy
```

---

## Step 10: Configure Linux Firewall (UFW / Firewalld)

Allow incoming traffic on port `5555` so front desk tablets, coach laptops, and students on the gym Wi-Fi can access the system.

### If using UFW (Ubuntu / Debian):
```bash
# Allow application port 5555
sudo ufw allow 5555/tcp comment "BJJ Academy System"

# Allow SSH to avoid locking yourself out
sudo ufw allow ssh

# Enable firewall (if not already enabled)
sudo ufw enable
sudo ufw status
```

### If using Firewalld (Rocky / AlmaLinux / RHEL):
```bash
sudo firewall-cmd --permanent --add-port=5555/tcp
sudo firewall-cmd --reload
```

---

## Step 11: Set Up Nginx Reverse Proxy with HTTPS / SSL (Optional)

If you want to host on standard port `80` (HTTP) or `443` (HTTPS with SSL domain name):

### 1. Install Nginx:
```bash
# Ubuntu / Debian
sudo apt install -y nginx

# RHEL / Rocky / AlmaLinux
sudo dnf install -y nginx
sudo systemctl enable --now nginx
```

### 2. Create Nginx site configuration:
```bash
sudo nano /etc/nginx/sites-available/bjj-academy
```

Add:
```nginx
server {
    listen 80;
    server_name bjj.yourdomain.com; # Or your server's IP address

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5555;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/bjj-academy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Add Free SSL Certificate with Let's Encrypt Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d bjj.yourdomain.com
```

---

## Step 12: Stopping & Managing the Application

### Using Linux Helper Scripts:
We provide Linux helper shell scripts in the root directory:
- `./start_app.sh` : Starts server on port 5555 and launches browser.
- `./stop_and_cleanup.sh` : Frees port 5555 and safely terminates background Node.js processes.

### If running via PM2:
```bash
pm2 restart bjj-academy   # Restart
pm2 stop bjj-academy      # Stop
pm2 logs bjj-academy      # View logs
```

### If running via systemd:
```bash
sudo systemctl restart bjj-academy   # Restart
sudo systemctl stop bjj-academy      # Stop
journalctl -u bjj-academy -f         # View live logs
```

---

## Step 13: Default Login Credentials

Once deployed and running, open your web browser and sign in:

| Role | Username | Default Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Academy Admin** | `admin` | `admin123` | Full administrative control, system settings, financials, branding |
| **Head Coach** | `coach` | `coach123` | Matboard, class attendance, promotions tracker, member ranks |
| **Front Desk Staff** | `staff` | `staff123` | Check-in kiosk, student lookups, pro shop sales, waiver verification |

---

> ℹ️ **Need Windows Instructions?** Please see the companion guide: [Windows Deployment Guide](./WINDOWS_DEPLOYMENT.md).
