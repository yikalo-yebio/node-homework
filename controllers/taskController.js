const pool = require("../db/pg-pool");
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
    const result = await pool.query(
      `INSERT INTO tasks (title, is_completed, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, is_completed`,
      [value.title, value.isCompleted, global.user_id]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function index(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, title, is_completed
       FROM tasks
       WHERE user_id = $1
       ORDER BY id`,
      [global.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No tasks found.",
      });
    }

    return res.status(200).json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  const taskId = parseInt(req.params?.id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, title, is_completed
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
      [taskId, global.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  if (!req.body) {
    req.body = {};
  }

  const { error, value: taskChange } = patchTaskSchema.validate(
    req.body,
    {
      abortEarly: false,
    }
  );

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const taskId = parseInt(req.params?.id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const originalKeys = Object.keys(taskChange);

  const databaseKeys = originalKeys.map((key) =>
    key === "isCompleted" ? "is_completed" : key
  );

  const setClauses = databaseKeys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", ");

  const taskIdParameter = `$${databaseKeys.length + 1}`;
  const userIdParameter = `$${databaseKeys.length + 2}`;

  const parameterValues = [
    ...originalKeys.map((key) => taskChange[key]),
    taskId,
    global.user_id,
  ];

  try {
    const result = await pool.query(
      `UPDATE tasks
       SET ${setClauses}
       WHERE id = ${taskIdParameter}
         AND user_id = ${userIdParameter}
       RETURNING id, title, is_completed`,
      parameterValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function deleteTask(req, res, next) {
  const taskId = parseInt(req.params?.id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, is_completed`,
      [taskId, global.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found.",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
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
