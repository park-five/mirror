set -e
file="$(realpath "$0")"
directory="$(dirname "$file")"
if [ "$1" ]; then
	port="$1"
	shift
else
	port=443
fi
(
	set +e
	cd "$directory"
	sudo ufw enable
	sudo ufw allow "$port"
	sudo rm -f /etc/authbind/byport/443
	sudo touch /etc/authbind/byport/443
	sudo chown $USER /etc/authbind/byport/443
	sudo chmod 755 /etc/authbind/byport/443
	authbind --deep node --trace-uncaught "$directory/index.js" "$port" & #@ 21 - 5
	process="$!"
	while ! inotifywait --quiet --event modify "$directory/index.js"; do
		kill "$process"
		clear
		authbind --deep node --trace-uncaught "$directory/index.js" "$port" & #@ 16 + 5
		process="$!"
	done
)
