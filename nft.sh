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
	sudo nft add table inet filter
	sudo nft add chain inet filter input "{ type filter hook input priority 0; }"
	sudo nft add rule inet filter input tcp dport "$port" accept
	sudo node --trace-uncaught "$directory/index.js" "$port" & #@ 21 - 5
	process="$!"
	while ! inotifywait --quiet --event modify "$directory/index.js"; do
		kill "$process"
		clear
		sudo node --trace-uncaught "$directory/index.js" "$port" & #@ 16 + 5
		process="$!"
	done
)
