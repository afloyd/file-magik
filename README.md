file-magik
===============

An extremely useful function that can recursively look through a given directory structure and require/map all the
contained files into an object you choose

```
require('file-magik').mapForExports(
	{
		path : './routes',
		recursive : true,
		excludeFiles : [/index\.js/],
		namespaceSubdirectories : true,
		exports : moduleExports,
		exportsOpts : app
	});
```

The above will recursive go through your entire `routes` folder, requiring all `.js` files passing in the `app` object
for them to use. Any dashed `file-names` will be come camel cased `fileNames` on the object

More documentation to come...

(The MIT License)

Copyright &copy; 2014 Austin Floyd &lt;texsc98@gmail.com&gt;

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


