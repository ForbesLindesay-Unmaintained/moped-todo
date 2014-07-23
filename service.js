'use strict';

var request = require('then-request');
var service = require('moped/service')();
var SyncClient = require('moped-sync/client');

function fetch(method, url, data) {
  if (method === 'get') {
    return request(url).then(function (res) {
      return JSON.parse(res.getBody());
    });
  } else {
    return request(url, {
      method: method,
      body: JSON.stringify(data),
      headers: { 'content-type': 'application/json' }
    }).then(function (res) {
      return JSON.parse(res.getBody());
    });
  }
}

if (service.isServer) {
  var db = require('./sync-server.js');
  service.first('/:list*', function (req) {
    return db.getInitial().then(function (initial) {
      req.state.initial = initial;
    });
  });
}

function readNext(db, delay) {
  delay = delay || 1
  fetch('get', '/update/' + db.next).done(function (result) {
    db.writeUpdate(result);
    readNext(db);
  }, function (err) {
    console.error(err.stack);
    setTimeout(function () {
      readNext(db, Math.min(delay * 2, 50));
    }, delay * 100);
  });
}
service.first('/:list*', function (req, refresh) {
  req.db = new SyncClient(['todos'], req.state.initial);
  if (service.isClient) {
    readNext(req.db);
  }
  req.db.onUpdate(refresh);
  var handlingChanges = false;
  function handleChange() {
    handlingChanges = true;
    if (req.db.getNumberOfLocalChanges() === 0) {
      return handlingChanges = false;
    }
    fetch('post', '/update', req.db.getFirstLocalChange()).done(function () {
      req.db.setFirstLocalChangeHandled();
      handleChange();
    }, function (err) {
      console.error(err.stack);
      handleChange();
    });
  }
  req.db.onLocalChange(function () {
    if (!handlingChanges) handleChange();
  });
});

module.exports = service;
