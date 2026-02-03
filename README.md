# Illthorn (Rewrite)

> **⚠️ ALERT:** This project is a **Ground-Up Rewrite** of the original [Illthorn](https://github.com/elanthia-online/illthorn) client.
> All credit for the original UI design, aesthetic, and protocol research belongs to the **Elanthia Online** team and the **VellumFE** project.

A modern, cross-platform game client for **GemStone IV**, built with **Tauri**, **Rust**, and **Vue 3**.

## Credits & Attribution

This project exists only because of the open-source contributions of the GemStone IV community:

*   **Original Illthorn Client**: Created by [Elanthia Online](https://github.com/elanthia-online). This rewrite attempts to recreate their beautiful UI in a native application format.
*   **VellumFE**: The protocol documentation from [VellumFE](https://github.com/elanthia-online/VellumFE) was essential for parsing the game stream.
*   **Lich**: The backbone of the GSIV scripting community.

---

## Overview

This project aims to provide a high-performance, native-feeling experience while retaining the highly praised aesthetic of the original Illthorn.

By leveraging **Rust** for the backend (via Tauri), we achieve minimal resource usage and robust networking updates. The frontend uses **Vue 3** and **TypeScript** to render the game streams.

## Features

- **High Performance**: Native Rust backend for socket management and parsing.
- **Cross-Platform**: Runs on Windows, macOS, and Linux.
- **Auto-Connect**: Automatically detects active Lich sessions and connects.
- **Comprehensive Stream Support**:
  - Dedicated windows for **Room**, **Thoughts**, **Deaths**, **Arrivals**, **Loot**, **Bounty**, **Society**, **Speech**, etc.
  - Prevents "Room Spam" by routing room objects to a dedicated panel.
- **Active Spell Tracking**: Real-time display of active spells and effects.
- **Power User Tools (New!)**:
  - **Aliases**: Create custom command shortcuts (`#alias set k kill`).
  - **Macros**: Bind commands to Function keys and Numpad (`#macro set F1 attack`).
  - **Highlights**: Colorize important text patterns (`#highlight add kobold red`).
  - **Status Indicators**: Visual icons for Stunned, Prone, Bleeding, etc.
  - **Visual Timers**: RoundTime and CastTime progress bars.
- **Modern UI**: Dark mode, customizable panels, and familiar layout.


## 📋 Prerequisites (For Players)

To use Illthorn, you essentially need two things: **Lich** (running the game) and **Illthorn** (showing the game).

1.  **Lich Installed**: You must have a working installation of Lich 5.
    *   *Need help?* See the [Lich Installation Guide](https://gswiki.play.net/Lich:_Software).
2.  **Microsoft WebView2**: (Standard on Windows 10/11).
    *   If the app immediately crashes or is blank, download the [Evergreen Bootstrapper](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## 🚀 How to Play

Illthorn acts as a modern screen for Lich. You need to start Lich in "Headless Mode" (no window) so Illthorn can take over.

### Step 1: Start Lich (Headless)

**The Easy Way (Windows Shortcut):**
1.  Find your `lich.rbw` file (in your Lich folder).
2.  Right-click it and choose **Create Shortcut**.
3.  Right-click the new shortcut and select **Properties**.
4.  In the **Target** field, add the following to the very end of the line (after the quotes):
    ```text
    --login CHARACTER_NAME --without-frontend --detachable-client=11024
    ```
    *(Replace `CHARACTER_NAME` with your actual character's name)*
5.  **Run this shortcut**. You won't see a game window, but Lich is now running in the background!
    *   **Note for Lich 5.13+**: If upgrading, you may see an error about "Conversion Needed". Run `ruby lich.rbw --convert-entries standard` in your Lich folder to migrate your data.

### Step 1.5: Headless Account Setup (New!)
If you haven't saved your character yet and don't have a GUI:
```powershell
# In your Lich folder:
ruby lich.rbw --add-account <ACCOUNT> <PASSWORD> --frontend stormfront
ruby lich.rbw --login <CHARACTER> --save --without-frontend --detachable-client=11024
```

### Step 2: Launch Illthorn
1.  Run **Illthorn**.
2.  It will automatically find your running Lich session and connect.
3.  Enjoy the modern UI!

## Installation
**Download the latest release from the [Releases Page](https://github.com/Buckwheet/illthorn-rewrite/releases).**

### Windows
1. Download the `.msi` or `.exe` installer.
2. Run the installer (you may need to bypass SmartScreen if valid certificate is pending).
3. The app will launch automatically.

### Linux
1. Download the `.AppImage` or `.deb` file.
2. For AppImage: `chmod +x Illthorn*.AppImage && ./Illthorn*.AppImage`
3. For Deb: `sudo dpkg -i Illthorn*.deb`

## Development

### Prerequisites

To build Illthorn from source, you need to set up your development environment.

#### 🪟 Windows Development Setup
1.  **Install Visual Studio C++ Build Tools**:
    *   Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
    *   **Crucial**: During installation, ensure you select the **"Desktop development with C++"** workload.
    *   This provides the MSVC compiler and linker required by Rust.

2.  **Install Rust**:
    *   Download and run [rustup-init.exe](https://win.rustup.rs/).
    *   Proceed with the default installation (it will detect the C++ tools from step 1).

3.  **Install Node.js**:
    *   Download the [LTS version](https://nodejs.org/) (v18 or higher).

#### 🐧 Linux Development Setup
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

#### 🍎 macOS Development Setup
```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

### Setup
```bash
# Install dependencies
npm install

# Run in Development Mode
npm run tauri dev

# Build for Production
npm run tauri build
```
