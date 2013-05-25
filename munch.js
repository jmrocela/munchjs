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
      parse = require('css-parse'),
    Hashids = require('hashids'),
    hashids = new Hashids("use the force harry");

var Muncher = function(options) {
    // custom options
    this.options = {
        // defaults to stuff     
    }

    // tokens
    this.map = {
        "id": {},
        "class": {}
    };

    // files, keep track of sizes
    this.files = { }

    // token counter
    this.mapCounter = 0;

    // ignore classes
    this.ignoreClasses = [ "no-js" ];

    // html extension
    this.htmlExtension = '.html';

    this.compress = true;

    this.parsers = {
        "js": []
    }
}

// constructor
Muncher.prototype.run = function(args) {

    var that = this;

    console.log('Processing:');
    if (args["html"]) {
        args["html"].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.htmlExtension);

                files.forEach(function(file) {
                    that.parse(file, 'html');
                });

            } else if (fs.statSync(path).isFile()) {
                that.parse(path, 'html');
            }
        });
    }

    if (args['css']) {
        args['css'].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*.css');

                files.forEach(function(file) {
                    that.parse(file, 'css');
                });

            } else if (fs.statSync(path).isFile()) {
                that.parse(path, 'css');
            }
        });
    }

    if (args['js']) {
        args['js'].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*.js');

                files.forEach(function(file) {
                    that.parse(file, 'js');
                });

            } else if (fs.statSync(path).isFile()) {
                that.parse(path, 'js');
            }
        });
    }

    console.log('Building:');
    // we do it again so that we are sure we have everything we need
    if (args["html"]) {
        args["html"].split(',').forEach(function(path) {
            if (fs.lstatSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*' + that.htmlExtension);

                files.forEach(function(file) {
                    that.build(file, 'html');
                });

            } else if (fs.lstatSync(path).isFile()) {
                that.build(path, 'html');
            }
        });
    }

    if (args['css']) {
        args['css'].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*.css');

                files.forEach(function(file) {
                    that.build(file, 'css');
                });

            } else if (fs.statSync(path).isFile()) {
                that.build(path, 'css');
            }
        });
    }

    if (args['js']) {
        args['js'].split(',').forEach(function(path) {
            if (fs.statSync(path).isDirectory()) {
                var files = glob.sync(path.replace(/\/$/, '') + '/**/*.js');

                files.forEach(function(file) {
                    that.build(file, 'js');
                });

            } else if (fs.statSync(path).isFile()) {
                that.build(path, 'js');
            }
        });
    }

}

