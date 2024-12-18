const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Soup = imports.gi.Soup;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const { spawnCommandLine } = imports.misc.util;
const { loadEnv } = imports.misc.util;

function loadEnvironmentVariables() {
  const envFilePath = Me.path + '/.env';
  const envVars = GLib.file_get_contents(envFilePath)[1].toString().split('\n');
  envVars.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      GLib.setenv(key.trim(), value.trim(), true);
    }
  });
}
loadEnvironmentVariables();


const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("42 Intra - Fetcher"));
      this._clientId = GLib.getenv("CLIENT_ID");
      this._clientSecret = GLib.getenv("CLIENT_SECRET");
      this._tokenEndpoint = "https://api.intra.42.fr/oauth/token";
      this.me_endpoint = "https://api.intra.42.fr/v2/users/" + GLib.getenv("LOGIN");
      this._accessToken = null;


      // CREATE BASE EXTENSION INTERFACE
      const iconPath = Me.path + "/icons/icon.png";
      const gicon = imports.gi.Gio.icon_new_for_string(iconPath);
      const icon = new St.Icon({
        gicon: gicon,
        style_class: "system-status-icon",
        icon_size: 17
      });

      const box = new St.BoxLayout();
      box.add_child(icon);
      this.add_child(box);
      const section = new PopupMenu.PopupMenuSection();
      const fetchUserInfoItem = new PopupMenu.PopupMenuItem("Fetch User Info", {
        reactive: true,
        can_focus: true,
        hover: true,
      });

      fetchUserInfoItem.connect("activate", () => this._fetchMeInfo());
      section.addMenuItem(fetchUserInfoItem);
      this.menu.addMenuItem(section);
      this._updateInterval = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 300, () => {
        this._fetchOAuthToken();
        return GLib.SOURCE_CONTINUE;
      });
    }

    _fetchOAuthToken() {
      const session = new Soup.Session();
      // REQUEST
      const formData = new GLib.Bytes(
        new TextEncoder().encode(
          `client_id=${encodeURIComponent(this._clientId)}` +
          `&client_secret=${encodeURIComponent(this._clientSecret)}` +
          `&grant_type=client_credentials`,
        ),
      );
      const message = Soup.Message.new(
        "POST",
        this._tokenEndpoint
      );
      message.request_headers.append(
        "Content-Type",
        "application/x-www-form-urlencoded",
      );
      message.set_request_body_from_bytes(
        "application/x-www-form-urlencoded",
        formData,
      );
      session.queue_message(message, (session, message) => {
        try {
          if (message.status_code === Soup.Status.OK) {
            const responseText = message.response_body.data;
            const tokenResponse = JSON.parse(responseText);

            if (tokenResponse.access_token) {
              this._accessToken = tokenResponse.access_token;
              this._fetchMeInfo();
            } else {
              this._updateMenu(_(`Error: ${JSON.stringify(tokenResponse)}`));
            }
          } else {
            this._updateMenu(_(`Error: HTTP ${message.status_code}`));
          }
        } catch (e) {
          this._updateMenu(_(`Error: ${e.message}`));
        }
      });
    }

    _fetchMeInfo() {
      if (!this._accessToken) {
        this._updateMenu(_("Error: No access token available."));
        return;
      }
      const session = new Soup.Session();
      const message = Soup.Message.new("GET", this.me_endpoint);
      message.request_headers.append(
        "Authorization",
        `Bearer ${this._accessToken}`,
      );
      session.queue_message(message, (session, message) => {
        try {
          if (message.status_code === Soup.Status.OK) {
            const responseText = message.response_body.data;
            const userInfo = JSON.parse(responseText);
            this._updateMenu(`LOGIN : ${userInfo.login}\nLEVEL : ${userInfo.cursus_users[1].level}\nCORRECTION POINTS : ${userInfo.correction_point}\nWALLETS : ${userInfo.wallet}\nLOCATION : ${userInfo.location}`);
            //const lastUpdated = new Date().toLocaleString();
            //this._addMenuItem(`Last Updated: ${lastUpdated}`);
            this._addButton("  OPEN PROFILE", () => {
              spawnCommandLine(`xdg-open https://profile.intra.42.fr/users/${userInfo.login}`);
            }, 'user-home');
          }
          else {
            this._updateMenu(_(`Error: HTTP ${message.status_code}`));
          }
        } catch (e) {
          this._updateMenu(_(`Error: ${e.message}`));
        }
      });
    }

    _updateMenu(text) {
      this.menu.removeAll();
      const item = new PopupMenu.PopupMenuItem(text);
      this.menu.addMenuItem(item);
    }

    _addMenuItem(text) {
      const item = new PopupMenu.PopupMenuItem(text);
      this.menu.addMenuItem(item);
    }

    _addButton(text, callback, icon_name) {
      const item = new PopupMenu.PopupMenuItem("");
      const box = new St.BoxLayout();
      if (icon_name) {
        const st_icon = new St.Icon({
          icon_name: icon_name,
          icon_size: 14
        });
        box.add_child(st_icon);
      }
      const label = new St.Label({ text: text });
      box.add_child(label);
      item.add_child(box);
      item.connect("activate", callback);
      this.menu.addMenuItem(item);
    }
  },
);

class Extension {
  constructor(ext) {
    this.ext = ext;
  }

  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this.ext.uuid, this._indicator);
    this._indicator._fetchOAuthToken();
  }

  disable() {
    if (this._indicator._updateInterval) {
      GLib.source_remove(this._indicator._updateInterval);
      this._indicator._updateInterval = null;
    }
    this._indicator.destroy();
    this._indicator = null;
  }
}

function init(ext) {
  return new Extension(ext);
}
