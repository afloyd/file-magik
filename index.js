var fs = require('fs'),
	path = require('path');

/**
 * Gets all file paths with the given extension. Can optionally do it recursively, and exclude named files and/or
 * directories
 * @param pathToSearch	{String}	The base path
 * @param extension		{String}	File extensions to search for
 * @param opts			{Object}
 * 		recursive			: Whether or not to search recursively
 * 		excludeFiles		: Files to exclude from the results (without the extension)
 * 		excludeDirectories	: Directory names to exclude from recursive search
 * @return {*}
 */
exports.get = function getFilePaths (pathToSearch, opts) {
	if (!pathToSearch) { return console.error('pathToSearch not specified'); }

	var extension = opts.extension || '.js',
		excludeFiles = opts.excludeFiles || [],
		excludeDirectories = opts.excludeDirectories || [],
		directoriesAreIncluded = opts.directoriesAreIncluded || false,
		getNames = opts.getNames || false,
		results = [];
	var files = fs.readdirSync(path.resolve(pathToSearch))
		.map(function (fileName) {
			return path.resolve(pathToSearch, fileName);
		});
	files.forEach(function (filePath) {
		var fileName = filePath.split(path.sep).pop();
		fileName = fileName.substring(0, fileName.length - extension.length);
		var excludePatternMatch = excludeFiles.filter(function (pattern) {
			return typeof pattern !== 'string' && filePath.match(pattern);
		}).length > 0;

		var isFile = fs.statSync(filePath).isFile(),
			included = !excludePatternMatch &&											//not excluded regex pattern
				excludeFiles.indexOf(fileName) === -1 && 								//not excluded file name
				(filePath.substr(-1 * extension.length) === extension || !isFile) && 	//extension matches or is directory
				(isFile || (directoriesAreIncluded && !isFile)); 						//is a file, or require directories flag true

		if (included) {
			if (!getNames) {
				results.push(filePath);
			} else {
				results.push({name: convertDashedName(fileName), path: filePath});
			}
		}
	});
	if (!!opts.recursive) {
		files.filter(function (directoryPath) {
			return fs.statSync(directoryPath).isDirectory();
		}).forEach(function (directoryPath) {
			var dirName = directoryPath.split(path.sep).pop();
			var excludePatternMatched = excludeDirectories.filter(function (pattern) {
				return typeof pattern !== 'string' && dirName.match(pattern);
			}).length > 0;
			if (!excludePatternMatched && excludeDirectories.indexOf(dirName) === -1) {
				var subDirJsFilePaths = getFilePaths(directoryPath, opts);
				results = results.concat(subDirJsFilePaths);
			}
		});
	}

	return results;
};

exports.mapForExports = function mapForExports(opts) {
	if (!opts.path || !opts.exports) { return console.error('path or exports not specified');}
	opts.path = opts.path.replace(/(\/|\\)/gi, path.sep);
	opts.path = path.resolve(opts.path);
	opts.getNames = true;
	var libraries = exports.get(opts.path, opts),
		exportsOpts = opts.exportsOpts;

	libraries.sort(function (a, b) {
		if (a < b) return -1;
		if (a === b) return 0;
		return 1;
	}).forEach(function (library) {
		var namespace = opts.exports;
		if (opts.namespaceSubdirectories) {
			var namespaces = library.path.substring(library.path.indexOf(opts.path) + opts.path.length + 1);
			namespaces = namespaces.split(path.sep);
			namespaces.pop(); //remove filename

			namespaces.forEach(function (name) {
				if (!namespace[name]) {
					namespace[name] = {};
				}
				namespace = namespace[name];
			});
		}

		var moduleExports = require(library.path);
		if (!exportsOpts || (exportsOpts && typeof moduleExports !== 'function')) {
			namespace[library.name] = moduleExports;
		} else {
			namespace[library.name] = require(library.path)(exportsOpts);
		}
	});
};

function convertDashedName(name) {
	var dashedIdxs = name.match(/-[a-z]/g),
		camelCased = name;

	if (!dashedIdxs) {
		return camelCased;
	}

	dashedIdxs.forEach(function (match) {
		camelCased = camelCased.replace(match, match.substr(-1).toUpperCase());
	});

	return camelCased;
}