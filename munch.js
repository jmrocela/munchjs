#!/usr/bin/env node
/**
 * MUNCH.js
 * http://jmrocela.github.com/munchjs
 *
 * munch.js is a utility that rewrites classes and ids in CSS, HTML, and JavaScript files
 * in order to save precious bytes and obfuscate your code.
 *
 * Copyright (c) 2013 John Rocela
 * Licensed under the MIT license.
 * https://github.com/gruntjs/grunt/blob/master/LICENSE-MIT
 */

'use strict';

var    path = require('path'),
       glob = require('glob'),
         fs = require('fs'),
      jsdom = require('jsdom').jsdom,
          $ = require('jquery'),
        clc = require('cli-color'),
      parse = require('css-parse'),
    Hashids = require('hashids'),
    hashids = new Hashids("use the force harry");

/** 
 *
 */
var Muncher = function(args) {

    // tokens from files within views, css and js together
    this.map = {
        "id": {},
        "class": {}
    };

    // files, keep track of sizes
    this.files = { }

    // token counter
    this.mapCounter = 0;

    // ignore classes
    this.ignoreClasses = [ "no-js" ]; // @BUG not respected, related to not properly iterating over arrays
    this.ignoreIds = [ ];

    // a reference to `this`
    var that = this;
    
    // set the ignore maps for Ids and Classes
    this.ignore = args['ignore'] || '';
    this.ignore.split(',').forEach(function(ign) {
        ign = ign.replace(/\s/,'');
        if (ign.indexOf('.') === 0) that.ignoreClasses.push(ign.replace('.', ''));
        if (ign.indexOf('#') === 0) that.ignoreIds.push(ign.replace('#', ''));
    });

    // set the default view extension
    this.extensions = {
        "view": args['view-ext'] || '.html',
        "css": args['css-ext'] || '.css',
        "js": args['js-ext'] || '.js'
    }

    // you may want to use another way for compressing CSS and JS
    this.compress = {
        "view": true,
        "css": false,
        "js": false
    }

    // if we want to nag the CLI
    this.silent = (args['silent'] === true);
    this.showSavings = (args['show-savings'] === true);

    // paths given from the configuration
    this.paths = {
        "view": args['view'],
        "css": args['css'],
        "js": args['js']
    }

    // custom parser collection
    this.parsers = {
        "js": []
    }

    // chainable
    return this;
}

/** 
 * run
 *
 * Sets various options to run the Muncher
 *
 * @param args Object an optimist.args object.
 */
Muncher.prototype.run = function() {
    // we make a reference to `this`
    var that = this;

    // run through the HTML files
    if (that.paths["view"]) {
        
        that.echo(clc.bold('Processing Views'));

        that.paths["view"].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.extensions['view']);

                files.forEach(function(file) {
                    that.parse(file, 'html');
                });

            } else if (fs.statSync(path).isFile()) {
                that.parse(path, 'html');
            }
        });
        
        that.echo(clc.green.bold('Finished!\n'));
    }

    if (that.paths['css']) {
        
        that.echo(clc.bold('Processing CSS'));

        that.paths['css'].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.extensions['css']);

                files.forEach(function(file) {
                    that.parse(file, 'css');
                });

            } else if (fs.statSync(path).isFile()) {
                that.parse(path, 'css');
            }
        });
        
        that.echo(clc.green.bold('Finished!\n'));
    }

    if (that.paths['js']) {
        
        that.echo(clc.bold('Processing JS'));

        that.paths['js'].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.extensions['js']);

                files.forEach(function(file) {
                    that.parse(file, 'js');
                });

            } else if (fs.statSync(path).isFile()) {
                that.parse(path, 'js');
            }
        });
        
        that.echo(clc.green.bold('Finished!\n'));
    }
        
    that.echo(clc.bold('-------------------------------\nMapped ' + that.mapCounter + ' IDs and Classes.\n-------------------------------\n'));

    // we do it again so that we are sure we have everything we need
    if (that.paths["view"]) {

        that.echo(clc.bold('Rewriting Views'));

        that.paths["view"].split(',').forEach(function(path) {
            if (fs.lstatSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.extensions['view']);

                files.forEach(function(file) {
                    that.build(file, 'html');
                });

            } else if (fs.lstatSync(path).isFile()) {
                that.build(path, 'html');
            }
        });
        
        that.echo(clc.green.bold('Finished!\n'));

    }

    if (that.paths['css']) {

        that.echo(clc.bold('Rewriting CSS'));

        that.paths['css'].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.extensions['css']);

                files.forEach(function(file) {
                    that.build(file, 'css');
                });

            } else if (fs.statSync(path).isFile()) {
                that.build(path, 'css');
            }
        });
        
        that.echo(clc.green.bold('Finished!\n'));

    }

    if (that.paths['js']) {

        that.echo(clc.bold('Rewriting JS'));

        that.paths['js'].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.extensions['js']);

                files.forEach(function(file) {
                    that.build(file, 'js');
                });

            } else if (fs.statSync(path).isFile()) {
                that.build(path, 'js');
            }
        });
        
        that.echo(clc.green.bold('Finished!\n'));

    }

}

