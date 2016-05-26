# Mariodux
Demonstration on how [Redux](https://github.com/reactjs/redux) and [morphdom](https://github.com/patrick-steele-idem/morphdom) can be added to a  [Marionette](https://github.com/marionettejs/backbone.marionette) project in order to provide the benefit of popular [React](https://github.com/facebook/react) and [Flux](https://facebook.github.io/flux/) features — specifically, DOM diffing and unidirectional data flow.

## Motivation
I currently work on a 3-year-old Marionette application; migrating to React or any other framework would be a massive effort. I began this repo seeking to determine whether it was possible to replicate the Flux pattern within a Marionette application.

The results proved interesting …

## The Approach
We start by creating [two versions of the application's root layout](https://github.com/AndrewHenderson/mariodux/blob/master/examples/todos/index.js#L15-L16).
```js
var root = new Root();
var virtualRoot = new Root();
```
The [true root is attached to the document](https://github.com/AndrewHenderson/mariodux/blob/master/examples/todos/index.js#L47) and will continue to serve as a representation of our application state.
```js
app.rootRegion.show(root);
```
The virtual root will essentially act as the worker. It will be re-rendererd when changes are made to the app's global state object. An HTML representation of it will then be diffed against the representation currently in the DOM in order to make efficient updates.

## Priciples
Following the [Redux principles](http://redux.js.org/docs/introduction/ThreePrinciples.html), views will leverage [pure functions](https://github.com/AndrewHenderson/mariodux/blob/master/examples/todos/reducers/todos.js#L10-L43) to update their models, [dispatching events](https://github.com/AndrewHenderson/mariodux/blob/master/examples/todos/components/TodoList.js#L53-L55) rather than setting properties on models directly.
```js
onClick: function() {
  dispatch(toggleTodo(this.$el.attr('modelId')));
}
```
In doing so, a new global state object will be generated by  [combineReducers](https://github.com/AndrewHenderson/mariodux/blob/master/examples/todos/reducers/index.js#L9-L12) and the `updateDOM` function will execute, rendering the virutalRoot using latest global state.

An HTML representation of this latest rendering will then be diffed against the representation currently in the DOM and the latter will be efficiently updated by morphdom.
```js
store.subscribe(function updateDOM() {
  var realDOM = root.$el[0];
  var virtualDOM = virtualRoot.render().$el[0];
  morphdom(realDOM, virtualDOM);
});
```
The true root will not be re-rendered. It is only rendered once at the beginning. From then on, morphdom will handle all future updates.

## Shift In Mindset
**Using this approach, views should only be concerned with rendering and dispatching.**

Backbone and Marionette objects were both designed with event systems — views having been provided functions like `modelEvents`, `collectionEvents`, `listenTo`, etc. and models & collections having events such as `change` and `update`. This approach ignores those functions and events in favor of pure functions and a more predictable immutable global state object — acting as the app's single source of truth.

## Gotchas
As an alternative to the complexities of something like [React's synthetic event system](https://facebook.github.io/react/docs/working-with-the-browser.html), we will continue to listen for DOM events in the view on the [events object](https://github.com/AndrewHenderson/mariodux/blob/master/examples/todos/components/TodoList.js#L30-L32).
```js
events: {
  click: 'onClick'
}
```
One issue that arises from this however, is the DOM node may have been efficiently updated by morphdom and thus represent data which is not in the view object's model — the one that was originally used to render the node.

Since we only need the model for the purposes of rendering, a workaround for this is to put the `model.id` on the node in a custom attribute. This way, [the proper id can be used when notifying the dispatcher](https://github.com/AndrewHenderson/mariodux/blob/master/examples/todos/components/TodoList.js#L54).

If the view object needs to know where its node has been attached to the document, we can leverage callbacks like morphdom's   [`onNodeAdded`](
https://github.com/AndrewHenderson/mariodux/blob/master/examples/async/index.js#L26-L30) in order to trigger a custom event and [listen for that event in the view](https://github.com/AndrewHenderson/mariodux/blob/master/examples/async/components/Posts.js#L14-L16).
```js
morphdom(realDOM, virtualDOM, {
  onNodeAdded: function(node) {
    if (node.hasAttribute('ref')) {
      $(node).trigger('added', node);
    }
  }
});
```
You'll notice, we've followed suit to React and tagged desired nodes with the [`ref` attribute](https://facebook.github.io/react/docs/more-about-refs.html#the-ref-callback-attribute).

Similarly, if we need to get the value of the nodes such as `inputs` before we update the DOM, we can leverage morphdom's [`onBeforeElUpdated`](https://github.com/AndrewHenderson/mariodux/blob/master/examples/todos/index.js#L29-L32).
```js
morphdom(realDOM, virtualDOM, {
  onBeforeElUpdated: function(fromEl, toEl) {
    if (fromEl.hasAttribute('ref')) {
      $(toEl).trigger('before:update', fromEl);
    }
  }
});
```
Doing so allows us to [check the value of the input](https://github.com/AndrewHenderson/mariodux/blob/master/examples/todos/components/AddTodo.js#L32-L35) before updating the DOM.
```js
onBeforeUpdateInput: function(e, node) {
  var $node = $(node);
  this.ui.input.val($node.val());
}
```
