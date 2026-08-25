const express = require("express");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();

const {
  register,
  logon,
  logoff,
  show,
} = require("../controllers/userController");

router.post("/register", register);

router.post("/logon", logon);

// Logoff requires authentication and CSRF protection
router.post("/logoff", jwtMiddleware, logoff);

router.get("/:id", show);

module.exports = router;