// parse the files
Muncher.prototype.parse = function(file, context) {

    if (fs.existsSync(file)) {
        console.log('Getting IDs and Classes from ' + file);

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
        console.log('Skipping ' + file + ' because it doesn\'t exist.');
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
            var    match = null,
                original = selector,
                     tid = /#[\w\-]+/gi,
                     tcl = /\.[\w\-]+/gi;

            while ((match = tid.exec(selector)) !== null) {
                var id = match[0].replace('#', '');
                that.addId(id);
            }

            while ((match = tcl.exec(selector)) !== null) {
                var cl = match[0].replace('.', '');
                that.addClass(cl);
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

        if (id) target.attr('id', that.map["id"][id]);

        if (classes) {
            var newClass = [];
            classes.split(' ').forEach(function(cl) {
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
    console.log('Wrore to ' + to  + '.munched. Saved ' + percent.toFixed(2) + '%');

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
                    var    match = null,
                        original = selector,
                             tid = /#[\w\-]+/gi,
                             tcl = /\.[\w\-]+/gi;

                    while ((match = tid.exec(selector)) !== null) {
                        selector = selector.replace(new RegExp(match[0].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '#' + that.map["id"][match[0].replace('#', '')]);
                    }

                    while ((match = tcl.exec(selector)) !== null) {
                        match[0] = match[0].replace('.', '');
                        if (!that.ignoreClasses.indexOf(match[0])) continue;
                        selector = selector.replace(new RegExp("\\." + match[0].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '.' + that.map["class"][match[0]]);
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
            var    match = null,
                original = selector,
                     tid = /#[\w\-]+/gi,
                     tcl = /\.[\w\-]+/gi;

            while ((match = tid.exec(selector)) !== null) {
                selector = selector.replace(new RegExp(match[0].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '#' + that.map["id"][match[0].replace('#', '')]);
            }

            var match = null;
            while ((match = tcl.exec(selector)) !== null) {
                match[0] = match[0].replace('.', '');
                if (!that.ignoreClasses.indexOf(match[0])) continue;
                selector = selector.replace(new RegExp("\\." + match[0].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '.' + that.map["class"][match[0]]);
            }

            text = text.replace(original, selector);

        });

    });

    fs.writeFileSync(to + '.munched', (this.compress) ? this.compressCss(text): text);

    var percent = 100 - ((fs.statSync(to + '.munched').size / this.files[to]) * 100);
    console.log('Wrore to ' + to  + '.munched. Saved ' + percent.toFixed(2) + '%');
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
            var passed = match[0].replace(new RegExp(match[2], "gi"), that.map[key][match[2]]);
        }
        js = js.replace(match[0], passed);
    }

    fs.writeFileSync(to + '.munched', (this.compress) ? this.compressJs(js): js);

    var percent = 100 - ((fs.statSync(to + '.munched').size / this.files[to]) * 100);
    console.log('Wrore to ' + to  + '.munched. Saved ' + percent.toFixed(2) + '%');
}

// basic compress methods for each context
Muncher.prototype.compressHtml = function(html, compressHead){
    var allHTML = html;
    var headHTML = "";
    var removeThis = "";
    var headstatus = compressHead || true;
    if(headstatus != true){
        //Compress all the things!
        allHTML = allHTML.replace(/(\r\n|\n|\r|\t)/gm,"");
        allHTML = allHTML.replace(/\s+/g," ");
    }else{
        //Don't compress the head
        allHTML = allHTML.replace(new RegExp("</HEAD","gi"),'</head');
        allHTML = allHTML.replace(new RegExp("</head ","gi"),'</head');
        
        var bodySplit = "</head>"; 
        var i = allHTML.indexOf(bodySplit) != -1;
        if(i == true){
            var bodySplit = "</head>"; 
            var tempo = allHTML.split(new RegExp(bodySplit,'i'));
            headHTML = tempo[0];
            allHTML = tempo[1];
        }else{
            bodySplit = ""; 
        }
        allHTML = allHTML.replace(/(\r\n|\n|\r|\t)/gm,"");
        allHTML = allHTML.replace(/\s+/g," ");
        allHTML = headHTML + bodySplit + '\n' + allHTML.replace(/<!--(.*?)-->/gm, "");
    }
    return allHTML;
}

Muncher.prototype.compressCss = function(css) {
    css = css.replace(/(\r\n|\n|\r|\t)/gm, "");
    css = css.replace(/\s+/g, " ");
    return css.replace(/\/\*(.*?)\*\//gm, "");
}

Muncher.prototype.compressJs = function(js) {
    return js;
}

Muncher.prototype.addJsParser = function(cb) {
    if (typeof cb == 'function') {
        this.parsers.js.push(cb);
    }
}

// create muncher
var munch = new Muncher();

//jquery
munch.addJsParser(function(js) {
    // var pass1 = /(\$|jQuery)\([\'"](.*?)[\'"]/gi.exec(js);

    // class
    // var pass2 = /addClass\([\'"](.*?)[\'"]/gi.exec(js);
    // if (pass2) this.addClass(pass2[1].split(' '));

    // var pass3 = /removeClass\([\'"](.*?)[\'"]/gi.exec(js);
    // if (pass3) this.addClass(pass3[1].split(' '));
    
    // var pass6 = /attr\([\'"](id|class)[\'"], [\'"](.*?)[\'"]/gi.exec(js);
    // if (pass6 && pass6[1] == 'class') this.addClass(pass6[2].split(' '), 2);
    // if (pass6 && pass6[1] == 'id') this.addId(pass6[2]);
});

// run muncher
munch.run(require('optimist')
            .usage(fs.readFileSync('./usage'))
            .demand(['html'])
            .argv);

// have fun <3