const fs = require('fs');
const { readFile } = require('fs/promises');
const path = require('path');
const filePath = path.join(__dirname, "sample-files", "sample.txt");

// Write a sample file for demonstration
fs.writeFile(filePath, "Hello, async world!", (err) => {
  if (err) {
    console.log(err);
    return;
  }

  // 1. Callback style
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
      return;
    }

    console.log("Callback read:", data);
  });


  // Callback hell example (test and leave it in comments):
  // Callback hell is function that has nested functions one to another.
  /*
     function washDishes(callback) {
    console.log("Washing dishes...");
    callback();
}

function dryDishes(callback) {
    console.log("Drying dishes...");
    callback();
}

function putAway() {
    console.log("Putting dishes away...");
}

washDishes(() => {
    dryDishes(() => {
        putAway();
    });
});
  */

  // 2. Promise style

    readFile(filePath, "utf8")
    .then((data) => {
      console.log("Promise read:", data);
    })
    .catch((err) => {
      console.log(err);
    });


      // 3. Async/Await style

    async function readFileAsync() {
    try {
      const data = await readFile(filePath, "utf8");
      console.log("Async/Await read:", data);
    } catch (err) {
      console.log(err);
    }
  }

  readFileAsync();
});
