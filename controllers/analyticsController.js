const prisma = require("../db/prisma");

async function getUserAnalytics(req, res, next) {
  const userId = parseInt(req.params.id, 10);

  if (Number.isNaN(userId)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const taskStats = await prisma.task.groupBy({
      by: ["isCompleted"],
      where: {
        userId,
      },
      _count: {
        id: true,
      },
    });

    const recentTasks = await prisma.task.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyProgress = await prisma.task.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: {
          gte: oneWeekAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    return res.status(200).json({
      taskStats,
      recentTasks,
      weeklyProgress,
    });
  } catch (error) {
    return next(error);
  }
}

async function getUsersWithStats(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const usersRaw = await prisma.user.findMany({
      include: {
        tasks: {
          where: {
            isCompleted: false,
          },
          select: {
            id: true,
          },
          take: 5,
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: {
        Task: user._count.tasks,
      },
      Task: user.tasks,
    }));

    const totalUsers = await prisma.user.count();

    const pagination = {
      page,
      limit,
      total: totalUsers,
      pages: Math.ceil(totalUsers / limit),
      hasNext: page * limit < totalUsers,
      hasPrev: page > 1,
    };

    return res.status(200).json({
      users,
      pagination,
    });
  } catch (error) {
    return next(error);
  }
}

async function searchTasks(req, res, next) {
  const searchQuery =
    typeof req.query.q === "string"
      ? req.query.q.trim()
      : "";

  if (!searchQuery || searchQuery.length < 2) {
    return res.status(400).json({
      error: "Search query must be at least 2 characters long",
    });
  }

  const limit = parseInt(req.query.limit, 10) || 20;

  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  try {
    const searchResults = await prisma.$queryRaw`
      SELECT
        t.id,
        t.title,
        t.is_completed AS "isCompleted",
        t.priority,
        t.created_at AS "createdAt",
        t.user_id AS "userId",
        u.name AS "user_name"
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern}
         OR u.name ILIKE ${searchPattern}
      ORDER BY
        CASE
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${limit}
    `;

    return res.status(200).json({
      results: searchResults,
      query: searchQuery,
      count: searchResults.length,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
};
