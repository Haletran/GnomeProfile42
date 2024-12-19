#!bin/sh

git clone https://github.com/Haletran/GnomeProfile42
mv GnomeProfile42 ~/.local/share/gnome-shell/extensions/42extension@bapasqui.com

read -p "Do you have setup your API on 42? (y/n): " setup
if [ $setup = "n" ]; then
    echo "Please go to https://profile.intra.42.fr/oauth/applications/new and create a new application"
    echo "Then fill the CLIENT_ID and CLIENT_SECRET in the .env file"
    touch ~/.local/share/gnome-shell/extensions/42extension@bapasqui.com/.env
    exit 0
fi

read -p "Enter your login: " name
read -p "Enter your CLIENT_ID: " CLIENT_ID
read -p "Enter your CLIENT_SECRET: " CLIENT_SECRET

touch ~/.local/share/gnome-shell/extensions/42extension@bapasqui.com/.env
echo "LOGIN=$name" > ~/.local/share/gnome-shell/extensions/42extension@bapasqui.com/.env
echo "CLIENT_ID=$CLIENT_ID" >> ~/.local/share/gnome-shell/extensions/42extension@bapasqui.com/.env
echo "CLIENT_SECRET=$CLIENT_SECRET" >> ~/.local/share/gnome-shell/extensions/42extension@bapasqui.com/.env

echo "Please restart your gnome-shell by pressing Alt+F2 and type 'r' then press Enter"
echo "Then go to https://extensions.gnome.org/local/ and enable the 42extension"