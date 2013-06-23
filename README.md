# Munch.js

Munch.js is a utility that rewrites classes and ids in CSS, HTML, and JavaScript files in order to save precious bytes and obfuscate your code. based on [Craig Campbell](http://www.craigiam.com/)'s [HTML-Muncher](http://htmlmuncher.com).

Install by using `npm install -g munch`

This module uses [Hashids](https://npmjs.org/package/hashids) to generate the class and ID names. Just to look more googly.

**Please take note that I am not confident that this library is perfect for every kind of project out there. please use sparingly.**

**This library was made solely for the deployment process, and is done at the first steps before minifying the assets**

## USAGE
This is a command line utility so it is preferred that you install this globally using the `-g` flag.

You can run `munch` using the format below
```
munch --css file1.css,/path/to/css1,file2.css,file3.css --view /path/to/views1,file1.html,/path/to/views2/,file3.html --js main.js,/path/to/js
```

### REQUIRED ARGUMENTS:

#### --view {path/to/views}
html files to rewrite (comma separated list of directories and files)

### OPTIONAL ARGUMENTS:

#### --css {path/to/css}          
css files to rewrite (comma separated list of directories and files)

#### --js {path/to/js}            
js files to rewrite (comma separated list of directories and files)

#### --manifest                   
a file where all options available for muncher are stored. this can be any json files or a .muncher file by default. useful for deployment purposes.

#### --view-ext {extension}       
sets the extension to look for in the view directory (defaults to html)

#### --css-ext                    
sets the extension to look for in the css directory (defaults to css)

#### --js-ext                     
sets the extension to look for in the js directory (defaults to js)

#### --ignore {classes,ids}       
comma separated list of classes or ids to ignore when rewriting css (ie .sick_class, #sweet_id)

#### --compress-view              
strips new line characters to compress html files specified with --html

#### --compress-css               
strips new line characters to compress css files specified with --css

#### --map                        
writes all mapped ids and classes into a file specified

#### --read                       
uses all the mapped ids and classes in a specified file to be used as a dictionary for the rewrite process

#### --parsers                    
modules for parsing and writing (comma separated list of module names) check out https://github.com/jmrocela/munch-jquery for an example.

#### --show-savings               
will output how many bytes were saved by munching

#### --silent                     
do not output any information about the process (not recommended)