# Recovery and everyday use

## Open the original LG interface

Choose **Glass Home → Settings → Open LG Home**. The original LG Home packages remain installed. The remote's Settings and Input buttons remain available.

## Disable the replacement independently

From the configured checkout on your computer:

```sh
node scripts/ssh.cjs /media/internal/glass-home/integration/recover.sh
```

This command:

1. Creates `/var/lib/glass-home/disabled` so the controller stops changing startup preferences.
2. Unregisters the Glass Home input and restores the saved original startup input.
3. Restores the previous Home binding, or clears the custom binding if there was none.
4. Restores the original LG screensaver by removing only LGGlassUI’s overlay.
5. Opens the original LG Home.

After a cold restart, the disabled flag prevents custom input injection and startup preference maintenance. The photo service and stored photos remain available. Recovery works without the dashboard UI.

If restoring the native input reports an error, the recovery script still restores the Home binding and attempts to open stock Home. Use your independent SSH connection to inspect the error before re-enabling.

## Restore only the screensaver

Choose **Settings → Screensaver → LG Fireworks**. If the dashboard is unavailable, use:

```sh
node scripts/ssh.cjs '/usr/bin/node /media/internal/glass-home/integration/screensaver-native.js disable'
```

This saves the LG choice, removes the photo overlay and closes a cached screensaver instance so the next activation reads the original LG source. It leaves Home/startup integration and photos alone. The original system file is never overwritten.

## Re-enable

Use the matching private checkout and the Home code verified for your remote:

```sh
node setup.cjs --integrate --home-key-code 773
```

This preserves the original backups and refuses to overwrite a different photo-access key. It enables native startup registration and reinstates the Home binding. Check the TV after completion.

## What to keep safe

Back up `.local/` securely. It contains the pinned host key, device configuration and private photo-access key. The wizard references your existing SSH private key; back up that key separately too. Older source installations may also store their SSH key inside `.local`. The TV also retains:

| Path | Purpose |
| --- | --- |
| `/var/lib/glass-home/keybinds.before` | Original Home/input-hook configuration |
| `/var/lib/glass-home/lastinput.before.json` | Original startup input |
| `/var/lib/glass-home/screensaver-main.before.qml` | Private local copy of the verified LG screensaver source |
| `/media/internal/glass-home/photos/screensaver.json` | Screensaver choice and bounded display preferences |
| `/var/lib/glass-home/disabled` | Independent replacement kill switch |
| `/media/internal/glass-home/photos/` | Uploaded photographs and collection index |

Homebrew Channel's own failsafe is left intact. Do not overwrite its `startup.sh`, remove the original Home packages, or reinstall LG Developer Mode on a persistent webOSbrew-rooted setup.

## Photos and Frame

The photo manager address and private key appear under **Settings → Photo collection**. Connect from the same trusted network. Uploaded photographs are stored locally, with a 100-photo / 256 MiB collection limit.

Frame supports previous/next, pause, fit/fill, brightness and 15/30/60-minute sessions. LG panel protections remain enabled; Frame brightness is an image overlay, not a panel-calibration change.

## Diagnostics

```sh
scripts/tv-ssh 'cat /tmp/glass-controller.log'
scripts/tv-ssh 'cat /tmp/glass-photos.log'
node scripts/tv-rpc.cjs luna://com.webos.applicationManager/getForegroundAppInfo '{}'
node scripts/tv-rpc.cjs luna://com.webos.service.eim/getLastInput '{}'
```

With native startup enabled, the preferred input should report `MVPD_IP` and `com.paulbuttle.glasshome`. This is the **next-start preference**, not a claim that the dashboard is currently foreground. You can watch HDMI or a streaming app normally.

Version 1.1.0 removes the previous 12-second launch timer. LG opens Glass Home as its native startup input; its own power-on sequence still takes time.
