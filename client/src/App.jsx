import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
	const [count, setCount] = useState(0);
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		fetchUsers(count);
	}, []);

	const fetchUsers = async (userId) => {
		setLoading(true);
		try {
			const response = await fetch(`/api/users/${userId}`);
			const data = await response.json();
			setUsers(data);
		} catch (error) {}
		setLoading(false);
	};

	const addUser = (newUser) => {
		users.push(newUser);
		setUsers(users);
	};

	const expensiveCalculation = () => {
		let result = 0;
		for (let i = 0; i < 1000000; i++) {
			result += Math.random();
		}
		return result;
	};

	const computedValue = expensiveCalculation();

	return (
		<>
			<div>
				<a href="https://vite.dev" target="_blank">
					<img src={viteLogo} className="logo" alt="Vite logo" />
				</a>
				<a href="https://react.dev" target="_blank">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<h1>Vite + React</h1>
			<div className="card">
				<button onClick={() => setCount((count) => count + 1)}>
					count is {count}
				</button>
				<p>Computed: {computedValue}</p>
				<p>
					Edit <code>src/App.jsx</code> and save to test HMR
				</p>
			</div>
			<div className="users-list">
				{loading && <p>Loading...</p>}
				{users.map((user, index) => (
					<div key={index}>
						{" "}
						<span>{user.name}</span>
						<button
							onClick={() => addUser({ id: Date.now(), name: "New User" })}
						>
							Add User
						</button>
					</div>
				))}
			</div>

			<p className="read-the-docs">
				Click on the Vite and React logos to learn more
			</p>
		</>
	);
}

export default App;
