'use strict';
const fs = require('fs'),
	path = require('path'),
	debug = require('debug'),
	pkg = require('./package.json');

const cwd = process.cwd();
const cwdLength = cwd.length;
const pkgName = pkg?.name || 'file-magik';
const logLevels = ['debug', 'info', 'warn', 'error', 'critital'];

const getDebug = ({level = 'debug', filePath, relFilePath, suffix} = {level: 'debug'})=> {
	if (!relFilePath && filePath) {
		relFilePath = filePath.substring(cwdLength);
	}
	// let debugLog = debug(`${pkgName}:${relFilePath || '?'}:${suffix || '?'}:${level}`);
	let debugObj = {};
	logLevels.forEach((level) => {
		debugObj[level] = (...rest) => {
			const logLevelPrefix = `${level}:`;
			const debugLogger = debug(`${pkgName}:${logLevelPrefix}:${relFilePath || '?'}:${suffix || '?'}`);

			// Prefix all logging with date
			debugLogger(new Date().toISOString() + ` -- ${logLevelPrefix}`, ...rest);
		};
	});

	return debugObj;
};
const pkgDebugLogger = getDebug();

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
	const debugLogger = getDebug({ filePath: pathToSearch });
	debugLogger.debug('get init');
	if (!pathToSearch) {
		return debugLogger.error('pathToSearch not specified');
	}

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
	debugLogger.debug(`files found:${files.length}`);
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
		} else {
			debugLogger.debug(`${filePath} not included based on configured opts`);
		}
	});
	debugLogger.info(`opts.recursive:${opts.recursive}`);
	if (!!opts.recursive) {
		files.filter(function (directoryPath) {
			const isDirectory = fs.statSync(directoryPath).isDirectory();
			if (isDirectory) {
				const debugLogger = getDebug({ filePath: directoryPath });
				debugLogger.debug(`isDirectory:${isDirectory}`);
			}
			return isDirectory;
		}).forEach(function (directoryPath) {
			const debugLogger = getDebug({ filePath: directoryPath });

			var dirName = directoryPath.split(path.sep) .pop();
			var excludePatternMatched = excludeDirectories.filter((pattern) => {
					const isMatch = typeof pattern !== 'string' && dirName.match(pattern);
					if (isMatch) {
						debugLogger.debug(`${dirName} matches excluded directory pattern`);
					}
					return isMatch;
				}).length > 0;
			if (!excludePatternMatched && excludeDirectories.indexOf(dirName) === -1) {
				var subDirJsFilePaths = getFilePaths(directoryPath, opts);
				results = results.concat(subDirJsFilePaths);
				debugLogger.debug(`subDirJsFilePaths length:${results.length}`);
			} else {
				debugLogger.debug(`${dirName} excluded due to configured opts`);
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
	const debugLogger = getDebug({ filePath: opts.path });
	debugLogger.debug('mapForExports init');

	opts.exports = opts.exports || {};
	prepareOpts(opts);
	opts.useNewWithExports = opts.useNewWithExports || false;

	var mapResult = exports.mapPathsToObject(opts) || {};
	exports.requireFiles(mapResult, opts);
	return mapResult;
};

exports.requireFiles = function requireFiles(obj, opts) {
	const debugLogger = getDebug({ filePath: opts.path });
	debugLogger.debug('requireFiles init');

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
	const debugLogger = getDebug({ filePath: path });
	debugLogger.debug('requireFile');

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
	const debugLogger = getDebug({ filePath: opts.path });
	debugLogger.debug('mapPathsToObject init');
	prepareOpts(opts);

	var libraries = exports.get(opts.path, opts),
		obj = opts.exports || {},
		convertDashedNames = typeof opts.convertDashedNames !== 'undefined' ? opts.convertDashedNames : true;

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
	const debugLogger = getDebug({ filePath: opts.path });
	debugLogger.debug('prepareOpts init');
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
		debugLogger.debug(`opts.namespaceSubdirectories:${opts.namespaceSubdirectories} forcing implied recursion. opts.recursive:${opts.recursive}`);
	}

	if (opts.recursive && !opts.namespaceSubdirectories) {
		debugLogger.warn('file-magik: For ', opts.path, ' recursive is true but namespaceSubdirectories is not. ' +
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