Muncher.prototype.echo = function(message) {
    if (!this.silent) console.log(message);
}

// parse the files
Muncher.prototype.parse = function(file, context) {

    if (fs.existsSync(file)) {
        this.echo(file);

        var content = fs.readFileSync(file, 'utf8').toString();

        this.files[file] = fs.statSync(file).size;

        switch (context) {
            case "html":
                this.parseHtml(content);
            break;
            case "css": 
                this.parseCss(content);
            break;
            case "js": 
                this.parseJs(content);
            break;
        }

    } else {
        this.echo(clc.red(file + ' doesn\'t exist'));
    }

}

// build the files
Muncher.prototype.build = function(file, context) {

    var content = fs.readFileSync(file, 'utf8').toString();

    switch (context) {
        case "html":
            this.rewriteHtml(content, file);
        break;
        case "css": 
            this.rewriteCss(content, file);
        break;
        case "js": 
            this.rewriteJs(content, file);
        break;
    }

    fs.writeFileSync('map.json', JSON.stringify(this.map, null, '\t'));

}

// builds the id and class maps
Muncher.prototype.parseHtml = function(html) {
    var that = this,
        html = $(html);

    html.find('*').each(function(i, elem) {
        var target = html.find(elem),
                id = target.attr('id'),
           classes = target.attr('class');

        if (id) {
            that.addId(id);
        }

        if (classes) {
            var newClass = [];

            classes.split(' ').forEach(function(cl) {
                that.addClass(cl);
            });

        }

        if (target.is('style')) {
            var  style = target.text();
            that.parseCss(style);
        }

    });

    // parse JS
    var script = '';
    html.filter('script').each(function(i, tag) {
        script += this.text || this.textContent || this.innerHTML || '';
    });
    if (script != '') {
        that.parseJs(script);
    }

}

