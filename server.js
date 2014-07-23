'use strict';

var express = require('express');
var jade = require('jade');
var moped = require('moped');

var app = express();

moped.layout(jade.compileFile(__dirname + '/layout.jade'));
moped.transform({global: true}, require('react-jade'));

app.use(require('./app.js'));

app.use('/todomvc-common', express.static(__dirname + '/todomvc-common'));
app.listen(process.env.PORT || 3000);
