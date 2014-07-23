'use strict';

var express = require('express');
var jade = require('jade');
var moped = require('moped');

var app = express();

moped.layout(jade.compileFile(__dirname + '/layout.jade'));
moped.transform({global: true}, require('react-jade'));

app.use(require('./applet.js'));


var body = require('body-parser');
var db = require('./sync-server.js');

app.post('/update', body.json(), function (req, res, next) {
  db.writeUpdate(req.body);
  res.json({});
});
app.get('/update/:index', function (req, res, next) {
  db.getUpdate(req.params.index).done(function (update) {
    res.json(update);
  }, next);
});

app.use('/todomvc-common', express.static(__dirname + '/todomvc-common'));
app.listen(process.env.PORT || 3000);
