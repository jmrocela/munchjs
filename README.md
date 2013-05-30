# Munch.js

[![Build Status](https://travis-ci.org/jmrocela/munchjs.png?branch=master)](https://travis-ci.org/jmrocela/munchjs)

Munch.js is a utility that rewrites classes and ids in CSS, HTML, and JavaScript files in order to save precious bytes and obfuscate your code. based on [Craig Campbell](http://www.craigiam.com/)'s [HTML-Muncher](http://htmlmuncher.com).

Install by using `npm install munch`

This module uses [Hashids](https://npmjs.org/package/hashids) to generate the class and ID names. Just to look more googly.

## USAGE
You can run munch through CLI by doing this.
```
munch --css file1.css,/path/to/css1,file2.css,file3.css --html /path/to/views1,file1.html,/path/to/views2/,file3.html --js main.js,/path/to/js
```

### REQUIRED ARGUMENTS

**--html {path/to/views}** - html files to rewrite (comma separated list of directories and files)

### OPTIONAL ARGUMENTS
**--css {path/to/css}** - css files to rewrite (comma separated list of directories and files)

**--js {path/to/js}** - js files to rewrite (comma separated list of directories and files)

**--view-ext {extension}** - sets the extension to look for in the view directory (defaults to html)

**--ignore {classes,ids}** - comma separated list of classes or ids to ignore when rewriting css (ie .sick_class,#sweet_id)

**--compress-html** - strips new line characters to compress html files specified with --html be careful when using this becuase it has not been thoroughly tested

**--show-savings** - will output how many bytes were saved by munching

**--verbose** - output more information while the script runs
