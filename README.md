# OpenWrt UI supporting LMAPD
Interface enabling configuration of the LMAP daemon through the OpenWrt LuCI WebUI

I have provided a working OpenWrt image containing lmapd and the UI for lmapd, built using client-side rendering

### Installation

- Use OpenWrt buildroot to compile an OpenWrt image
  * Change LuCI source to LuCI master branch by following the procedures given on [LuCI master branch](https://github.com/openwrt/luci.git)
- Place the files from this repository at the respective location on your OpenWrt system
  * `/etc/config/lmapd` in `/etc/config`
  * `/etc/init.d/lmapd` in `/etc/init.d`
  * `/usr/lib/lua/lmapd` in `/usr/lib/lua`
  * `/usr/lib/lua/uci.so` in `/usr/lib/lua`
  * `/usr/share/lmapd` in `/usr/share`
  * `/usr/share/luci/menu.d/luci-app-lmapd.json` in `/usr/share/luci/menu.d`
  * `/usr/share/rpcd/acl.d/luci-app-lmapd.json` in `/usr/share/rpcd/acl.d`
  * `/www/luci/static/resources/view/lmapd` in `/www/luci/static/resources/view`
- LMAPD and its dependencies in ipk format are located in directory `/compiled_packages`
  * Install the dependencies of LMAPD by running `opkg install` and the file path
  * Install LMAPD by running `opkg install compiled_packages/simet-lmapd_0.1.2-1_x86_64.ipk`
 
 ### Todo's
  - A menu, designed for advanced users, targeting people who are familiar with the structure of the configuration file of lmapd
  - Support for further measurement tasks besides `ping` and `traceroute`
  - The option to add multiple actions in a schedule
  - A survey could be made with users from different backgrounds in order to improve the user-friendliness of the interface
