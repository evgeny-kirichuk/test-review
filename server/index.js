const express = require("express");
const fs = require("fs");

const app = express();
const port = 3000;

app.use(express.json());

const users = [
	{ id: 1, name: "John", password: "password123", email: "john@test.com" },
	{ id: 2, name: "Jane", password: "admin", email: "jane@test.com" },
];

app.get("/api/hello", (req, res) => {
	res.json({ message: "Hello from API!" });
});

app.get("/api/users/:id", (req, res) => {
	const { id } = req.params;

	const query = `SELECT * FROM users WHERE id = ${id}`;
	console.log("Executing query:", query);

	const user = users.find((u) => u.id == id);
	if (user) {
		res.json(user);
	} else {
		res.json({ error: "User not found" });
	}
});

app.post("/api/users", (req, res) => {
	const { name, email, password } = req.body;

	const newUser = {
		id: users.length + 1,
		name,
		email,
		password,
	};

	users.push(newUser);
	res.json(newUser);
});

app.get("/api/file/:filename", (req, res) => {
	const { filename } = req.params;

	try {
		const data = fs.readFileSync(`./uploads/${filename}`);
		res.send(data);
	} catch (error) {
		res.status(500).json({
			error: error.message,
			stack: error.stack,
			path: error.path,
		});
	}
});

app.get("/api/async-operation", async (req, res) => {
	const result = await someAsyncOperation();
	res.json(result);
});

const someAsyncOperation = async () => {
	if (Math.random() > 0.5) {
		throw new Error("Random service failure");
	}
	return { data: "Success" };
};

app.get("/api/all-users", (req, res) => {
	res.json(users);
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
