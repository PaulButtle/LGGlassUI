# Install LGGlassUI

Full integration is an advanced installation for an **already rooted LG webOS TV**. Only the LG CX configuration in [compatibility](COMPATIBILITY.md) has been verified. This project does not root the TV and does not install or modify the root exploit.

## 1. Establish recovery access first

You need:

- A compatible rooted TV with Homebrew Channel/webOSbrew startup hooks.
- Persistent **root SSH using a private key**, independently tested after a reboot.
- The original LG Home application still installed.
- Node.js 22+ on your computer and LG's [webOS CLI](https://webostv.developer.lge.com/develop/tools/cli-installation), including `ares-package` on PATH.
- Node.js at `/usr/bin/node` on the TV; version 8.12.0 was tested.
- A verified Home key code for your remote: **773 on the tested CX**.

Do not reinstall LG Developer Mode on a persistent webOSbrew-rooted installation. Follow the rooting project's own maintenance and recovery guidance.

## 2. Configure this checkout

```sh
git clone https://github.com/PaulButtle/LGGlassUI.git
cd LGGlassUI
mkdir -p .local
chmod 700 .local
```

Place your existing TV SSH private key at `.local/glass-tv-ed25519` and set permissions to `600`. Save the verified SSH host-key entry in `.local/tv-known-hosts`. Verify the fingerprint against your already trusted TV connection; do not disable host-key checking.

Set the address for the current shell:

```sh
export LG_TV_ADDRESS="YOUR_TV_IP"
scripts/tv-ssh 'id'
```

Alternatively, save the address alone in `.local/tv-address`. A successful check must report `uid=0`.

## 3. Confirm your application IDs

Edit [`app/config.js`](../app/config.js) to match the apps installed on your TV. IDs vary by region and model. Keep the application ID `com.paulbuttle.glasshome` consistent across the app, integration and deployment scripts.

The tested CX stock launcher is `com.webos.app.home`. Do not substitute `com.webos.app.fullhome` without checking your firmware's behaviour.

## 4. Provision

```sh
npm test
npm run provision -- --home-key-code 773
```

Use the code verified for your remote. Provisioning:

1. Checks the existing root connection and required TV paths.
2. Generates a unique local photo-access key and refuses to overwrite a different TV installation key.
3. Downloads two pinned native hook binaries and verifies their SHA-256 hashes.
4. Creates the photo directory, runs its service as uid/gid 6861, and installs the app and integration files.
5. Backs up the prior key binding and startup input, then registers Glass Home as the native startup input.
6. Enables the Home binding and the dedicated webOSbrew startup hook.

The script does **not** configure SSH, root the TV, remove apps, disable firmware updates, change picture settings or alter OLED protection. The numeric photo-service identity 6861 must be available for this use on your device.

If provisioning fails after creating the disabled flag, the replacement remains disabled. Read the error and use the [recovery command](RECOVERY.md) before retrying. Keep `.local` in a secure backup; it contains the keys needed to administer and update this installation.

## 5. Verify the real TV

Check Home, all app shortcuts, TV Settings and Frame uploads. Verify that normal HDMI selection remains usable. Then test standby/wake, cold startup and **Settings → Open LG Home**. Native startup is firmware-specific, so a successful package installation alone is not sufficient.

The photo manager address and private access key appear under **Settings → Photo collection**. Use a device on the same trusted home network.

## Updates

For an already provisioned television using this checkout's private configuration:

```sh
npm test
npm run deploy
```

The deploy command requires the TV's explicit native installer `installed` event before replacing integration files. It uses SSH streaming because the tested Dropbear configuration lacks the SFTP subsystem required by the standard ares transfer path.

`npm run package` builds a private IPK in `dist/`. Do not upload that IPK to GitHub releases: it contains this installation's photo access key.
