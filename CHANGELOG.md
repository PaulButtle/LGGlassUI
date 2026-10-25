# Changelog

## 1.3.2 — 2026-10-25

- Replace approximate brand marks with authentic icons from the apps installed on the TV.
- Setup copies official PNG artwork locally, preserving the original colours and backgrounds; missing artwork uses plain text.
- Re-running setup refreshes the icons. Third-party icon files are excluded from public packages.

## 1.3.1 — 2026-10-25

- Add Channel 4 beside ITV Hub in the quick-launch bar.
- Remote navigation follows the configured app count, including all ten default shortcuts.

## 1.3.0 — 2026-10-21

- Choose **LG Fireworks** or **Frame Photographs** in Glass Home Settings.
- Native screensaver photographs use your local collection with gentle movement, soft dimming and your Frame fit/interval. LG retains idle and remote-wake control.
- Reversible, fingerprint-guarded overlay for the tested CX firmware; original LG source is never overwritten or distributed.
- Authenticated settings API, a separate root watcher and independent screensaver recovery.
- Your greeting, photo collection and Home/startup configuration are preserved during updates.

## 1.2.0 — 2026-10-21

### A simpler way home

- A guided setup ZIP with a ready-built TV app. Node.js and OpenSSH are the only computer prerequisites; no Git, npm dependencies or LG CLI required.
- Public IPK and SHA-256 checksums. Public packages contain no installation key, household name or device address.
- Dashboard-first installation, with optional Home-button and native startup integration on compatible rooted TVs.
- Updates retrieve an existing TV's photo key and preserve photographs, recovery backups and integration settings.
- Optional personal greetings that follow the TV's local morning, afternoon and evening.
- Setup, troubleshooting, recovery and release-building guides.

The full integration still requires an already rooted webOSbrew TV. The verified hardware remains the LG CX / OLED65CX5LB; other models and firmware are unverified.

## 1.1.0 — 2026-10-21

- Native startup input integration replaces the extra 12-second launch delay.
- Original LG Home and the previous startup input remain recoverable.
- Initial public source release: nine native app shortcuts, TV Settings, local photo uploads and Frame mode.
