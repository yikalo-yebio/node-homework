const express = require("express");

const jwtMiddleware = require("../middleware/jwtMiddleware");

const {
  create,
  bulkCreate,
  index,
  show,
  update,
  updateMany,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

// Protect all task routes with JWT authentication
router.use(jwtMiddleware);

router.post("/", create);

router.post("/bulk", bulkCreate);

router.get("/", index);

router.get("/:id", show);

// Update many tasks using a query parameter
router.patch("/", updateMany);

router.patch("/:id", update);

router.delete("/:id", deleteTask);

module.exports = router;
