# Building a public release

Maintainer requirements: Node.js 22+, `ares-package`, `zip`, Git and GitHub CLI. The application runtime remains compatible with the tested TV's Node 8 / Chromium 68.

1. Update matching versions in `package.json` and `app/appinfo.json`; write the changelog.
2. Run `npm test` and the syntax checks in CI.
3. Run `npm run release:build`.
4. Extract the setup ZIP into a fresh directory. Test `node setup.cjs --help`, integrity failures, `--check`, installation/update, and recovery on supported hardware. Verify photos and the TV's actual UI.
5. Commit only public source, push, and wait for CI. Create the version tag and a GitHub release with the three assets from `dist/release/`: setup ZIP, public IPK, and `SHA256SUMS.txt`.

The builder uses an explicit file allowlist, excludes local overrides, validates public configuration and scans for this checkout's known private values. The ZIP contains an internal SHA-256 manifest that setup verifies before connecting. The external checksum file covers the ZIP and standalone IPK. Hashes provide integrity checks; they are not cryptographic publisher signatures.

Never upload `dist/private/`, older IPKs in `dist/`, `.local`, private branches, firmware binaries or captured device diagnostics. The setup archive is sufficient for installation; GitHub's automatic source archives require the LG CLI to build the app.

Native Home-hook binaries are downloaded from pinned upstream URLs only when integration is selected, checked against fixed SHA-256 values, and are not redistributed in the release.
