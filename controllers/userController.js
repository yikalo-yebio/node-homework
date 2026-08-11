const crypto = require("crypto");
const util = require("util");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");

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
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const { name, email, password } = value;

  const hashedPassword = await hashPassword(password);

  let user = null;

  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
      },
      select: {
        name: true,
        email: true,
        id: true,
      },
    });
  } catch (err) {
    if (
      err.name === "PrismaClientKnownRequestError" &&
      err.code === "P2002"
    ) {
      return res.status(400).json({
        message: "A user with that email already exists.",
      });
    }

    return next(err);
  }

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

    let email =
      typeof req.body.email === "string"
        ? req.body.email.trim()
        : "";

    const password = req.body.password;

    email = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const goodCredentials = await comparePassword(
      password,
      user.hashedPassword
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
