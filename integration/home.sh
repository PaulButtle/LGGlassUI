#!/bin/sh
# Transient hook: original LG packages stay intact. A failed launch falls back.
exec 9>/tmp/glass-home-launch.lock
flock -n 9 || exit 0
APP=com.paulbuttle.glasshome
[ -f /var/lib/glass-home/disabled ] && APP=com.webos.app.home
RESULT=$(sleep 2 | luna-send -n 1 -w 2000 luna://com.webos.applicationManager/launch "{\"id\":\"$APP\"}")
case "$RESULT" in
  *'"returnValue":true'*|*'"returnValue": true'*) exit 0 ;;
  *) sleep 2 | luna-send -n 1 -w 2000 luna://com.webos.applicationManager/launch '{"id":"com.webos.app.home"}' ;;
esac
