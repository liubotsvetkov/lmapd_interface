#!/bin/sh
lmapctl -j -r /var/run -q /tmp/lmapd -c /usr/share/lmapd/lmapd-config.json $1
