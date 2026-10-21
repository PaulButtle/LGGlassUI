# Compatibility and verification

## Tested device

LG OLED65CX5LB, firmware 04.64.00, webOS SDK 5.6.2, Chromium 68.0.3440.106, Node 8.12.0. App surface: 1920 × 1080. Verification date: 21 October 2026.

Other models, regions, firmware versions and native app IDs are unverified.

## Verified

- The physical Home key opens Glass Home; key code 773 on this remote.
- All nine default application IDs, TV Settings and stock LG Home return successful native launch responses. Plex was also checked as foreground. This does not certify account access or media playback in every service.
- The installed UI renders correctly on the TV. JavaScript readiness measured roughly 0.3–0.4 seconds; this excludes complete TV boot and image decoding.
- A real uploaded 1672 × 941 photograph renders in Frame. The collection survives restart. Upload conversion, authentication, ordering and removal are covered by service/browser checks.
- Original LG Home remains installed and was visually checked. Independent recovery restores stock Home routing.
- Root SSH survives a cold restart, password login is disabled, normal telnet is closed, and the photo process runs without root privileges.
- Native startup registration was tested with the old delayed controller stopped: after standby from HDMI, the first boot launch and foreground application was Glass Home. HDMI was only preloaded in the background. The startup trace contained no HDMI foreground transition.
- After the final restart/power-on, Glass Home was foreground without a manual launch; native startup registration, root access and both services persisted. Selecting HDMI during normal use remained foreground while the watcher restored only the next-start preference. Recovery and re-enabling were exercised with version 1.1.0.
- The v1.2.0 setup ZIP was extracted into a fresh computer folder and used to update the existing TV installation. The installer recovered the existing photo key over SSH; both its hash and the complete photo-index hash remained unchanged. Existing native startup and Home integration were preserved. A completely fresh TV installation remains unverified.
- Automated regressions cover navigation, stored preferences, uploads, quotas, JPEG decoding, native startup preference handling, greeting boundaries, unique installation keys, SSH input validation and release integrity.
- The guided installer was exercised from macOS. Linux runs the automated suite in CI. The Node/OpenSSH Windows path is provided but has not been tested on a Windows computer.

## Upstream dependencies

| Component | Pinned revision / version |
| --- | --- |
| Homebrew Channel used on the tested TV | 0.7.3 |
| LG Input Hook binary source | `Simon34545/lginputhook` at `a607900118e088208f83f0f0c7a5a5b922092594` |
| Related inputhookpp source inspected | `sundermann/inputhookpp` at `2e808c1ca4fbe036f1ed7eac942c08245c283256` |
| JPEG decoder | `jpeg-js` 0.4.4; upstream decoder blob `1982481806e5fe29bd38cb008297f35731ade20b` |

The native hook binaries are pinned and checksummed, not rebuilt or formally audited here. They are downloaded separately by the provisioning tool and are not committed to this repository.

- `ezinject`: SHA-256 `d2def5b3f68a415cf5a4a747ab70115e70a82f721bafbcc0d9c5a7bd5c161160`
- `libinputhookpp.so`: SHA-256 `de2c155a598827e7b31b2fa2cfe80e1cc7ad9347ccdd16f1c2aeb9bc0db1b49d`

Native input registration follows the mechanism described by [webOSbrew's autostart project](https://github.com/webosbrew/webosbrew-autostart) and the [openlgtv input-app notes](https://gist.github.com/Informatic/1983f2e501444cf1cbd182e50820d6c1). The existing Homebrew root startup is retained; this project does not replace it.

## Limits

The app cannot remove ads inside streaming services. Root compatibility can change with firmware updates. Display startup timing depends on LG's native boot process; there is no extra 12-second Glass Home timer in version 1.1.0. OLED maintenance and screen protection are left intact.
