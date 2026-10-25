# From download to Glass Home

The release includes a guided setup tool and a ready-built TV app. **No Git, npm install or LG developer CLI is needed.**

You need an **already rooted LG webOS TV with webOSbrew**, a working root SSH key, and a computer on the same network with [Node.js 22 or newer](https://nodejs.org/en/download) and OpenSSH. Windows users can use PowerShell with the OpenSSH Client installed; macOS and Linux include or provide OpenSSH through their normal system tools.

Only the LG CX configuration in [compatibility](COMPATIBILITY.md) has been tested. Rooting is separate: consult [webOSbrew's rooting guide](https://www.webosbrew.org/rooting/) for your model and firmware. This installer does not root TVs or set up SSH. Keep the original LG Home installed and verify your SSH recovery access after a restart.

## 1. Download and open setup

Download **LGGlassUI-v1.3.2-setup.zip** from the [latest release](https://github.com/PaulButtle/LGGlassUI/releases/latest), extract it, and open a terminal inside the extracted `LGGlassUI-v1.3.2` folder.

```sh
node setup.cjs
```

Answer four short prompts:

| Prompt | What to enter |
| --- | --- |
| TV IP address | Find it in your TV's network settings |
| SSH port | The port of your existing root SSH connection; often 22 or 2222 |
| SSH private key | The path to the private key you already use to connect to the TV |
| Greeting names | Optional, for example `Alex and Sam`; leave blank for a generic greeting |

On the first connection, SSH may ask you to trust a host fingerprint. Compare it with your existing trusted TV connection before accepting. Setup then pins it for future connections. If your key uses a passphrase, load it into your SSH agent first so you do not have to enter it for each command.

Setup verifies the release files, checks root access, installs the app and local photo service, generates a unique photo-access key, and opens Glass Home. The first install leaves Home-button and startup replacement disabled, so you can try the dashboard first. Existing replacement settings are preserved during updates.

**Your TV needs webOSbrew startup hooks, `/usr/bin/node` (Node 8.12.0 was tested), Luna services and an unused numeric user ID 6861 for the photo service.** Setup checks the required paths and rejects an existing account using that ID on first install.

## 2. Try it on the TV

Open the app shortcuts, TV Settings, and **Settings → Open LG Home**. Open Glass Home again from LG's app list. For photos, choose **Settings → Photo collection**, visit the displayed address on your phone or computer, and enter the private key shown on the TV. Choose **Frame → Start Frame** to display your collection.

The default ten app IDs are UK/CX defaults. For another region, use a source checkout and edit `app/config.js` before packaging. Do not edit the release ZIP's verified payload in place.

Setup copies official icons from the installed apps into Glass Home on the TV, preferring each app's large PNG icon. Artwork is kept unchanged, including supplied backgrounds. A missing app or unsupported image uses a plain text fallback. Re-run setup to refresh icons after app updates. The standalone IPK and browser preview do not include third-party icon files.

## 3. Make it your Home screen (optional)

Once the dashboard works, and you have verified the Home key code and native input support on your model:

```sh
node setup.cjs --integrate --home-key-code 773
```

**773 is the verified code for the tested CX remote, not a universal LG key code.** Other models are unverified. Integration checks for native input storage and the original LG Home, downloads two pinned/checksummed input-hook components, and backs up the previous Home binding and startup input before enabling the replacement.

Press Home, switch to HDMI and back, then check standby/wake and cold startup. Native startup is firmware-specific; successful installation alone does not prove the visible startup experience. LG's own power-on sequence still takes time.

## Frame Photographs as the screensaver

After setup on supported CX firmware, open **Glass Home → Settings → Screensaver** and choose **Frame Photographs**. Choose **LG Fireworks** at the same control to restore the original LG view. This option is independent of the Home-button replacement.

The screensaver uses the same uploaded photographs, image fit and change interval as Frame. Images are dimmed to 55% opacity and gently move. Manual Frame's session duration and brightness remain separate: the native screensaver continues until LG dismisses it or changes power state. LG retains control of idle timing, remote wake, partial-video handling and panel protection. It will only appear where LG normally starts its screensaver; it does not force a screensaver over playing video or HDMI.

An empty collection uses the bundled landscape. If the photo layer cannot load, the original LG view remains visible. The setting is saved on the TV and reapplied by the normal webOSbrew startup hook.

Compatibility is deliberately narrow: the current feature accepts the exact LG screensaver revision verified on the CX firmware listed in [compatibility](COMPATIBILITY.md). Other firmware, a missing controller or another custom screensaver leaves the option unavailable. Setup does not overwrite another screensaver overlay.

## Updates and personalisation

Download and extract the next setup ZIP, then run `node setup.cjs` again. You can copy your `.local` folder into the new extraction to retain the trusted connection and settings. Keep the referenced SSH private key in place. With a fresh setup folder, root SSH securely retrieves the existing TV's photo key and greeting instead of creating new ones. Photos and recovery backups stay on the TV.

Change only the greeting during an update with:

```sh
node setup.cjs --name "Alex and Sam"
```

Use `--name ""` in a compatible shell, or enter `-` at the interactive greeting prompt, to return to a generic greeting. Each greeting follows the TV's local time: morning before noon, afternoon before 18:00, then evening.

For a noninteractive install using an already pinned host key:

```sh
node setup.cjs --host TV_IP --port 22 --key /path/to/private_key
```

Check the release and connection without changing TV files:

```sh
node setup.cjs --check
```

This still saves the local connection information and may prompt to trust an SSH fingerprint. Checksums detect damaged or changed files; obtain the ZIP and published checksums from this project's GitHub release.

## Recovery

From your configured setup folder:

```sh
node scripts/ssh.cjs /media/internal/glass-home/integration/recover.sh
```

This disables the replacement, restores the saved Home binding and startup preference, and opens LG Home. Photos remain on the TV. Full instructions: [Recovery](RECOVERY.md).

Setup does not remove apps, change picture settings, disable OLED protection, or modify webOSbrew's rooting/SSH configuration. If setup stops, read its error before retrying. An integration failure requests recovery automatically; a failed app install does not enable replacement.

## Common setup issues

| Message / symptom | Next step |
| --- | --- |
| `node` or `ssh` not found | Install Node.js 22+ or OpenSSH, then open a new terminal |
| Connection refused / timeout | Turn on the TV; check the address, port and existing root SSH access |
| Permission denied | Select the matching private key and load passphrase-protected keys into your SSH agent |
| Host key changed | Verify the new fingerprint independently; do not bypass host-key checking |
| Different installation key | Use the matching `.local` backup, or a fresh extracted folder to retrieve this TV's key |
| Release checksum mismatch | Extract a fresh ZIP; do not modify release payload files |
| App shortcut does not open | Check the installed app ID for your region/model using a source build |

## Installing from source

Maintainers and people customising app IDs need LG's [webOS CLI](https://webostv.developer.lge.com/develop/tools/cli-installation) (`ares-package` on PATH), in addition to Node and SSH:

```sh
git clone https://github.com/PaulButtle/LGGlassUI.git
cd LGGlassUI
npm test
node setup.cjs
```

Source setup builds a fresh public package, then personalises it on the TV. `npm run package` instead creates a **private** IPK in `dist/private/`; never share that package. `npm run package:public` creates a generic package in `dist/public/`.

The standalone release `.ipk` is a generic app for experienced users with an existing compatible app installer. It does not install the photo service, Home hook or startup integration; use the setup ZIP for those features.
