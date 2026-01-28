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
- **Modern UI**: Dark mode, customizable panels, and familiar layout.


## Prerequisites
*   **Lich**: You must have Lich installed and running for GemStone IV.
*   **Headless Client**: Illthorn connects to Lich as a frontend. Run Lich in headless mode:
    ```bash
    # Standard Lich (Ruby)
    ruby lich.rb --login <CharacterName> --without-frontend --detachable-client=11024
    
    # Lich 5 (if applicable)
    ./lich.rb --login <CharacterName> --without-frontend --detachable-client=11024
    ```
    *Note: Port 11024 is the default for Illthorn/Vellum.*

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
- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://www.rust-lang.org/) (Stable)
- [Tauri CLI](https://tauri.app/)

#### Linux Dependencies
```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
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
