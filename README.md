file-magik [![npm version](https://badge.fury.io/js/file-magik.svg)](https://badge.fury.io/js/file-magik)  ![David](https://david-dm.org/afloyd/file-magik.svg)
===============

An extremely useful function that can recursively look through a given directory structure and require/map all the
contained files into an object you choose

```
require('file-magik').mapForExports(
	{
		path : './routes',							// Path to map
		extension: '.js',							// Extension of files to include. Pass `null` to include all extensions
		recursive : true,							// Whether to recurse into folders of `path`
		excludeDirectories: [],       				// Either specific full path strings to match, or regex patterns
		excludeFiles : [/index\.js/, /-tests.js$/], // Either specific full path strings to match, or regex patterns
		convertDashedNames: true,     				// Convert dashed file names into camelCase on `exports` object (my-file.js become exports.myFile)
		namespaceSubdirectories : true,				// Create a hierarchy files in `exports` object
		requireSiblingsBeforeRecursion: true,		// Require siblings in object before further recursion
		mapForExports: true							// Use `new` keyword when requiring exported functions to attach to `exports` object
		requireOpts: {								// Only require files/folders with given prefix after others in same folder are required
			prefix: '$',		
			requireLast: true
		}
		exports : moduleExports,					// [optional] The object to store the results on. If empty a new object is created and returned
		exportsOpts : {app: app} 					// If the module is exporting a function, `exportOpts`  will be passed into the function and the result 
								 					// 		will be stored on the `exports` object 
	});
```

The above will recursive go through your entire `routes` folder, requiring all `.js` files passing in the `app` object
for them to use. Any dashed `file-names` will be come camel cased `fileNames` on the object

More documentation to come...

(The MIT License)

Copyright &copy; 2014-2016 Austin Floyd &lt;texsc98@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
		distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

		The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

		THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
		EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
		IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
		TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


