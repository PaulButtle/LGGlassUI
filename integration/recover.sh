#!/bin/sh
set -eu
mkdir -p /var/lib/glass-home
touch /var/lib/glass-home/disabled
if [ -f /var/lib/glass-home/lastinput.before.json ]; then
  /usr/bin/node /media/internal/glass-home/integration/configure-startup.js disable || echo 'Native startup restore needs attention; Home recovery continues.' >&2
fi
# Existing hooks reload this file; after reboot they will not be injected.
if [ -f /var/lib/glass-home/keybinds.before ]; then
  cat /var/lib/glass-home/keybinds.before > /home/root/.config/lginputhook/keybinds.json
elif [ -d /home/root/.config/lginputhook ]; then
  printf '{}\n' > /home/root/.config/lginputhook/keybinds.json
fi
/media/internal/glass-home/integration/home.sh
