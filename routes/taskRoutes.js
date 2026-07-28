const express = require("express");
const auth = require("../middleware/auth");
const {
  create,
  index,
  show,
  update,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.post("/", auth, create);
router.get("/", auth, index);
router.get("/:id", auth, show);
router.patch("/:id", auth, update);
router.delete("/:id", auth, deleteTask);

module.exports = router;
