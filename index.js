/**
 * richie
 *
 * store rich text
 *
 **/

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    crypto = require('crypto'),
    path = require('path'),
    bodyParser = require('body-parser'),
    csrf = require('csurf'),
    cookieParser = require('cookie-parser'),
    csrfProtection = csrf({cookie: true}),
    parseBody = bodyParser.urlencoded({extended: false});

app.set('view engine', 'ejs');

// in-memory "database"
var db = {
    //id: {expires: Date, content: string}
};

var generate_id = function(cb) {
    crypto.pseudoRandomBytes(24, function(err, raw) {
        cb(err, err?undefined:raw.toString('hex'));
    });
};

var calc_expires = function(expires) {
    if (expires == 0) {
        // never expire
        return null;
    }
    var date = new Date();
    date.setTime(date.getTime() + expires*60000);
    return date;
};

var is_expired = function(expires) {
    var now = new Date();
    return (expires != null && expires <= now);
};

var html = function(res, page) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(page);
    res.end();
};

app.use(cookieParser());
app.use(express.static('public'));

app.get('/', csrfProtection, function(req, res) {
    res.render('index', {csrf: req.csrfToken()});
});

app.post('/', parseBody, csrfProtection, function(req, res) {
    var expires = req.body.expires,
        content = req.body.content,
        password = req.body.password;
    if (!/^\d+$/.test(expires)) {
        expires = 0;
    } else {
        expires = parseInt(expires, 10);
    }
    if (!content || isNaN(expires)) {
        res.redirect('/');
    } else {
        generate_id(function(err, id) {
            if (err || !id || db.hasOwnProperty(id)) {
                html(res, 'Sorry, we had an error (500)');
            } else {
                db[id] = {
                    expires: calc_expires(expires),
                    password: password,
                    content: content
                };
                res.redirect('/!/'+id);
            }
        });
    }
});

app.get('/!/:id', function(req, res) {
    var id = req.params.id;
    if (db.hasOwnProperty(id)) {
        if (is_expired(db[id].expires)) {
            delete db[id];
            html(res, 'The richie snippet expired.');
        }
        if (db[id].password) {
            res.render('enter', {id: id});
        } else {
            html(res, db[id].content);
        }
    } else {
        html(res, 'The richie snippet doesn\'t exist.');
    }
});
app.post('/!/:id', parseBody, function(req, res) {
    var id = req.params.id,
        password = req.body.password;
    if (db.hasOwnProperty(id)) {
        if (is_expired(db[id].expires)) {
            delete db[id];
            html(res, 'The richie snippet expired.');
        }
        if (!db[id].password || db[id].password === password) {
            html(res, db[id].content);
        } else {
            res.render('enter', {id: id});
        }
    } else {
        html(res, 'The richie snippet doesn\'t exist.');
    }
});

http.listen(8080, function(){
    console.log('running on *:8080');
});
