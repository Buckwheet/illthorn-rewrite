# Feature Gap Analysis & Roadmap: Illthorn Rewrite vs Warlock

## Executive Summary
This document outlines the feature gaps between the **Illthorn Rewrite** (Tauri/Rust) and **Warlock** (Kotlin/Compose). Warlock currently possesses a significantly more mature feature set regarding client-side automation and customization, whereas Illthorn Rewrite is currently a lightweight, modernized "view-only" interface that relies heavily on Lich.

To achieve parity with Warlock (and standard FE expectations), Illthorn Rewrite needs to implement several core systems that are currently missing.

## Detailed Feature Gap Analysis

### 1. Client-Side Scripting & Automation
| Feature | Warlock (State: Mature) | Illthorn Rewrite (State: Non-Existent) | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Macros** | **Native Support**<br>Key combinations mapped to commands. | **None**<br>No client-side keybinding storage or execution found. | 🔴 Critical |
| **Aliases** | **Native Support**<br>Text expansion (e.g., `att` -> `attack`). | **None** | 🔴 Critical |
| **Trigger/Highlights** | **Advanced**<br>Regex-based highlighting, sound triggers, and variable setting based on incoming text (`AddTextListener`). | **Basic/Hardcoded**<br>Some stream window routing exists, but no user-definable triggers or highlights were found. | 🔴 Critical |

### 2. Core Game Connection
| Feature | Warlock | Illthorn Rewrite | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Login Method** | **Native SGE Login**<br>Can authenticate and connect directly to Simutronics servers without external tools. | **Headless Lich Dependent**<br>Requires user to run Lich externally in a specific mode. Acts essentially as a Telnet view. | 🟡 High |
| **Protocol Handling** | **Robust**<br>Handles specialized streams, prompts, and server codes natively. | **Basic**<br>Raw TCP pipe. Wraps commands in `\r\n`. Minimal protocol awareness beyond basic stream parsing. | 🟡 High |

### 3. User Experience & Customization
| Feature | Warlock | Illthorn Rewrite | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Settings Storage** | **SQLite Database**<br>Robust local storage for prefs, highights, macros, etc. | **Minimal**<br>`tauri-plugin-store` (assumed) or ephemeral. | 🟡 Medium |
| **Theming** | **Customizable**<br>Granular style definitions (`StyleDefinition`). | **Fixed Theme**<br>Dark mode "Modern UI". | 🟢 Low (Design Choice) |
| **Cross-Platform** | **Desktop + Android**<br>(Kotlin Multiplatform) | **Desktop**<br>(Tauri - Windows/Linux/macOS). Mobile is theoretically possible but not active. | ⚪ Info Only |

---

## Roadmap to Parity (Proposed Implementation Plan)

To bridge the gap, we recommend the following phased approach. The immediate priority is enabling basic user automation (Macros/Aliases) which users expect from any FE.

### Phase 1: The "Power User" Basics (High Impact)
The goal of this phase is to allow users to play *effectively* without needing to alt-tab or type full commands.
- [ ] **Implement Client-Side Command Parsing**: Intercept user input before sending to socket.
- [ ] **Command Alias System**: Simple key/value replacement (e.g., `k` -> `kill`).
- [ ] **Macro System**: Bind keys (F1-F12, Numpad) to commands.
- [ ] **Basic Highlights**: User-configurable regex highlights (Coloring text).

### Phase 1.5: Core Indicators (Critical Game Feedback)
Features discovered missing in refined analysis.
- [x] **RoundTime / CastTime Indicators**: Parse `<roundtime>` and `<casttime>` tags and display a countdown bar.
- [x] **Status Icons**: Parse `<indicator>` tags to show critical states like Stunned, Bleeding, Kneeling, etc.

### Phase 2: Native Convenience
Remove the friction of "running Lich manually".
- [ ] **Integrated SGE Login**: Port the SGE login logic (or use a Rust crate) to allow logging in directly from Illthorn.
- [ ] **Lich Manager**: Auto-launch Lich in the background if needed, hiding the detached console complexity from the user.

### Phase 3: Advanced Automation
We have decided to rely **exclusively** on Lich for scripting.
- [ ] **Lich Integration**: Ensure UI buttons or macros can trigger Lich scripts seamlessly.

## Technical Recommendations for Illthorn
1.  **Introduce a `CommandProcessor` struct** in Rust:
    *   This sits between the UI [send_command](file:///c:/Users/rpgfi/Documents/GSIV%20Development/Ilthorn-rewrite/src-tauri/src/lib.rs#38-57) event and the `TcpStream`.
    *   It parses for local commands (e.g., `#alias set foo bar`), expands aliases, and handles macros.
2.  **Persistent Storage**:
    *   Use `rusqlite` or `tauri-plugin-sql` to store User Preferences, Macros, and Highlights, similar to Warlock's `PrefsDatabase`.
3.  **Regex Engine**:
    *   Implement a high-performance regex scanner in the Rust backend for Highlights/Triggers to avoid bogging down the JavaScript frontend.
