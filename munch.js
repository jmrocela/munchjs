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
 * MUNCHER!!!!
 *
 * @param args Object an optimist.args object.
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
    this.ignoreClasses = [ ];
    this.ignoreIds = [ ];

    // custom parser collection
    this.parsers = {
        "js": []
    }

    this.writers = {
        "js": []
    }

    // pass to the init function
    if (args) {
        this.init(args);
    }
}

Muncher.prototype.init = function(args) {

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
        "view": (args['compress-view'] === true),
        "css": (args['compress-css'] === true),
        "js": (args['compress-js'] === true)
    }

    // if we want to nag the CLI
    this.silent = (args['silent'] === true);
    this.showSavings = (args['show-savings'] === true);

    // flag if we only want to map the Ids and Classes for later use
    this.mapFile = args['map'];

    this.readFile = args['read'];

    // paths given from the configuration
    this.paths = {
        "view": args['view'],
        "css": args['css'],
        "js": args['js']
    }

    // chainable
    return this;
}

/** 
 * run
 *
 * sets various options to run the Muncher
 */
Muncher.prototype.run = function() {

    if (!this.readFile) {
        // run through the HTML files
        if (this.paths["view"]) this.parseDir(this.paths["view"], "view");
        if (this.paths['css']) this.parseDir(this.paths["css"], "css");
        if (this.paths['js']) this.parseDir(this.paths["js"], "js");
    } else {
        this.read(this.readFile);
    }

    // map feature
    if (typeof this.mapFile === 'string' && !this.readFile) {

        if (this.mapFile) {
            var map = { id: [], class: [] };

            for (var key in this.map["id"]) {
                map["id"].push(key);
            }

            for (var key in this.map["class"]) {
                map["class"].push(key);
            }

            fs.writeFileSync(this.mapFile, JSON.stringify(map, null, '\t'));
        }

        this.echo('-------------------------------');
        this.echo(clc.bold('Wrote ' + this.mapCounter + ' ids and classes in ' + this.mapFile));
        this.echo('-------------------------------\n');
        return;
    } else {
        this.echo('-------------------------------');
        this.echo(clc.bold('Mapped ' + this.mapCounter + ' IDs and Classes'));
        this.echo('-------------------------------\n');
    }

    // we do it again so this we are sure we have everything we need
    if (this.paths["view"]) this.buildDir(this.paths["view"], "view");
    if (this.paths['css']) this.buildDir(this.paths["css"], "css");
    if (this.paths['js']) this.buildDir(this.paths["js"], "js");

}

/** 
 * read
 *
 * use a map file to serve as the dictionary
 *
 * @param read String the path to the mapfile
 */
Muncher.prototype.read = function(read) {
    var manifest = JSON.parse(fs.readFileSync(read, 'utf-8').toString()),
    that = this;

    $.each(manifest["id"], function(i, id) {
        that.addId(id);
    });

    $.each(manifest["class"], function(i, cls) {
        that.addClass(cls);
    });

}

/** 
 * parseDir
 *
 * parse directories according to context
 *
 * @param path String the path of the directory
 * @param context String either view, js or css
 */
Muncher.prototype.parseDir = function(path, context) {
    var that = this;
        
    that.echo(clc.bold('Processing ' + context));

    that.paths[context].split(',').forEach(function(path) {
        if (fs.statSync(path).isDirectory()) {
            var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.extensions[context]);

            files.forEach(function(file) {
                that.parse(file, context);
            });

        } else if (fs.statSync(path).isFile()) {
            that.parse(path, context);
        }
    });
    
    that.echo(clc.green.bold('Finished!\n'));

}

/** 
 * buildDir
 *
 * build directories according to context
 *
 * @param path String the path of the directory
 * @param context String either view, js or css
 */
Muncher.prototype.buildDir = function(path, context) {
    var that = this;    

    that.echo(clc.bold('Rewriting ' + context));

    that.paths[context].split(',').forEach(function(path) {
        if (fs.lstatSync(path).isDirectory()) {
            var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.extensions[context]);

            files.forEach(function(file) {
                that.build(file, context);
            });

        } else if (fs.lstatSync(path).isFile()) {
            that.build(path, context);
        }
    });
    
    that.echo(clc.green.bold('Finished!\n'));
}

