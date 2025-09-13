# HNE YouTube Repeater

A lightweight Chrome MV3 extension to **A–B repeat** any YouTube video segment — with **finite or infinite repeats**, **per-video memory**, a **popup-only UI**, and a live toolbar **badge** (`R∞`, `R10`, etc). Works on **YouTube**, **Shorts**, and **YouTube Music**.

> by [hnetechnologies](https://hnetechnologies.com)

---

## Features

- **A–B repeat** with one click (Set A / Set B / Clear)
- **Finite repeat count** (e.g., repeat 10 times) or **infinite** (`0`)
- **Popup-only UI** (no on-video overlay) — clean and unobtrusive
- **Hotkeys**
  - On-page: `R` (toggle), `[` (Set A), `]` (Set B), `\` (Clear)
  - Global (Chrome commands): configurable in `chrome://extensions/shortcuts`
- **Per-video memory** (remembers A/B and count if you want it to)
- **Badge** shows current mode on the toolbar: `R∞`, `R3`, etc.
- **Robust player detection** (SPA navigation, Shorts, Music)
- **Private by design**: no network calls, no analytics, storage only

---

## Install (developer mode)

1. Clone the repo:
   ```bash
   git clone https://github.com/deadsec07/ytrepeater.git
   cd ytrepeater
