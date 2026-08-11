const prisma = require("../db/prisma");

const {
  taskSchema,
  patchTaskSchema,
} = require("../validation/taskSchema");

async function create(req, res, next) {
  if (!req.body) {
    req.body = {};
  }

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: value.isCompleted,
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });

    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
}

async function index(req, res, next) {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });

    if (tasks.length === 0) {
      return res.status(404).json({
        message: "No tasks found.",
      });
    }

    return res.status(200).json(tasks);
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  const id = parseInt(req.params?.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.findUnique({
      where: {
        id,
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(task);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return next(error);
  }
}

async function update(req, res, next) {
  if (!req.body) {
    req.body = {};
  }

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const id = parseInt(req.params?.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id,
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });

    return res.status(200).json(task);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "The task was not found.",
      });
    }

    return next(error);
  }
}

async function deleteTask(req, res, next) {
  const id = parseInt(req.params?.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.delete({
      where: {
        id,
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });

    return res.status(200).json(task);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return next(error);
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
