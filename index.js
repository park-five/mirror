const node = {
	fs: require("node:fs"),
	os: require("node:os"),
	path: require("node:path"),
	process: {
		current: require("node:process"),
		child: require("node:child_process"),
	},
};

function assert(value) {
	if (value) {
		return value;
	} else {
		throw undefined;
	}
}

function duration(name, value) {
	let result = 0;
	const names = ["day", "hour", "minute", "second", "millisecond"];
	const nameIndex = names.indexOf(name);
	const values = [24, 60, 60, 1000, 1];
	for (let index = 0; index < nameIndex; index += 1) {
		if (value[names[index]]) {
			result += value[names[index]] * values.slice(index, nameIndex).reduce((a, b) => a * b, 1);
		}
	}
	if (value[names[nameIndex]]) {
		result += value[names[nameIndex]];
	}
	for (let index = nameIndex + 1; index < names.length; index += 1) {
		if (value[names[index]]) {
			result += value[names[index]] / values.slice(nameIndex, index).reduce((a, b) => a * b, 1);
		}
	}
	return result;
}
function dateTime(unix = Date.now()) {
	function isLeapYear(year) {
		return year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
	}
	function daysMonth(year, month) {
		return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
	}
	function daysYear(year) {
		let result = 0;
		for (let month = 1; month <= 12; month += 1) {
			result += daysMonth(year, month);
		}
		return result;
	}
	let result = {year: 1970, month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0};
	let error = unix;
	const uneven = (name, days) => {
		const milliseconds = duration("millisecond", {day: days(result[name])});
		while (error >= milliseconds) {
			result[name] += 1;
			error -= milliseconds;
		}
	};
	uneven("year", daysYear);
	uneven("month", month => daysMonth(result.year, month));
	for (const name of ["day", "hour", "minute", "second", "millisecond"]) {
		const unit = duration("millisecond", {[name]: 1});
		result[name] = Math.floor(error / unit);
		error -= unit * result[name];
	}
	assert(error == 0);
	return result;
}

function durationString(value) {
	let result = "";
	let error = duration("millisecond", value);
	let first = true;
	const unit = (name, padding, suffix) => {
		const unit = duration("millisecond", {[name]: 1});
		const units = Math.floor(error / unit);
		if (!first, units > 0 || result.length > 0) {
			let string = units.toString();
			if (!first && padding) {
				string = string.padStart(padding, "0");
			}
			if (suffix) {
				string += suffix;
			}
			result += string;
			first = false;
		}
		error -= unit * units;
	};
	unit("day", undefined, ":");
	unit("hour", Math.ceil(Math.log10(24)), ":");
	unit("minute", Math.ceil(Math.log10(60)), ":");
	unit("second", result.length > 0 ? Math.ceil(Math.log10(60)) : undefined, ".");
	unit("millisecond", Math.ceil(Math.log10(1000)));
	return result;
}
function dateString(year, month, day) {
	return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}
