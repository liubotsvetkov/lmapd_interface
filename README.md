# OpenWrt LuCI Support for the LMAP Daemon
Interface enabling configuration of the LMAP daemon through the OpenWrt LuCI WebUI.

I have provided a working OpenWrt image containing lmapd and the UI for lmapd, built using client-side rendering approach. The BSc Thesis paper can also be found in the repository.

### Installation
- Use OpenWrt buildroot to compile an OpenWrt image
  * Change LuCI source in 'feeds.conf.default' to git of LuCI master branch by following the procedures given on [LuCI master branch](https://github.com/openwrt/luci.git).
  * Another option is to change the LuCI source to point to a local copy of the LuCI repository. I have provided a copy from 15/05/2020, which is the repository's state I have worked with.
- Place the files from this repository at the respective location on your OpenWrt system
  * `/etc/config/lmapd` in `/etc/config`
  * `/etc/init.d/lmapd` in `/etc/init.d`
  * `/usr/lib/lua/lmapd` in `/usr/lib/lua`
  * `/usr/lib/lua/uci.so` in `/usr/lib/lua`
  * `/usr/share/lmapd` in `/usr/share`
  * `/usr/share/luci/menu.d/luci-app-lmapd.json` in `/usr/share/luci/menu.d`
  * `/usr/share/rpcd/acl.d/luci-app-lmapd.json` in `/usr/share/rpcd/acl.d`
  * `/www/luci/static/resources/view/lmapd` in `/www/luci-static/resources/view`
  ### Note
  Check the execute rights of the copied files.
- LMAPD and its dependencies in ipk format are located in directory `/compiled_packages`
  * Install the dependencies of LMAPD by running `opkg install` and the file path.
  * Install LMAPD by running `opkg install compiled_packages/simet-lmapd_0.1.2-1_x86_64.ipk`.
 ### Usage
 to see the OpenWrt user interface (UI), go to https://your.server.ip/cgi-bin/luci.
 ### Todo's
  - A menu, designed for advanced users, targeting people who are familiar with the structure of the configuration file of lmapd.
  - Support for further measurement tasks besides `ping` and `traceroute`.
  - The option to add multiple actions in a schedule.
  - A survey with users from different backgrounds in order to improve the user-friendliness of the interface.
 ### Resources used
  - [LMAP Daemon](https://github.com/simetnicbr/simet-lmapd).
  - [LuCI](https://github.com/openwrt/luci.git).
