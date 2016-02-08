'use strict';
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

	var extension = opts.extension === undefined ? '.js' : opts.extension,
		regexMatchPatterns = opts.regexMatchPatterns || [],
		excludeFiles = opts.excludeFiles || [],
		excludeDirectories = opts.excludeDirectories || [],
		directoriesAreIncluded = opts.directoriesAreIncluded || false,
		convertDashedNames = typeof opts.convertDashedNames !== 'undefined' ? opts.convertDashedNames : true,
		getNames = opts.getNames || false,
		results = [];
	var files = fs.readdirSync(path.resolve(pathToSearch))
		.map(function (fileName) {
			return path.resolve(pathToSearch, fileName);
		});
	files.forEach(function (filePath) {
		var fileName = filePath.split(path.sep).pop();
		fileName = fileName.substring(0, fileName.length - (extension ? extension.length : 0));
		var regexMatches = regexMatchPatterns.filter(function (pattern) {
				return typeof pattern !== 'string' && filePath.match(pattern);
			}),
			regexMatch = regexMatchPatterns.length ? regexMatches.length : true;
		var excludePatternMatch = excludeFiles.filter(function (pattern) {
				return typeof pattern !== 'string' && filePath.match(pattern);
			}).length > 0;

		var isFile = fs.statSync(filePath).isFile(),
			included =
				//not excluded regex pattern
				regexMatch && !excludePatternMatch &&
					//not excluded file name
				excludeFiles.indexOf(fileName) === -1 &&
					//have extension & matches, or is directory
				((isFile && !extension) || (extension && filePath.substr(-1 * extension.length) === extension) || !isFile) &&
					//is a file, or require directories flag true
				(isFile || (directoriesAreIncluded && !isFile));

		if (included) {
			if (!getNames) {
				results.push(filePath);
			} else {
				results.push({name: convertDashedNames ? convertDashedName(fileName) : fileName, path: filePath});
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

/**
 * Maps file paths of the specified `opts.extension` (default == '.js') to an object (either `opts.exports` or empty
 * object that is returned). If `opts.namespaceSubdirectories`
 * is true `opts.recursive` is implied true. NamespaceSubdirectories will create a hierarchy respective to the
 * directory/file path. Very useful for requiring a lib folder with commonly used modules to have them all available!
 * @param opts
 */
exports.mapForExports = function mapForExports(opts) {
	opts.exports = opts.exports || {};
	prepareOpts(opts);
	opts.useNewWithExports = opts.useNewWithExports || false;

	var mapResult = exports.mapPathsToObject(opts) || {};
	exports.requireFiles(mapResult, opts);
	return mapResult;
};

exports.requireFiles = function requireFiles(obj, opts) {
	var exportsOpts = opts.exportsOpts,
		recursive = typeof opts.recursive !== 'undefined' ? opts.recursive : true,
		requireSiblingsBeforeRecursion = !!opts.requireSiblingsBeforeRecursion,
		requireOpts = opts.requireOpts;

	var libraryNames = Object.keys(obj),
		recursionObjs = [],
		lastRequires = [],
		lastRecursionObjs = [];
	for (var i= libraryNames.length; i--;) {
		var name = libraryNames[i],
			propertyValue = obj[name],
			pushToLast = requireOpts &&
				name[0] === requireOpts.prefix &&
				name[0] === requireOpts.prefix && requireOpts.requireLast;

		if (typeof propertyValue !== 'string') {// handle sub-object
			// push off recursion until after immediate siblings are resolved
			if (requireSiblingsBeforeRecursion) {
				if (!pushToLast) recursionObjs.push(propertyValue); // not a last require match, but siblings come first
				else lastRecursionObjs.push(propertyValue); // must require siblings & other objects before this one
			}
			else {
				if (!pushToLast) requireFiles(propertyValue, opts); // sibling order doesn't matter, and not last require match
				else lastRecursionObjs.push(propertyValue); // last require match, must require other sibling objects first
			}
			continue;
		}

		if (!pushToLast) requireFile(obj, name, propertyValue, opts);
		else lastRequires.push({
			name: name,
			path: propertyValue
		});
	}

	recurseObjs(recursionObjs, opts);

	// Always require immediate siblings first
	for(var lrIdx = lastRequires.length; lrIdx--;) {
		if (!recursive) continue;
		var lastRequireValues = lastRequires[lrIdx];
		requireFile(obj, lastRequireValues.name, lastRequireValues.path, opts);
	}

	// Start recursion into last objects
	recurseObjs(lastRecursionObjs, opts);

	return obj;
};

function recurseObjs(objs, opts) {
	var recursive = typeof opts.recursive !== 'undefined' ? opts.recursive : true;
	for(var oIdx = objs.length; oIdx--;) {
		if (!recursive) continue;

		exports.requireFiles(objs[oIdx], opts);
	}
}

function requireFile(o, name, path, opts) {
	var fileExports = require(path);
	if (typeof fileExports !== 'function' || !opts.exportsOpts) {
		o[name] = fileExports;
	} else {
		o[name] = opts.useNewWithExports ? new fileExports(opts.exportsOpts) : fileExports(opts.exportsOpts);
	}
}

/**
 * Maps file paths of the specified `opts.extension` (default == '.js') to an object. If `opts.namespaceSubdirectories`
 * is true `opts.recursive` is implied true. NamespaceSubdirectories will create a hierarchy respective to the
 * directory/file path. Very useful for requiring a lib folder with commonly used modules to have them all available!
 * @param opts
 */
exports.mapPathsToObject = function mapPathsToObject(opts) {
	prepareOpts(opts);

	var libraries = exports.get(opts.path, opts),
		obj = opts.exports || {},
		convertDashedNames = typeof opts.convertDashedNames !== 'undefined' ? opts.convertDashedNames : true;;

	libraries.sort(function (a, b) {
		if (a < b) return -1;
		if (a === b) return 0;
		return 1;
	}).forEach(function (library) {
		var namespace = obj;
		if (opts.namespaceSubdirectories) {
			var namespaces = library.path.substring(library.path.indexOf(opts.path) + opts.path.length + 1);
			namespaces = namespaces.split(path.sep);
			namespaces.pop(); //remove filename

			namespaces.forEach(function (name) {
				var name = convertDashedNames ? convertDashedName(name, opts) : name;
				if (!namespace[name]) {
					namespace[name] = {};
				}
				namespace = namespace[name];
			});
		}

		namespace[library.name] = library.path; // library name dash converted in exports.get
	});
	return obj;
};

function prepareOpts(opts) {
	if (!opts.path) {
		throw new Error('path not specified');
	}

	opts.path = opts.path.replace(/(\/|\\)/gi, path.sep);
	opts.path = path.resolve(opts.path);
	opts.getNames = true;
	opts.namespaceSubdirectories = opts.namespaceSubdirectories || false;
	opts.exportsOpts = opts.exportsOpts || undefined;

	if (opts.namespaceSubdirectories) {
		opts.recursive = true; //implied recursion
	}

	if (opts.recursive && !opts.namespaceSubdirectories) {
		console.warn('file-magik: For ', opts.path, ' recursive is true but namespaceSubdirectories is not. ' +
			'Subdirectory files with same name will overwrite parents!');
	}
}

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
