'use strict';

var app = require('moped/app')();
var React = require('react');
var jade = require('react-jade');
var uid = require('uid');


var index = jade.compileFile(__dirname + '/index.jade');
var template = jade.compileFile(__dirname + '/view.jade');

var editingTodo;
var editingText = '';

var showingStates = {
  ALL_TODOS: 'all',
  ACTIVE_TODOS: 'active',
  COMPLETED_TODOS: 'completed'
};

function Application(list, db) {
  this._list = list;
  this._db = db;
}
Application.prototype.listId = function () {
  return this._list;
};
Application.prototype.todos = function () {
  return this._db.todos.find({list: this._list}).sort(function (a, b) {
    return b.time - a.time;
  });
};
Application.prototype.handleNewTodoKeyDown = function (e) {
  if (e.key !== 'Enter') {
    return;
  }

  var val = document.getElementById('new-todo').value;
  if (val) {
    this._db.todos.insert({title: val, completed: false, list: this._list, time: Date.now()});
    document.getElementById('new-todo').value = '';
  }

  return false;
};
Application.prototype.toggleAll = function (e) {
  var checked = e.target.checked;

  this._db.todos.update({list: this._list}, {completed: checked});
};
Application.prototype.toggle = function (todo) {
  this._db.todos.update(todo._id, {completed: !todo.completed});
};
Application.prototype.handleEdit = function (todo) {
  editingTodo = todo;
  editingText = todo.title;

  app.refresh();
};
Application.prototype.isEditing = function (todo) {
  return editingTodo && editingTodo._id.$oid === todo._id.$oid;
};
Application.prototype.handleSubmit = function (todo) {
  var val = editingText.trim();
  editingTodo = null;
  if (val) {
    this._db.todos.update(todo._id, {title: val});
  } else {
    this.destroy(todo);
  }
  return false;
};

Application.prototype.destroy = function (todo) {
  this._db.todos.remove(todo._id);
};

Application.prototype.clearCompleted = function () {
  this._db.todos.remove({completed: true, list: this._list});
};

Application.prototype.getEditText = function (todo) {
  return editingText || todo.title;
}
Application.prototype.setEditText = function (todo, e) {
  editingText = e.target.value;

  app.refresh();
}

function render(app, nowShowing) {
  var todos = app.todos();
  var activeTodoCount = todos.reduce(function (accum, todo) {
    return todo.completed ? accum : accum + 1;
  }, 0);

  var shownTodos = todos.filter(function (todo) {
    switch (nowShowing) {
      case showingStates.ACTIVE_TODOS:
        return !todo.completed;
      case showingStates.COMPLETED_TODOS:
        return todo.completed;
      default:
        return true;
    }
  }, this);

  return template({
    app: app,
    showingStates: showingStates,

    todos: todos,
    nowShowing: nowShowing,

    activeTodoCount: activeTodoCount,
    completedCount: todos.length - activeTodoCount,
    shownTodos: shownTodos
  });
}

var sync = require('moped/sync-service')('db');

if (app.isServer) {
  var MemoryServer = require('moped-sync/memory-server.js');
  sync.connection(new MemoryServer());
}

sync.filter({todos: {}});
app.use(sync);

app.get('/', function () {
  return index({id: Math.random().toString(35).substr(2, 7)});
});
app.get('/:list', function (req) {
  req.state.list = req.state.list || req.params.list;
  if (req.state.list !== req.params.list) return;

  return render(new Application(req.state.list, req.db), 'all');
});
app.get('/:list/active', function (req) {
  req.state.list = req.state.list || req.params.list;
  if (req.state.list !== req.params.list) return;

  return render(new Application(req.state.list, req.db), 'active');
});
app.get('/:list/completed', function (req) {
  req.state.list = req.state.list || req.params.list;
  if (req.state.list !== req.params.list) return;

  return render(new Application(req.state.list, req.db), 'completed');
});



module.exports = app.run({
  filename: __filename
});
