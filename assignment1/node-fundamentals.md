# Node.js Fundamentals

## What is Node.js?
Answer here..   Node  is a machine that let us run javascript outside of a browser.

## How does Node.js differ from running JavaScript in the browser?
Answer here.. The differece is where it run and what it access.

## What is the V8 engine, and how does Node use it?
Answer here.. V8 is a runtime environment that let JavaScript run outside of browser.

## What are some key use cases for Node.js?
Answer here.. One of the key use for node.js is to run the server and communicate with it.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

**CommonJS (default in Node.js):**
```js
// Answer here..
Is the old but still the default way of exporting and imoprting files.
- to export :- module.exports = {add}
- to import :- const math = require('./math');
```

**ES Modules (supported in modern Node.js):**
```js
// Answer here..
When ES modules introduced to JS the export and imoprting way developed and needed to include to node so with the new extenstion mjs it is introduced to node.js

- to export :- export default math;
- to import :- import { add } from './math.js'
``` 
