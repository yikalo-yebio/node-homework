const os = require('os');
const path = require('path');
const fs = require('fs');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log("Platform:", os.platform());
console.log("CPU:", os.cpus()[0].model);
console.log("Total Memory:", os.totalmem());

// Path module
const demoFilePath = path.join(sampleFilesDir, "demo.txt");
console.log("Joined path:", demoFilePath);

// fs.promises API
fs.promises
  .writeFile(demoFilePath, "Hello from fs.promises!")
  .then(() => fs.promises.readFile(demoFilePath, "utf8"))
  .then((data) => {
    console.log("fs.promises read:", data);
  })
  .catch((err) => {
    console.log(err);
  });

// Streams for large files- log first 40 chars of each chunk
