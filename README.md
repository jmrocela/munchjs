# Munch.js

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

**--framework** - name of js framework to use for selectors (currently only jquery or mootools)

**--selectors** - comma separated custom selectors using css selectors" for example if you have $.qs("#test .div") this param would be qs

**--id-selectors** - comma separated id selectors with strings" for example if you are using .addId("test") this param would be addId

**--class-selectors** - comma separated class selectors with strings" for example if you have selectClass("my_class") this param would be selectClass

**--js-manifest** - path to a js file containing class name/id constants

**--rewrite-constants** - when using a manifest file this will take any constants with values as strings and rewrite the values to be numbers

**--show-savings** - will output how many bytes were saved by munching

**--verbose** - output more information while the script runs

**--help** - shows this menu
