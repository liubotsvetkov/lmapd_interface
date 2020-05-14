mkdir -p /tmp/lmapd/
lmapd -j -b /usr/share/lmapd/capabilities.json -r /var/run -q /tmp/lmapd/ -c /usr/share/lmapd/lmapd-config.json -f
