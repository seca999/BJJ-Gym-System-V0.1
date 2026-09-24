# 📌 Version & Release Tracker

This directory tracks the GitHub release state and deployment version of **Arte Suave BJJ Academy System**.

## 📄 File Overview

- **`version.json`**: Machine-readable JSON metadata containing the current release version, build number, timestamp, and changelog.
- **`RELEASE_NOTES.md`**: Human-readable release summary for Git tags and GitHub releases.

---

## 🔄 How to Bump the Version After Making Changes

Before pushing a new release to GitHub:

1. Open `version/version.json`.
2. Update the `"version"` field (e.g., `"1.2.1-patch"` or `"1.3.0"`) and update `"buildNumber"`.
3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Bump version to v1.2.1"
   git push origin main
   ```
4. Check the application UI header or **System Settings > Database** on any device to confirm that your new version is deployed!