function timeString(hour, minute, second, millisecond) {
	return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}.${millisecond.toString().padStart(3, "0")}`;
}
function dateTimeString(dateTime) {
	return `[${dateString(dateTime.year, dateTime.month, dateTime.day)} ${timeString(dateTime.hour, dateTime.minute, dateTime.second, dateTime.millisecond)}]`;
}

function pathJoin(...paths) {
	return node.path.join(...paths);
}

function pathDirectory(path) {
	return node.path.dirname(path);
}
function pathName(path, extension = true) {
	if (extension) {
		return node.path.basename(path);
	} else {
		return node.path.basename(path, pathExtension(path));
	}
}
function pathExtension(path) {
	return node.path.extname(path);
}

function pathParent(directory, path) {
	const childPath = node.path.relative(directory, path);
	if (!childPath.startsWith("..")) {
		return childPath;
	}
}

function pathNormalize(path) {
	path = node.path.normalize(path);
	if (path.length > 1 && path.endsWith("/")) {
		path = path.slice(0, -1);
	}
	return path;
}
function pathResolve(path) {
	return node.path.resolve(path);
}

function isParentPath(directory, path) {
	return pathParent(directory, path) != undefined;
}
function isAbsolutePath(path) {
	return node.path.isAbsolute(path);
}
function isRelativePath(path) {
	return !isAbsolutePath(path);
}

function isPath(path) {
	return node.fs.existsSync(path);
}
function isFile(path) {
	return isPath(path) && node.fs.statSync(path).isFile();
}
function isDirectory(path) {
	return isPath(path) && node.fs.statSync(path).isDirectory();
}
function isLink(path) {
	return isPath(path) && node.fs.statSync(path).isSymbolicLink();
}

function readPath(path) {
	if (isPath(path)) {
		return node.fs.realpathSync(path);
	}
}
function readTemporaryDirectory() {
	return node.os.tmpdir();
}
function readCurrentDirectory() {
	return node.process.current.cwd();
}
function readFile(path, encoding = "utf-8") {
	if (isFile(path)) {
		return node.fs.readFileSync(path, encoding);
	}
}
function readDirectory(path, recursive = false) {
	if (isDirectory(path)) {
		if (recursive == "recursive") {
			function recurse(directory) {
				const paths = [];
				for (let path of readDirectory(directory).toSorted()) {
					path = pathJoin(directory, path); 
					if (isFile(path) || isLink(path)) {
						paths.push(path);
					} else {
						paths.push(...recurse(path));
						paths.push(path);
					}
				}
				return paths;
			}
			return [...recurse(path), path];
		} else {
			return node.fs.readdirSync(path).sort();
		}
	}
}

function readLink(path) {
	if (isLink(path)) {
		return node.fs.readlinkSync(path);
	}
}

function writeCurrentDirectory(path) {
	if (isDirectory(path)) {
		node.process.current.chdir(path);
		return path;
	}
}
function writeFile(path, value, safe = true) {
	if (!isPath(path) || safe == "overwrite" && isFile(path)) {
		writeDirectory(pathDirectory(path));
		removeFile(path);
		node.fs.writeFileSync(path, value);
		return path;
	}
}
function writeDirectory(path, safe = true) {
	if (isPath(path)) {
		if (isDirectory(path)) {
			return path;
		} else if (isLink(path) && safe == "overwrite") {
			removeLink(path);
			return writeDirectory(path);
		}
	} else {
		const directories = [];
		while (true) {
			if (isDirectory(path)) {
				break;
			} else if (!isPath(path)) {
				directories.push(pathName(path));
				path = pathDirectory(path);
			} else {
				return undefined;
			}
		}
		while (directories.length) {
			path = pathJoin(path, directories.pop());
			node.fs.mkdirSync(path);
		}
		return path;
	}
}
function writeLink(path, safe = true) {
	if (!isPath(path) || safe == "overwrite" && isLink(path)) {
		writeDirectory(pathDirectory(path));
		removeLink(path);
		node.fs.symlinkSync(path, value);
		return path;
	}
}

function removeFile(path) {
	if (isFile(path)) {
		node.fs.unlinkSync(path);
		return path;
	}
}
function removeDirectory(path, recursive = false) {
	if (isDirectory(path)) {
		if (isLink(path)) {
			return removeLink(path);
		} else if (isDirectory(path)) {
			const paths = readDirectory(path, "recursive");
			if (recursive == "recursive") {
				for (const path of paths) {
					if (isFile(path)) {
						removeFile(path);
					} else {
						node.fs.rmdirSync(path);
					}
				}
				return path;
			} else if (paths.length == 1) {
				node.fs.rmdirSync(path);
				return path;
			}
		}
	}
}
function removeLink(path) {
	if (isLink(path)) {
		node.fs.unlinkSync(path);
		return path;
	}
}

function process(arguments, options) {
	const result = node.process.child.spawnSync(arguments[0], arguments.slice(1), {stdio: options?.silent ?? true ? "pipe" : "inherit", cwd: options?.directory, env: options?.environment, encoding: options?.encoding ?? "utf-8"});
	assert(result.status == 0);
	return {output: result.stdout, error: result.stderr};
}

function getHost() {
	let hosts = [];
	for (const [name, interface] of Object.entries(node.os.networkInterfaces())) {
		for (const {address, family, internal} of interface) {
			if (family == "IPv4" && !internal) {
				hosts.push(address);
			}
		}
	}
	assert(hosts.length == 1);
	return hosts[0];
}

const sourceFile = readPath(node.process.current.argv[1]);
const directory = pathDirectory(sourceFile);
const rsaFile = pathJoin(directory, "rsa.txt");
const certificateFile = pathJoin(directory, "certificate.txt");

function getJson() {
	return JSON.parse(readFile(pathJoin(directory, "index.json")));
}

function getRsaFile() {
	if (!isFile(rsaFile)) {
		process(["openssl", "genrsa", "-out", rsaFile, certificate.rsa]);
	}
	return rsaFile;
}

function getCertificateFile(host) {
	const certificate = getJson().certificate;
	if (isFile(certificateFile)) {
		function modulus(type, file) {
			const result = process(["openssl", type, "-modulus", "-noout", "-in", file]);
			const prefix = "Modulus=";
			assert(result.output.startsWith(prefix));
			return result.output.slice(prefix.length).trim();
		}
		assert(modulus("rsa", getRsaFile()) == modulus("x509", certificateFile));
		const subjectPrefix = "Subject:";
		const subjectProcess = process(["openssl", "x509", "-text", "-noout", "-in", certificateFile]);
		const subjectLines = subjectProcess.output.split("\n").map(line => line.trim()).filter(line => line.startsWith(subjectPrefix));
		assert(subjectLines.length == 1);
		const subjectLine = subjectLines[0].slice(subjectPrefix.length).trim();
		const subject = Object.fromEntries(subjectLine.split(",").map(value => value.split("=").map(value => value.trim())));
		assert(subject.O == certificate.organization && subject.OU == certificate.unit && subject.C == certificate.country && subject.ST == certificate.state && subject.L == certificate.location && subject.CN == host);
	} else {
		const subject = `/O=${certificate.organization}/OU=${certificate.unit}/C=${certificate.country}/ST=${certificate.state}/L=${certificate.location}/CN=${host}`;
		const extension = `subjectAltName = IP:${host}`;
		process(["openssl", "req", "-new", "-x509", "-sha512", "-key", getRsaFile(), "-days", certificate.duration, "-subj", subject, "-addext", extension, "-out", certificateFile]);
	}
	return certificateFile;
}

const host = getHost();
const port = parseInt(node.process.current.argv[2]);
const key = readFile(getRsaFile());
const cert = readFile(getCertificateFile(host));
let server = port == 443 ? require("node:https").createServer({key, cert}) : require("node:http").createServer();
node.process.current.on("exit", () => server.close());
server.on("error", error => { throw error; });

function readSecurePath(directory, path) {
	path = pathNormalize(path);
	if (directory == "." || isParentPath(directory, path) && isPath(path)) {
		return path;
	}
}
server.on("request", (request, response) => {
	const utc = Date.now();
	const responseLog = (status, value = {}) => {
		value = Object.entries(value).map(([key, value]) => `${key}=${value}`);
		console.log(dateTimeString(dateTime(utc)), request.socket.remoteAddress, (status ?? "undefined").toString(), request.method, request.url, ...value);
	};
	const responseValue = (status, file, type, value, encoding) => {
		const size = Buffer.byteLength(value, encoding);
		const header = {"Content-Type": type, "Content-Length": size};
		response.writeHead(status, header).end(value, encoding);
		responseLog(status, {file: pathParent(directory, file), type, size});
	};
	const responseFile = (file, type, encoding) => {
		return responseValue(200, file, type, readFile(file, encoding), encoding);
	};
	const responseIndex = (status, type, value = {}) => {
		const file = pathJoin(directory, "index.html");
		return responseValue(status, file, "text/html", readFile(file).replace("${response}", JSON.stringify({type, utc, name: getJson().certificate.unit, address: request.socket.remoteAddress, ...value})), "utf-8");
	};
	const response404 = url => responseIndex(404, "404", {url});
	if (request.url.startsWith("/")) {
		let relativePath = pathNormalize(request.url.slice(1));
		if (!getJson().secret.includes(relativePath) && (relativePath == "." || isParentPath(directory, relativePath))) {
			let absolutePath = pathJoin(directory, relativePath);
			let absoluteDirectoryPath = pathJoin(pathDirectory(absolutePath), pathName(absolutePath, false));
			if (isDirectory(absolutePath)) {
				const paths = [];
				if (relativePath == ".") {
					for (const address of getJson().network) {
						paths.push({type: "address", value: address});
					}
				}
				for (const path of readDirectory(absolutePath)) {
					if (!getJson().secret.includes(pathJoin(relativePath, path))) {
						if (isDirectory(pathJoin(absolutePath, path))) {
							paths.push({type: "directory", value: path});
						} else {
							paths.push({type: "file", value: path});
						}
					}
				}
				return responseIndex(200, "directory", {directory: relativePath == "." ? "" : relativePath, paths});
			} else if (isFile(absolutePath)) {
				let type = "application/octet-stream";
				let encoding = "binary";
				switch (pathExtension(absolutePath)) {
					case ".pdf": type = "application/pdf"; break;
					case ".png": type = "image/png"; break;
					case ".ttf": type = "font/ttf"; break;
					default: type = "text/plain"; encoding = "utf-8"; break;
				}
				return responseFile(relativePath, type, encoding);
			} else if (pathExtension(relativePath) == ".zip" && isDirectory(absoluteDirectoryPath)) {
				const type = "application/zip";
				const encoding = "binary";
				const zipFile = pathJoin(readTemporaryDirectory(), pathName(relativePath));
				responseLog(200, {file: relativePath, type, action: "zip"});
				const zip = readFile(zipFile, encoding);
				return responseValue(200, relativePath, type, zip, encoding);
			} else {
				return response404(relativePath);
			}
		} else {
			return response404(relativePath);
		}
	} else {
		response404(`"${request.url}"`);
	}
});
server.listen({host, port}, () => {
	let url = "";
	switch (port) {
		case 443: url = `https://${host}`; break;
		case 80: url = `http://${host}`; break;
		default: url = `${host}:${port}`; break;
	}
	console.log(cert);
	console.log(dateTimeString(dateTime()), url);
});
