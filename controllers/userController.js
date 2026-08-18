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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          priority: "medium",
        },
        {
          title: "Add your first task",
          userId: newUser.id,
          priority: "high",
        },
        {
          title: "Explore the app",
          userId: newUser.id,
          priority: "low",
        },
      ];

      await tx.task.createMany({
        data: welcomeTaskData,
      });

      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: {
            in: welcomeTaskData.map((task) => task.title),
          },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return {
        user: newUser,
        welcomeTasks,
      };
    });

    global.user_id = result.user.id;

    return res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({
        error: "Email already registered",
      });
    }

    return next(err);
  }
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
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        hashedPassword: true,
      },
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

async function show(req, res, next) {
  const userId = parseInt(req.params.id, 10);

  if (Number.isNaN(userId)) {
    return res.status(400).json({
      error: "Invalid user ID",
    });
  }

  const defaultSelect = {
    id: true,
    name: true,
    email: true,
    createdAt: true,
    tasks: {
      where: {
        isCompleted: false,
      },
      select: {
        id: true,
        title: true,
        priority: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    },
  };

  let select = defaultSelect;

  if (typeof req.query.fields === "string") {
    const requestedFields = req.query.fields
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);

    const allowedFields = [
      "id",
      "name",
      "email",
      "createdAt",
      "tasks",
    ];

    select = {};

    for (const field of requestedFields) {
      if (!allowedFields.includes(field)) {
        continue;
      }

      if (field === "tasks") {
        select.tasks = {
          where: {
            isCompleted: false,
          },
          select: {
            id: true,
            title: true,
            priority: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        };
      } else {
        select[field] = true;
      }
    }

    if (Object.keys(select).length === 0) {
      return res.status(400).json({
        message: "No valid fields were requested.",
      });
    }
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
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
  show,
  logoff,
};
