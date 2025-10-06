---
applyTo: "client/src/**"
---

# React Frontend Code Review Instructions

## Review Format

**IMPORTANT**: All review comments for client-side code MUST start with "REVIEWING CLIENT CODE!"

Example:

```
REVIEWING CLIENT CODE! This component is missing error boundary handling for the async data fetch.
```

## Project Context

- **React Version**: 19.x with modern features
- **Build Tool**: Vite for fast development and optimized builds
- **Package Manager**: pnpm
- **JavaScript**: ES2020+ with modern syntax
- **Styling**: CSS with CSS modules support

## Critical Review Areas

### 1. Performance & Re-rendering

**REVIEWING CLIENT CODE!** Focus on these performance patterns:

#### ✅ Required Optimizations

```javascript
// Memoized components for expensive renders
const ProductList = React.memo(({ products, onProductSelect }) => {
	return (
		<div className="product-list">
			{products.map((product) => (
				<ProductCard
					key={product.id}
					product={product}
					onSelect={onProductSelect}
				/>
			))}
		</div>
	);
});

// Memoized callbacks to prevent child re-renders
const ProductContainer = () => {
	const [selectedId, setSelectedId] = useState(null);

	const handleProductSelect = useCallback((productId) => {
		setSelectedId(productId);
	}, []);

	return (
		<ProductList products={products} onProductSelect={handleProductSelect} />
	);
};

// Memoized expensive calculations
const ProductStats = ({ products }) => {
	const stats = useMemo(() => {
		return products.reduce(
			(acc, product) => {
				acc.totalValue += product.price * product.quantity;
				acc.count += 1;
				return acc;
			},
			{ totalValue: 0, count: 0 }
		);
	}, [products]);

	return <div>Total: ${stats.totalValue}</div>;
};
```

#### ❌ Performance Issues to Flag

```javascript
// REVIEWING CLIENT CODE! This creates new functions on every render
const BadComponent = ({ items, onItemClick }) => {
	return (
		<div>
			{items.map((item) => (
				<button
					key={item.id}
					onClick={() => onItemClick(item.id)} // ❌ New function every render
				>
					{item.name}
				</button>
			))}
		</div>
	);
};

// REVIEWING CLIENT CODE! This component will re-render unnecessarily
const ExpensiveComponent = ({ data, config }) => {
	const processedData = data.map((item) => ({
		// ❌ Runs on every render
		...item,
		processed: true,
	}));

	return <div>{processedData.length} items</div>;
};
```

### 2. State Management Patterns

#### ✅ Proper State Patterns

```javascript
// Use useReducer for complex state logic
const todoReducer = (state, action) => {
	switch (action.type) {
		case "ADD_TODO":
			return {
				...state,
				todos: [
					...state.todos,
					{ id: Date.now(), text: action.text, completed: false },
				],
			};
		case "TOGGLE_TODO":
			return {
				...state,
				todos: state.todos.map((todo) =>
					todo.id === action.id ? { ...todo, completed: !todo.completed } : todo
				),
			};
		default:
			return state;
	}
};

// Custom hooks for reusable state logic
const useLocalStorage = (key, initialValue) => {
	const [storedValue, setStoredValue] = useState(() => {
		try {
			const item = window.localStorage.getItem(key);
			return item ? JSON.parse(item) : initialValue;
		} catch (error) {
			console.error(`Error reading localStorage key "${key}":`, error);
			return initialValue;
		}
	});

	const setValue = useCallback(
		(value) => {
			try {
				setStoredValue(value);
				window.localStorage.setItem(key, JSON.stringify(value));
			} catch (error) {
				console.error(`Error setting localStorage key "${key}":`, error);
			}
		},
		[key]
	);

	return [storedValue, setValue];
};
```

#### ❌ State Anti-patterns

```javascript
// REVIEWING CLIENT CODE! Direct state mutation detected
const BadTodoComponent = () => {
	const [todos, setTodos] = useState([]);

	const addTodo = (text) => {
		todos.push({ id: Date.now(), text }); // ❌ Direct mutation
		setTodos(todos); // ❌ Same reference
	};
};

// REVIEWING CLIENT CODE! Missing dependency in useEffect
const BadEffectComponent = ({ userId }) => {
	const [user, setUser] = useState(null);

	useEffect(() => {
		fetchUser(userId).then(setUser); // ❌ userId not in deps
	}, []); // ❌ Missing userId dependency
};
```