Muncher.prototype.parseCss = function(css) { 
    var that = this,
         css = parse(css);

    css.stylesheet.rules.forEach(function(style) {
        if (!style.selectors) return; 

        style.selectors.forEach(function(selector) {
            var tid = selector.match(/#[\w\-]+/gi),
                tcl = selector.match(/\.[\w\-]+/gi);

            if (tid) {
                tid.forEach(function(match) {
                    var id = match.replace('#', '');
                    that.addId(id);
                });
            }
            if (tcl) {
                tcl.forEach(function(match) {
                    var cl = match.replace('.', '');
                    that.addClass(cl);
                });
            }
        });

    });
}

Muncher.prototype.addClass = function(cl) {
    var that = this;

    var addClass = function(cls) {
        if (!that.ignoreClasses.indexOf(cls)) return; // shoul be a list of no-nos
        if (!that.map["class"][cls]) {
            that.map["class"][cls] = hashids.encrypt(that.mapCounter); 
            that.mapCounter++;
        }
    }

    if (typeof cl == 'object'){
        if (cl) {
            cl.forEach(function(pass) {
                addClass(pass);
            });
        }
    } else {
        addClass(cl);
    } 
}

Muncher.prototype.addId = function(id) {
    if (!this.map["id"][id]) {
        if (!this.ignoreIds.indexOf(id)) return; // shoul be a list of no-nos
        this.map["id"][id] = hashids.encrypt(this.mapCounter);
        this.mapCounter++;
    }
}

Muncher.prototype.parseJs = function(js) {

    // custom parsers
    if (this.parsers.js.length > 0) {
        this.parsers.js.forEach(function(cb) {
            cb.call(this, js);
        });
    }
    var match;

    // id and class
    var pass4 = /getElementsByClassName\([\'"](.*?)[\'"]/gi;
    while ((match = pass4.exec(js)) !== null) {
        this.addClass(match[1].split(' '));
    }

    var pass5 = /getElementById\([\'"](.*?)[\'"]/gi;
    while ((match = pass5.exec(js)) !== null) {
        this.addId(match[1]);
    }

    // attr
    var pass7 = /setAttribute\([\'"](id|class)[\'"],\s[\'"](.+?)[\'"]/gi;
    while ((match = pass7.exec(js)) !== null) {
        if (match[1] == 'class') this.addClass(match[2].split(' '));
        if (match[1] == 'id') this.addId(match[2]);
    }

}

// replaces the ids and classes in the files specified
Muncher.prototype.rewriteHtml = function(html, to) {
    var     that = this,
        document = jsdom(html),
            html = $(document);

    html.find('*').each(function(i, elem) {
        var target = html.find(elem),
                id = target.attr('id'),
           classes = target.attr('class');

        if (id) {
            if (!that.ignoreIds.indexOf(id)) return;
            target.attr('id', that.map["id"][id]);
        }

        if (classes) {
            var newClass = [];
            classes.split(' ').forEach(function(cl) {
                if (!that.ignoreClasses.indexOf(cl)) return;
                if (that.map["class"][cl]) {
                    target.removeClass(cl).addClass(that.map["class"][cl]);
                }
            });
        }

    });

    // write
    html = document.innerHTML;
    html = this.rewriteJsBlock(html);
    html = this.rewriteCssBlock(html);

    fs.writeFileSync(to + '.munched', (this.compress) ? this.compressHtml(html): html);

    var percent = 100 - ((fs.statSync(to + '.munched').size / this.files[to]) * 100);
    that.echo(clc.blue.bold(percent.toFixed(2) + '%') + ' Saved for ' + to + '.munched');

}

Muncher.prototype.rewriteCssBlock = function(html) {
    var     that = this,
        document = jsdom(html),
            html = $(document);

    html.find('*').each(function(i, elem) {
        var target = html.find(elem);

        if (target.is('style')) {
            var text = target.text(),
                 css = parse(text);

            css.stylesheet.rules.forEach(function(style) {
                var selector = style.selector;

                style.selectors.forEach(function(selector) {
                    var original = selector,
                             tid = selector.match(/#[\w\-]+/gi),
                             tcl = selector.match(/\.[\w\-]+/gi);

                    if (tid) {
                        tid.forEach(function(match) {
                            match = match.replace('#', '');
                            if (!that.ignoreIds.indexOf(match)) return;
                            selector = selector.replace(new RegExp("#" + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '#' + that.map["id"][match]);
                        });
                    }
                    if (tcl) {
                        tcl.forEach(function(match) {
                            match = match.replace('.', '');
                            if (!that.ignoreClasses.indexOf(match)) return;
                            selector = selector.replace(new RegExp("\\." + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '.' + that.map["class"][match]);
                        });
                    }

                    text = text.replace(original, selector);
                });

            });
            
            target.text((that.compress) ? that.compressCss(text): text);
        }

    });

    return document.innerHTML;
}

Muncher.prototype.rewriteCss = function(css, to) {
    var that = this,
        text = css,
         css = parse(css)

    css.stylesheet.rules.forEach(function(style) {
        if (!style.selectors) return; 

        style.selectors.forEach(function(selector) {
            var original = selector,
                     tid = selector.match(/#[\w\-]+/gi),
                     tcl = selector.match(/\.[\w\-]+/gi);

            if (tid) {
                tid.forEach(function(match) {
                    match = match.replace('#', '');
                    if (!that.ignoreIds.indexOf(match)) return;
                    selector = selector.replace(new RegExp("#" + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '#' + that.map["id"][match]);
                });
            }
            if (tcl) {
                tcl.forEach(function(match) {
                    match = match.replace('.', '');
                    if (!that.ignoreClasses.indexOf(match)) return;
                    selector = selector.replace(new RegExp("\\." + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '.' + that.map["class"][match]);
                });
            }

            text = text.replace(original, selector);

        });

    });

    fs.writeFileSync(to + '.munched', (this.compress) ? this.compressCss(text): text);

    var percent = 100 - ((fs.statSync(to + '.munched').size / this.files[to]) * 100);
    that.echo(clc.blue.bold(percent.toFixed(2) + '%') + ' Saved for ' + to + '.munched');
}

Muncher.prototype.rewriteJsBlock = function(html) {
    var     that = this,
        document = jsdom(html),
            html = $(document);

    var match;

    html.find('script').each(function(i, elem) {
        var target = html.find(elem),
        js = target.text();

        // id and class
        var pass4 = /getElementsByClassName\([\'"](.*?)[\'"]/gi;
        while ((match = pass4.exec(js)) !== null) {
            if (!that.ignoreClasses.indexOf(match[1])) continue;
            var passed = match[0].replace(new RegExp(match[1], "gi"), that.map["class"][match[1]]);
            js = js.replace(match[0], passed);
        }

        var pass5 = /getElementById\([\'"](.*?)[\'"]/gi;
        while ((match = pass5.exec(js)) !== null) {
            if (!that.ignoreIds.indexOf(match[1])) continue;
            var passed = match[0].replace(new RegExp(match[1], "gi"), that.map["id"][match[1]]);
            js = js.replace(match[0], passed);
        }

        // attr
        var pass7 = /setAttribute\([\'"](id|class)[\'"],\s[\'"](.+?)[\'"]/gi;
        while ((match = pass7.exec(js)) !== null) {
            var key = (match[1] == 'id') ? 'id': 'class';
            if (key == 'class') {
                var passed = match[0];
                match[2].split(' ').forEach(function(cls) {
                    if (!that.ignoreClasses.indexOf(cls)) return;
                    passed = passed.replace(new RegExp(cls, "gi"), that.map[key][cls]);
                });
            } else {
                if (!that.ignoreIds.indexOf(match[2])) continue;
                var passed = match[0].replace(new RegExp(match[2], "gi"), that.map[key][match[2]]);
            }
            js = js.replace(match[0], passed);
        }

        target.text(js);
    });

    return document.innerHTML;
}

Muncher.prototype.rewriteJs = function(js, to) {
    var  that = this,
        match = null;

    // id and class
    var pass4 = /getElementsByClassName\([\'"](.*?)[\'"]/gi;
    while ((match = pass4.exec(js)) !== null) {
        if (!that.ignoreClasses.indexOf(match[1])) continue;
        var passed = match[0].replace(new RegExp(match[1], "gi"), that.map["class"][match[1]]);
        js = js.replace(match[0], passed);
    }

    var pass5 = /getElementById\([\'"](.*?)[\'"]/gi;
    while ((match = pass5.exec(js)) !== null) {
        if (!that.ignoreIds.indexOf(match[1])) continue;
        var passed = match[0].replace(new RegExp(match[1], "gi"), that.map["id"][match[1]]);
        js = js.replace(match[0], passed);
    }

    // attr
    var pass7 = /setAttribute\([\'"](id|class)[\'"],\s[\'"](.+?)[\'"]/gi;
    while ((match = pass7.exec(js)) !== null) {
        var    key = (match[1] == 'id') ? 'id': 'class',
            passed = '';

        if (key == 'class') {
            var passed = match[0];
            match[2].split(' ').forEach(function(cls) {
                if (!that.ignoreClasses.indexOf(cls)) return;
                passed = passed.replace(new RegExp(cls, "gi"), that.map[key][cls]);
            });
        } else {
            if (!that.ignoreIds.indexOf(match[2])) return;
            var passed = match[0].replace(new RegExp(match[2], "gi"), that.map[key][match[2]]);
        }
        js = js.replace(match[0], passed);
    }

    fs.writeFileSync(to + '.munched', (this.compress) ? this.compressJs(js): js);

    var percent = 100 - ((fs.statSync(to + '.munched').size / this.files[to]) * 100);
    that.echo(clc.blue.bold(percent.toFixed(2) + '%') + ' Saved for ' + to + '.munched');
}

/** 
 * compressHtml
 *
 * Compress HTML Files to save a couple of bytes. Someone tell me where I got this. I need to
 * credit them. I forgot :(
 *
 * @param html String The HTML string to be minified
 * @param compressHead Boolean Option whether the <head> tag should be compressed as well
 */
Muncher.prototype.compressHtml = function(html, compressHead){
    var   allHTML = html,
         headHTML = '',
       removeThis = '',
       headstatus = compressHead || true;

    if (headstatus != true) {
        //Compress all the things!
        allHTML = allHTML.replace(/(\r\n|\n|\r|\t)/gm, '');
        allHTML = allHTML.replace(/\s+/g, ' ');
    } else {
        //Don't compress the head
        allHTML = allHTML.replace(new RegExp('</HEAD', 'gi'), '</head');
        allHTML = allHTML.replace(new RegExp('</head ', 'gi'), '</head');
        
        var bodySplit = '</head>'; 
        var i = allHTML.indexOf(bodySplit) != -1;
        
        if (i == true) {
            var bodySplit = '</head>'; 
            var tempo = allHTML.split(new RegExp(bodySplit, 'i'));
            headHTML = tempo[0];
            allHTML = tempo[1];
        } else {
            bodySplit = ''; 
        }

        allHTML = allHTML.replace(/(\r\n|\n|\r|\t)/gm, '');
        allHTML = allHTML.replace(/\s+/g, ' ');
        allHTML = headHTML + bodySplit + '\n' + allHTML.replace(/<!--(.*?)-->/gm, '');
    }

    return allHTML;
}

/** 
 * compressCss
 *
 * A simple CSS minifier. removes all newlines, tabs and spaces. also strips out comments.
 *
 * @param css String The CSS string to be minified
 */
Muncher.prototype.compressCss = function(css) {
    css = css.replace(/(\r\n|\n|\r|\t)/gm, "");
    css = css.replace(/\s+/g, " ");
    return css.replace(/\/\*(.*?)\*\//gm, "");
}

/** 
 * compressJs
 *
 * A placeholder for future use perhaps?
 *
 * @param js String The JS string to be minified
 */
Muncher.prototype.compressJs = function(js) {
    return js;
}

/** 
 * addJsParser
 *
 * plug different JS parsers here. Parsers are loaded dynamically from the `parsers` folder
 *
 * @param cb Function the callback for parsing JS Strings
 */
Muncher.prototype.addJsParser = function(cb) {
    if (typeof cb == 'function') {
        this.parsers.js.push(cb);
    }
}

/** 
 * We expose this to the CLI
 */
var munch = function() {

    // fetch the script options from CLI
    var args = require('optimist')
                    .usage(fs.readFileSync('./usage').toString())
                    .demand(['view'])
                    .argv;

    // we have a settings file specifically specified or args is empty
    if (!args || args['manifest']) {
        args['manifest'] = args['manifest'] || '.muncher';

        // see if the file exists and get it
        if (fs.existsSync(args['manifest'])) {
            args = require(args['manifest']);
        }
    }

    // check if args is usable.
    if (!args) {
        console.log('There are no options specified. Aborting');
        return;
    } else if (!args['silent']) {
        // echo a pretty name if we are allowed to
        console.log(clc.red('\n   __  ___              __     _   '));
        console.log(clc.red('  /  |/  /_ _____  ____/ /    (_)__'));
        console.log(clc.red(' / /|_/ / // / _ \\/ __/ _ \\  / (_-<'));
        console.log(clc.red('/_/  /_/\\_,_/_//_/\\__/_//_/_/ /___/'));
        console.log(clc.red('                         |___/     \n'));
        console.log(clc.white('Copyright (c) 2013 John Rocela <me@iamjamoy.com>\n\n'));
    }

    if (args['manifest']) {
        console.log('Reading Manifest file to get configuration...\n');
    }

    // let's start munching
    var munch = new Muncher(args);

    // add custom JS parsers
    glob.sync('./parsers/**/*.js').forEach(function(file) {
        munch.addJsParser(require(file));
    });

    // bon appetit`
    munch.run();
}

munch();

// have fun <3