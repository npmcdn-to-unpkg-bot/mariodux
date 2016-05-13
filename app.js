define(function(require) {

  'use strict';

  var Backbone = require('backbone');
  var Marionette = require('marionette');
  var morphdom = require('morphdom');
  var Router = require('router');
  var Root = require('root');
  var root = new Root();
  var virtualRoot = new Root();

  var app;
  var router;

  store.subscribe(function updateDOM() {

    morphdom(root.$el[0], virtualRoot.render().$el[0], {

      onBeforeElChildrenUpdated: function(fromEl, toEl) {
        return !$(fromEl).is('[ref]');
      }
    });
  });

  app = new Marionette.Application();

  app.addRegions({
    rootRegion: '#root'
  });

  router = new Router();

  Backbone.history.start();

  app.rootRegion.show(root);

  return app;
});