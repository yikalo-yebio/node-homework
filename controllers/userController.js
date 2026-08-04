const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");

const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);

  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  if (!inputPassword || !storedHash) {
    return false;
  }

  const [salt, storedKey] = storedHash.split(":");

  if (!salt || !storedKey) {
    return false;
  }

  const storedKeyBuffer = Buffer.from(storedKey, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);

  if (storedKeyBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedKeyBuffer, derivedKey);
}

async function register(req, res, next) {
  if (!req.body) {
    req.body = {};
  }

  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    console.log(error.details);

    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  value.hashed_password = await hashPassword(value.password);

  let result;

  try {
    result = await pool.query(
      `INSERT INTO users (email, name, hashed_password)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password]
    );
  } catch (error) {
    console.log("code:", error.code);
    console.log("constraint:", error.constraint);
    console.log("detail:", error.detail);

    if (error.code === "23505") {
      return res.status(400).json({
        message: "A user with that email already exists.",
      });
    }

    return next(error);
  }

  const user = result.rows[0];

  global.user_id = user.id;

  return res.status(201).json({
    name: user.name,
    email: user.email,
  });
}

async function logon(req, res, next) {
  try {
    if (!req.body) {
      req.body = {};
    }

    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const password = req.body.password;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    const goodCredentials = await comparePassword(
      password,
      user.hashed_password
    );

    if (!goodCredentials) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    global.user_id = user.id;

    return res.status(200).json({
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    return next(error);
  }
}

function logoff(req, res) {
  global.user_id = null;

  return res.sendStatus(200);
}

module.exports = {
  register,
  logon,
  logoff,
};
