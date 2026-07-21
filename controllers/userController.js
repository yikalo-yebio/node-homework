function register(req, res) {
  const { name, email, password } = req.body;

  const newUser = {
    id: global.users.length + 1,
    name,
    email,
    password,
  };

  global.users.push(newUser);

  global.user_id = newUser.id;

  res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
}

function logon(req, res) {
  const { email, password } = req.body;

  const user = global.users.find(
    (user) => user.email === email && user.password === password
  );

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  global.user_id = user.id;

  res.status(200).json({
    name: user.name,
    email: user.email,
  });
}

function logoff(req, res) {
  global.user_id = null;

  res.sendStatus(200);
}

module.exports = {
  register,
  logon,
  logoff,
};
