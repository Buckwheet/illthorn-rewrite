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

## Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://www.rust-lang.org/) (Stable)
- [Tauri CLI](https://tauri.app/)

### Setup
```bash
# Install dependencies
npm install

# Run in Development Mode
npm run tauri dev

# Build for Production
npm run tauri build
```
