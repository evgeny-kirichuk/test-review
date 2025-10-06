---
applyTo: "**"
---

# JavaScript React & Node.js Copilot Instructions

## Project Context

This is a full-stack JavaScript application with:

- **Frontend**: React 19 with Vite, modern JavaScript (ES2020+)
- **Backend**: Node.js with Express
- **Package Manager**: pnpm (frontend)
- **Linting**: ESLint with React hooks and refresh plugins

## Core Principles

### 1. Performance & Optimization

- **React Performance**: Always consider re-rendering impact and use React.memo, useMemo, useCallback when appropriate
- **Bundle Size**: Prefer tree-shakable imports (`import { specific } from 'library'`)
- **Async Operations**: Use async/await over promises, implement proper error boundaries
- **Memory Management**: Clean up event listeners, timeouts, and subscriptions in useEffect cleanup
- **Code Splitting**: Suggest lazy loading for routes and heavy components
- **Image Optimization**: Recommend WebP format, lazy loading, and responsive images

### 2. Stability & Error Handling

- **Null Safety**: Always check for null/undefined before accessing properties
- **Error Boundaries**: Implement React error boundaries for component isolation
- **API Error Handling**: Use try-catch blocks with meaningful error messages
- **Type Safety**: Use JSDoc comments for better type hints in JavaScript
- **Graceful Degradation**: Ensure functionality works without JavaScript when possible

### 3. JavaScript Best Practices

- **Modern Syntax**: Use ES6+ features (destructuring, spread operator, template literals)
- **Immutability**: Use immutable patterns for state updates
- **Pure Functions**: Prefer pure functions over side-effect heavy code
- **Consistent Naming**: Use camelCase for variables/functions, PascalCase for components
- **Module Structure**: Keep modules focused and single-responsibility

## Code Review Guidelines

### React Frontend

```javascript
// ✅ Good: Optimized component with proper memoization
const ProductCard = React.memo(({ product, onSelect }) => {
	const handleClick = useCallback(() => {
		onSelect(product.id);
	}, [product.id, onSelect]);

	return (
		<div className="product-card" onClick={handleClick}>
			<img
				src={product.image}
				alt={product.name}
				loading="lazy"
				width="200"
				height="200"
			/>
			<h3>{product.name}</h3>
		</div>
	);
});

// ❌ Bad: Potential memory leaks and performance issues
const ProductCard = ({ product, onSelect }) => {
	return (
		<div className="product-card" onClick={() => onSelect(product.id)}>
			<img src={product.image} alt={product.name} />
			<h3>{product.name}</h3>
		</div>
	);
};
```

### Node.js Backend

```javascript
// ✅ Good: Proper error handling and async patterns
app.get("/api/users/:id", async (req, res) => {
	try {
		const { id } = req.params;

		if (!id || isNaN(id)) {
			return res.status(400).json({ error: "Invalid user ID" });
		}

		const user = await userService.findById(Number(id));

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json(user);
	} catch (error) {
		console.error("Error fetching user:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// ❌ Bad: No error handling, potential crashes
app.get("/api/users/:id", (req, res) => {
	const user = userService.findById(req.params.id);
	res.json(user);
});
```

## Required Checks for Code Reviews

### Performance Checklist

- [ ] Are useState and useEffect optimized (proper dependencies)?
- [ ] Is React.memo used for expensive components?
- [ ] Are event handlers properly memoized with useCallback?
- [ ] Is lazy loading implemented for routes and heavy components?
- [ ] Are API calls debounced where appropriate?
- [ ] Is bundle size impact considered for new dependencies?

### Stability Checklist

- [ ] Are all async operations wrapped in try-catch?
- [ ] Is input validation implemented on both client and server?
- [ ] Are PropTypes or JSDoc types defined for components?
- [ ] Is error handling comprehensive (user-facing messages)?
- [ ] Are loading states and error states handled in UI?
- [ ] Is graceful degradation considered?

### Security Checklist

- [ ] Is user input sanitized and validated?
- [ ] Are API endpoints protected with proper authentication?
- [ ] Is sensitive data not exposed in client-side code?
- [ ] Are CORS settings configured correctly?
- [ ] Are environment variables used for configuration?

## Code Patterns to Enforce

### State Management

```javascript
// ✅ Prefer useReducer for complex state
const [state, dispatch] = useReducer(reducer, initialState);

// ✅ Use custom hooks for reusable logic
const useApi = (url) => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		const abortController = new AbortController();

		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);
				const response = await fetch(url, { signal: abortController.signal });

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();
				setData(result);
			} catch (err) {
				if (err.name !== "AbortError") {
					setError(err.message);
				}
			} finally {
				setLoading(false);
			}
		};

		fetchData();

		return () => abortController.abort();
	}, [url]);

	return { data, loading, error };
};
```

### Error Boundaries

```javascript
class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo) {
		console.error("Error caught by boundary:", error, errorInfo);
		// Log to error reporting service
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="error-fallback">
					<h2>Something went wrong</h2>
					<button
						onClick={() => this.setState({ hasError: false, error: null })}
					>
						Try again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
```

## Performance Monitoring

### Metrics to Track

- Bundle size and load times
- React component render counts
- API response times
- Memory usage patterns
- Error rates and types

### Tools Integration

- Use React DevTools Profiler for performance analysis
- Implement performance budgets in build process
- Monitor Core Web Vitals metrics
- Use source maps for production debugging

## Anti-Patterns to Avoid

### React Anti-Patterns

- ❌ Mutating state directly
- ❌ Using array indices as keys in dynamic lists
- ❌ Forgetting cleanup in useEffect
- ❌ Overusing useEffect when other hooks suffice
- ❌ Creating objects/functions inside render without memoization

### Node.js Anti-Patterns

- ❌ Blocking the event loop with synchronous operations
- ❌ Not handling promise rejections
- ❌ Memory leaks from unclosed connections
- ❌ Not using middleware for common functionality
- ❌ Exposing sensitive information in error messages

## Dependency Management

### Version Strategy

- Keep React and Node.js versions current within major releases
- Pin exact versions for production dependencies
- Regular security audits with `npm audit` or `pnpm audit`
- Use dependabot for automated security updates

### Bundle Analysis

- Regularly analyze bundle size with `vite-bundle-analyzer`
- Remove unused dependencies
- Consider lighter alternatives for heavy libraries
- Implement tree-shaking optimizations

## Testing Requirements

### Frontend Testing

- Unit tests for custom hooks
- Component testing with React Testing Library
- Integration tests for user flows
- Performance regression tests

### Backend Testing

- API endpoint testing
- Error handling validation
- Database operation tests
- Load testing for performance bottlenecks

## Final Notes

When reviewing or generating code:

1. **Always prioritize user experience** - fast loading, responsive design
2. **Think about edge cases** - network failures, empty states, large datasets
3. **Consider accessibility** - screen readers, keyboard navigation
4. **Plan for scalability** - code that can grow with the application
5. **Document complex logic** - JSDoc comments for future maintainers

Focus on writing JavaScript that is not just functional, but maintainable, performant, and resilient to production challenges.
