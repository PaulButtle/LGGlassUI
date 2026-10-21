#!/bin/sh
# Executed by webOSbrew. Children must not delay boot or its failsafe.
BASE=/media/internal/glass-home
start_once() {
  name="$1"; shift
  pidfile="/tmp/glass-$name.pid"
  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then return; fi
  nohup "$@" </dev/null >"/tmp/glass-$name.log" 2>&1 &
  echo $! > "$pidfile"
}
start_once photos /usr/bin/node "$BASE/service/server.js"
[ -f /var/lib/glass-home/disabled ] && exit 0
start_once controller /usr/bin/node "$BASE/integration/controller.js"
# The binary hook modifies process memory only. No system partition is written.
if [ ! -f /tmp/glass-inputhook ]; then
  for name in lginput2 micomservice; do
    for pid in $(pidof "$name"); do
      "$BASE/inputhook/ezinject" -l "/tmp/glass-hook-$name.log" "$pid" "$BASE/inputhook/libinputhookpp.so" >"/tmp/glass-inject-$name.log" 2>&1
    done
  done
  touch /tmp/glass-inputhook
fi
