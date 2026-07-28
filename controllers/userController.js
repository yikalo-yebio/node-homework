const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");

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

async function register(req, res) {
  try {
    if (!req.body) {
      req.body = {};
    }

    const { error, value } = userSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    const { name, email, password } = value;

    const existingUser = global.users.find(
      (user) => user.email === email
    );

    if (existingUser) {
      return res.status(400).json({
        message: "A user with that email already exists.",
      });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = {
      id: global.users.length + 1,
      name,
      email,
      hashedPassword,
    };

    global.users.push(newUser);

    global.user_id = newUser;

    return res.status(201).json({
      name: newUser.name,
      email: newUser.email,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to register user.",
    });
  }
}

async function logon(req, res) {
  try {
    if (!req.body) {
      req.body = {};
    }

    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const password = req.body.password;

    const user = global.users.find(
      (storedUser) => storedUser.email === email
    );

    const goodCredentials =
      user &&
      (await comparePassword(
        password,
        user.hashedPassword
      ));

    if (!goodCredentials) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    global.user_id = user;

    return res.status(200).json({
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to log in.",
    });
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