### 3. Error Handling & Boundaries

#### ✅ Required Error Patterns

```javascript
// Error boundaries for component isolation
class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true };
	}

	componentDidCatch(error, errorInfo) {
		this.setState({
			error,
			errorInfo,
		});

		// Log to error reporting service
		console.error("Error caught by boundary:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="error-boundary">
					<h2>Something went wrong.</h2>
					<details style={{ whiteSpace: "pre-wrap" }}>
						{this.state.error && this.state.error.toString()}
						<br />
						{this.state.errorInfo.componentStack}
					</details>
					<button onClick={() => this.setState({ hasError: false })}>
						Try again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

// Async error handling in components
const UserProfile = ({ userId }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		const abortController = new AbortController();

		const fetchUser = async () => {
			try {
				setLoading(true);
				setError(null);
				const response = await fetch(`/api/users/${userId}`, {
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch user: ${response.status}`);
				}

				const userData = await response.json();
				setUser(userData);
			} catch (err) {
				if (err.name !== "AbortError") {
					setError(err.message);
				}
			} finally {
				setLoading(false);
			}
		};

		fetchUser();

		return () => abortController.abort();
	}, [userId]);

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;
	if (!user) return <div>No user found</div>;

	return <div>{user.name}</div>;
};
```

### 4. Accessibility & UX

#### ✅ Required A11y Patterns

```javascript
// REVIEWING CLIENT CODE! Ensure proper ARIA labels and keyboard navigation
const AccessibleModal = ({ isOpen, onClose, title, children }) => {
	const modalRef = useRef();

	useEffect(() => {
		if (isOpen) {
			modalRef.current?.focus();
		}
	}, [isOpen]);

	const handleKeyDown = (e) => {
		if (e.key === "Escape") {
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="modal-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<div
				className="modal-content"
				ref={modalRef}
				tabIndex={-1}
				onKeyDown={handleKeyDown}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal-header">
					<h2 id="modal-title">{title}</h2>
					<button
						onClick={onClose}
						aria-label="Close modal"
						className="close-button"
					>
						×
					</button>
				</div>
				<div className="modal-body">{children}</div>
			</div>
		</div>
	);
};

// Form accessibility
const AccessibleForm = () => {
	const [email, setEmail] = useState("");
	const [errors, setErrors] = useState({});

	return (
		<form>
			<div className="form-group">
				<label htmlFor="email">Email Address</label>
				<input
					id="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					aria-invalid={errors.email ? "true" : "false"}
					aria-describedby={errors.email ? "email-error" : undefined}
				/>
				{errors.email && (
					<div id="email-error" role="alert" className="error">
						{errors.email}
					</div>
				)}
			</div>
		</form>
	);
};
```

### 5. Bundle Size & Imports

#### ✅ Required Import Patterns

```javascript
// Tree-shakable imports
import { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash-es"; // ✅ ES modules for tree shaking

// Lazy loading for code splitting
const LazyComponent = lazy(() => import("./ExpensiveComponent"));
const LazyRoute = lazy(() => import("../pages/Dashboard"));

// Dynamic imports for large libraries
const LazyLibraryComponent = () => {
	const [chartLib, setChartLib] = useState(null);

	useEffect(() => {
		import("chart.js").then(setChartLib);
	}, []);

	if (!chartLib) return <div>Loading chart...</div>;

	return <Chart library={chartLib} />;
};
```

#### ❌ Bundle Size Issues

```javascript
// REVIEWING CLIENT CODE! Avoid entire library imports
import _ from "lodash"; // ❌ Imports entire library
import * as lodash from "lodash"; // ❌ Same issue

// REVIEWING CLIENT CODE! Prefer tree-shakable alternatives
import moment from "moment"; // ❌ Large bundle size
// Use date-fns or built-in Date instead
```

### 6. React 19 Specific Patterns

#### ✅ Modern React 19 Features

```javascript
// Use React 19's automatic batching
const ModernComponent = () => {
	const [count, setCount] = useState(0);
	const [name, setName] = useState("");

	// These will be automatically batched in React 19
	const handleClick = () => {
		setCount((c) => c + 1);
		setName("Updated");
	};

	return <button onClick={handleClick}>Update</button>;
};

// Concurrent features with Suspense
const DataComponent = () => {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<AsyncDataComponent />
		</Suspense>
	);
};
```

## Review Checklist

### Performance Review

- [ ] **REVIEWING CLIENT CODE!** Are components properly memoized with React.memo?
- [ ] **REVIEWING CLIENT CODE!** Are event handlers memoized with useCallback?
- [ ] **REVIEWING CLIENT CODE!** Are expensive calculations memoized with useMemo?
- [ ] **REVIEWING CLIENT CODE!** Is lazy loading implemented for large components?
- [ ] **REVIEWING CLIENT CODE!** Are list keys stable and unique (not array indices)?

### State Management Review

- [ ] **REVIEWING CLIENT CODE!** Is state updated immutably?
- [ ] **REVIEWING CLIENT CODE!** Are useEffect dependencies complete and correct?
- [ ] **REVIEWING CLIENT CODE!** Is useReducer used for complex state logic?
- [ ] **REVIEWING CLIENT CODE!** Are side effects properly cleaned up?

### Error Handling Review

- [ ] **REVIEWING CLIENT CODE!** Are error boundaries implemented for critical sections?
- [ ] **REVIEWING CLIENT CODE!** Is async error handling comprehensive?
- [ ] **REVIEWING CLIENT CODE!** Are loading and error states handled in UI?
- [ ] **REVIEWING CLIENT CODE!** Is user feedback provided for error scenarios?

### Accessibility Review

- [ ] **REVIEWING CLIENT CODE!** Are semantic HTML elements used?
- [ ] **REVIEWING CLIENT CODE!** Are ARIA labels and roles properly implemented?
- [ ] **REVIEWING CLIENT CODE!** Is keyboard navigation supported?
- [ ] **REVIEWING CLIENT CODE!** Are form elements properly labeled?

### Bundle Size Review

- [ ] **REVIEWING CLIENT CODE!** Are imports tree-shakable?
- [ ] **REVIEWING CLIENT CODE!** Are heavy libraries lazy-loaded?
- [ ] **REVIEWING CLIENT CODE!** Is code splitting implemented for routes?
- [ ] **REVIEWING CLIENT CODE!** Are unnecessary dependencies avoided?

## Common Issues to Flag

### Critical Issues

1. **REVIEWING CLIENT CODE!** Direct state mutation
2. **REVIEWING CLIENT CODE!** Missing cleanup in useEffect
3. **REVIEWING CLIENT CODE!** Improper error handling in async operations
4. **REVIEWING CLIENT CODE!** Performance bottlenecks (unnecessary re-renders)
5. **REVIEWING CLIENT CODE!** Accessibility violations

### Warning Issues

1. **REVIEWING CLIENT CODE!** Missing memoization opportunities
2. **REVIEWING CLIENT CODE!** Large bundle size increases
3. **REVIEWING CLIENT CODE!** Inconsistent naming conventions
4. **REVIEWING CLIENT CODE!** Missing error boundaries
5. **REVIEWING CLIENT CODE!** Incomplete loading states

## Review Comment Templates

### Performance Issues

```
REVIEWING CLIENT CODE! Performance concern: This component re-renders unnecessarily.
Consider memoizing with React.memo() and useCallback() for event handlers.

Suggested fix:
[provide optimized code example]
```

### State Management Issues

```
REVIEWING CLIENT CODE! State mutation detected: Direct modification of state arrays/objects
can cause rendering issues. Use immutable update patterns.

Suggested fix:
[provide immutable update example]
```

### Error Handling Issues

```
REVIEWING CLIENT CODE! Missing error handling: Async operations should include
try-catch blocks and user-friendly error states.

Suggested fix:
[provide error handling example]
```

### Accessibility Issues

```
REVIEWING CLIENT CODE! Accessibility violation: Missing ARIA labels or keyboard
navigation support. This impacts users with disabilities.

Suggested fix:
[provide accessible implementation]
```