/** 
 * echo
 *
 * wrap the console.log method
 *
 * @param message String
 */
Muncher.prototype.echo = function(message) {
    if (!this.silent) console.log(message);
}

/** 
 * parse
 *
 * parse files according to context
 *
 * @param file String the file name of the document
 * @param context String either view, js or css
 */
Muncher.prototype.parse = function(file, context) {

    if (fs.existsSync(file)) {
        this.echo(file);

        var content = fs.readFileSync(file, 'utf8').toString();

        switch (context) {
            case "view":
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

/** 
 * build
 *
 * build files according to context
 *
 * @param file String the file name of the document
 * @param context String either view, js or css
 */
Muncher.prototype.build = function(file, context) {

    var content = fs.readFileSync(file, 'utf8').toString();

    switch (context) {
        case "view":
            this.rewriteHtml(content, file);
        break;
        case "css": 
            this.rewriteCss(content, file);
        break;
        case "js": 
            this.rewriteJs(content, file);
        break;
    }

}

/** 
 * addCss
 *
 * adds Classes to the CLASS map
 *
 * @param cl String
 */
Muncher.prototype.addClass = function(cl) {
    var that = this;

    var addClass = function(cls) {
        if (that.ignoreClasses.indexOf(cls) > -1) return true; // shoul be a list of no-nos
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

/** 
 * addId
 *
 * adds Ids to the ID map
 *
 * @param id String
 */
Muncher.prototype.addId = function(id) {
    if (!this.map["id"][id]) {
        if (!this.ignoreIds.indexOf(id)) return true; // shoul be a list of no-nos
        this.map["id"][id] = hashids.encrypt(this.mapCounter);
        this.mapCounter++;
    }
}

/** 
 * parseCssSelector
 *
 * parse CSS strings to get their classes and ids
 *
 * @param css String the css string
 */
Muncher.prototype.parseCssSelector = function(selector) {
    var that = this,
        match = null,
        tid = selector.match(/#[\w\-]+/gi),
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
}

/** 
 * parseHtml
 *
 * parse HTML documents to get their classes and ids
 *
 * @param html String the html document
 */
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

/** 
 * parseCss
 *
 * parse CSS documents to get their classes and ids
 *
 * @param css String the css document
 */
Muncher.prototype.parseCss = function(css) { 
    var   that = this,
           css = parse(css),
        styles = [];

    $.each(css.stylesheet.rules, function(i, style) {
        if (style.media) {
            styles = styles.concat(style.rules);
        }

        if (!style.selectors) return true;

        styles.push(css.stylesheet.rules[i]);
    });

    $.each(styles, function(o, style) {
        style.selectors.forEach(function(selector) {
            that.parseCssSelector(selector);
        });
    });
}

/** 
 * parseJs
 *
 * parse JS documents to get their classes and ids
 *
 * @param js String the js document
 */
Muncher.prototype.parseJs = function(js) {
    var that = this,
        match;

    // custom parsers
    if (this.parsers.js.length > 0) {
        this.parsers.js.forEach(function(cb) {
            cb.call(that, js);
        });
    }

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

/** 
 * rewriteHtml
 *
 * replaces the ids and classes in the files specified
 *
 * @param html String the html document
 * @param to String the file name
 */
Muncher.prototype.rewriteHtml = function(html, to) {
    var     that = this,
        document = jsdom(html),
            html = $(document);

    that.files[to] = fs.statSync(to).size;

    html.find('*').each(function(i, elem) {
        var target = html.find(elem),
                id = target.attr('id'),
           classes = target.attr('class');

        if (id) {
            if (!that.ignoreIds.indexOf(id)) return true;
            target.attr('id', that.map["id"][id]);
        }

        if (classes) {
            var newClass = [];
            classes.split(' ').forEach(function(cl) {
                if (!that.ignoreClasses.indexOf(cl)) return true;
                if (that.map["class"][cl]) {
                    target.removeClass(cl).addClass(that.map["class"][cl]);
                }
            });
        }

    });

    // write
    html = document.innerHTML;
    html = this.rewriteJsBlock(html);
    html = this.rewriteCssBlock(html, this.compress['view']);

    fs.writeFileSync(to + '.munched', (this.compress['view']) ? this.compressHtml(html): html);

    var percent = 100 - ((fs.statSync(to + '.munched').size / this.files[to]) * 100);
    var savings = (that.showSavings) ? clc.blue.bold(percent.toFixed(2) + '%') + ' Saved for ': '';
    that.echo(savings + to + '.munched');
}

/** 
 * rewriteCssString
 *
 * rewrite a CSS String
 *
 * @param css String the css document
 */
Muncher.prototype.rewriteCssString = function(css) {
    var   that = this,
          text = css,
        styles = [],
           css = parse(text);

    $.each(css.stylesheet.rules, function(i, style) {
        if (style.media) {
            styles = styles.concat(style.rules);
        }

        if (!style.selectors) return true;

        styles.push(css.stylesheet.rules[i]);
    });

    $.each(styles, function(u, style) {
        style.selectors.forEach(function(selector) {
            var original = selector,
                     tid = selector.match(/#[\w\-]+/gi),
                     tcl = selector.match(/\.[\w\-]+/gi);

            if (tid) {
                $.each(tid, function(i, match) {
                    match = match.replace('#', '');
                    if (that.ignoreIds.indexOf(match) > -1) return true;
                    selector = selector.replace(new RegExp("#" + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '#' + that.map["id"][match]);
                });
            }
            if (tcl) {
                $.each(tcl, function(o, match) {
                    match = match.replace('.', '');
                    if (that.ignoreClasses.indexOf(match) > -1) return true;
                    selector = selector.replace(new RegExp("\\." + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '.' + that.map["class"][match]);
                });
            }

            text = text.replace(original, selector);
        });
    });

    return text;
}

/** 
 * rewriteCssBlock
 *
 * rewrite a CSS block in an html document
 *
 * @param html String the html document
 * @param compress Boolean flag whether to compress the CSS block
 */
Muncher.prototype.rewriteCssBlock = function(html, compress) {
    var     that = this,
        document = jsdom(html),
            html = $(document);

    html.find('*').each(function(i, elem) {
        var target = html.find(elem);

        if (target.is('style')) {
            var text = that.rewriteCssString(target.text());
            target.text(compress ? that.compressCss(text): text);
        }

    });

    return document.innerHTML;
}

/** 
 * rewriteCss
 *
 * rewrite a CSS file
 *
 * @param css String the css document
 * @param to String the file name
 */
Muncher.prototype.rewriteCss = function(css, to) {
    var that = this,
        text = that.rewriteCssString(css);

    that.files[to] = fs.statSync(to).size;

    fs.writeFileSync(to + '.munched', (this.compress['css']) ? this.compressCss(text): text);

    var percent = 100 - ((fs.statSync(to + '.munched').size / this.files[to]) * 100);
    var savings = (that.showSavings) ? clc.blue.bold(percent.toFixed(2) + '%') + ' Saved for ': '';
    that.echo(savings + to + '.munched');
}

/** 
 * rewriteJsString
 *
 * rewrite a JS String
 *
 * @param js String the js document
 */
Muncher.prototype.rewriteJsString = function(js) {
    var  that = this,
        match = null;

    // id and class
    var pass4 = /getElementsByClassName\([\'"](.*?)[\'"]/gi;
    while ((match = pass4.exec(js)) !== null) {
        if (that.ignoreClasses.indexOf(match[1]) > -1) continue;
        var passed = match[0].replace(new RegExp(match[1], "gi"), that.map["class"][match[1]]);
        js = js.replace(match[0], passed);
    }

    var pass5 = /getElementById\([\'"](.*?)[\'"]/gi;
    while ((match = pass5.exec(js)) !== null) {
        if (that.ignoreIds.indexOf(match[1]) > -1) continue;
        var passed = match[0].replace(new RegExp(match[1], "gi"), that.map["id"][match[1]]);
        js = js.replace(match[0], passed);
    }

    // attr
    var pass7 = /setAttribute\([\'"](id|class)[\'"],\s[\'"](.+?)[\'"]/gi;
    while ((match = pass7.exec(js)) !== null) {
        var key = (match[1] == 'id') ? 'id': 'class';
        if (key == 'class') {
            var passed = match[0],
                splitd = match[2].split(' ');
            $.each(splitd, function(i, cls) {
                if (that.ignoreClasses.indexOf(cls) > -1) return true;
                passed = passed.replace(new RegExp(cls, "gi"), that.map[key][cls]);
            });
        } else {
            if (that.ignoreIds.indexOf(match[2]) > -1) continue;
            var passed = match[0].replace(new RegExp(match[2], "gi"), that.map[key][match[2]]);
        }
        js = js.replace(match[0], passed);
    }

    // custom parsers
    if (this.writers.js.length > 0) {
        this.writers.js.forEach(function(cb) {
            js = cb.call(that, js);
        });
    }

    return js;
}

/** 
 * rewriteJsBlock
 *
 * rewrite a JS block in an html document
 *
 * @param html String the html document
 * @param compress Boolean flag whether to compress the JS block
 */
Muncher.prototype.rewriteJsBlock = function(html, compress) {
    var     that = this,
        document = jsdom(html),
            html = $(document);

    var match;

    html.find('script').each(function(i, elem) {
        var target = html.find(elem),
                js = that.rewriteJsString(target.text());

        target.text(js);
    });

    var block = (compress) ? this.compressJs(document.innerHTML): document.innerHTML;

    return block;
}

/** 
 * rewriteJs
 *
 * rewrite a JS file
 *
 * @param js String the js document
 * @param to String the file name
 */
Muncher.prototype.rewriteJs = function(js, to) {
    var  that = this;

    that.files[to] = fs.statSync(to).size;

    js = that.rewriteJsString(js);

    fs.writeFileSync(to + '.munched', (this.compress['js']) ? this.compressJs(js): js);

    var percent = 100 - ((fs.statSync(to + '.munched').size / this.files[to]) * 100);
    var savings = (that.showSavings) ? clc.blue.bold(percent.toFixed(2) + '%') + ' Saved for ': '';
    that.echo(savings + to + '.munched');
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
 * addJsWriter
 *
 * plug different JS writers here. Writers are loaded dynamically from the `parsers` folder
 *
 * @param cb Function the callback for writing JS Strings
 */
Muncher.prototype.addJsWriter = function(cb) {
    if (typeof cb == 'function') {
        this.writers.js.push(cb);
    }
}

/** 
 * module_exists
 *
 * Check if a module exists
 *
 * @param module_exists String the module name
 */
function module_exists(name) {
    try { 
        return require.resolve(name);
    } catch(e) {
        return false
    }
}

/** 
 * let's not forget to expose this
 */
exports.run = function() {
    // fetch the script options from CLI
    var args = require('optimist')
                    .usage(fs.readFileSync('./usage').toString())
                    .demand(['view'])
                    .argv;

    // we have a settings file specifically specified or args is empty
    if (args['manifest']) {
        args['manifest'] = (typeof args['manifest'] == 'string') ? args['manifest']: '.muncher';

        // see if the file exists and get it
        if (fs.existsSync(args['manifest'])) {
            args = JSON.parse(fs.readFileSync(args['manifest']));

            // normalize everything
            if (typeof args.view == 'object') args.view = args.view.join(',');
            if (typeof args.css == 'object') args.css = args.css.join(',');
            if (typeof args.js == 'object') args.js = args.js.join(',');
            if (typeof args.ignore == 'object') args.ignore = args.ignore.join(',');
            if (typeof args.parsers == 'object') args.parsers = args.parsers.join(',');
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
    if (args['parsers']) {
        var parsers = args['parsers'].split(',');
        parsers.forEach(function(parser) {
            if (module_exists(parser)) {
                var lib = require(parser);
                if (lib.parser) munch.addJsParser(lib.parser);
                if (lib.writer) munch.addJsWriter(lib.writer);
            }
        });
    }

    // bon appetit`
    munch.run();
}

// expose for testing
exports.Muncher = Muncher;

// have fun <3