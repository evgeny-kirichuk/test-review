---
applyTo: "server/**"
---

# Node.js Backend Code Review Instructions

## Review Format

**IMPORTANT**: All review comments for server-side code MUST start with "REVIEWING SERVER CODE!" followed by a severity indicator.

### Severity Indicators
Use color-coded severity levels to indicate issue importance:

- 🔴 **CRITICAL** - Security vulnerabilities, SQL injection risks, authentication bypasses, data leaks
- 🟠 **IMPORTANT** - Performance bottlenecks, error handling gaps, API design issues
- 🟢 **MINOR** - Code style, logging improvements, configuration suggestions

### Format Examples:

```
REVIEWING SERVER CODE! 🔴 CRITICAL: SQL injection vulnerability detected - user input directly interpolated into query.

REVIEWING SERVER CODE! 🟠 IMPORTANT: Missing error handling for async operations can crash the application.

REVIEWING SERVER CODE! 🟢 MINOR: Consider using environment variables for configuration instead of hardcoded values.
```

## Project Context

- **Runtime**: Node.js with Express framework
- **JavaScript**: ES2020+ with CommonJS modules
- **Architecture**: RESTful API design
- **Environment**: Development and production configurations

## Critical Review Areas

### 1. Security & Input Validation

**REVIEWING SERVER CODE!** Focus on these security patterns:

#### ✅ Required Security Patterns

```javascript
// Input validation and sanitization
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const validator = require("validator");

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
	message: "Too many requests from this IP",
});
app.use("/api/", limiter);

// Input validation middleware
const validateUserInput = (req, res, next) => {
	const { email, password, name } = req.body;

	if (!email || !validator.isEmail(email)) {
		return res.status(400).json({
			error: "Valid email is required",
			field: "email",
		});
	}

	if (!password || password.length < 8) {
		return res.status(400).json({
			error: "Password must be at least 8 characters",
			field: "password",
		});
	}

	if (!name || name.trim().length === 0) {
		return res.status(400).json({
			error: "Name is required",
			field: "name",
		});
	}

	// Sanitize inputs
	req.body.email = validator.normalizeEmail(email);
	req.body.name = validator.escape(name.trim());

	next();
};

// Secure route with validation
app.post("/api/users", validateUserInput, async (req, res) => {
	try {
		const { email, password, name } = req.body;

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(409).json({
				error: "User already exists with this email",
			});
		}

		// Hash password before storing
		const saltRounds = 12;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		const user = new User({
			email,
			password: hashedPassword,
			name,
		});

		await user.save();

		// Don't return password in response
		const { password: _, ...userResponse } = user.toObject();
		res.status(201).json(userResponse);
	} catch (error) {
		console.error("User creation error:", error);
		res.status(500).json({
			error: "Internal server error",
			message: "Failed to create user",
		});
	}
});
```

#### ❌ Security Issues to Flag

```javascript
// REVIEWING SERVER CODE! No input validation - security vulnerability
app.post("/api/users", (req, res) => {
	const { email, password } = req.body; // ❌ No validation

	// ❌ Direct database insertion without sanitization
	const user = new User({ email, password });
	user.save();

	res.json({ success: true }); // ❌ No error handling
});

// REVIEWING SERVER CODE! SQL injection vulnerability
app.get("/api/users/:id", (req, res) => {
	const { id } = req.params;

	// ❌ Direct string interpolation - SQL injection risk
	const query = `SELECT * FROM users WHERE id = ${id}`;
	db.query(query, (err, results) => {
		res.json(results); // ❌ No error handling
	});
});

// REVIEWING SERVER CODE! Password stored in plain text
app.post("/api/login", (req, res) => {
	const { email, password } = req.body;

	// ❌ Plain text password comparison
	const user = users.find((u) => u.email === email && u.password === password);

	if (user) {
		res.json({ token: "fake-token" }); // ❌ Hardcoded token
	}
});
```

### 2. Error Handling & Logging

#### ✅ Required Error Patterns

```javascript
// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
	console.error("Error details:", {
		message: err.message,
		stack: err.stack,
		url: req.url,
		method: req.method,
		ip: req.ip,
		userAgent: req.get("User-Agent"),
		timestamp: new Date().toISOString(),
	});

	// Don't leak internal errors in production
	if (process.env.NODE_ENV === "production") {
		if (err.statusCode) {
			return res.status(err.statusCode).json({
				error: err.message,
				code: err.code || "UNKNOWN_ERROR",
			});
		}

		return res.status(500).json({
			error: "Internal server error",
			code: "INTERNAL_ERROR",
		});
	}

	// Development - show full error details
	res.status(err.statusCode || 500).json({
		error: err.message,
		stack: err.stack,
		code: err.code || "UNKNOWN_ERROR",
	});
};

// Custom error classes for better error handling
class ValidationError extends Error {
	constructor(message, field) {
		super(message);
		this.name = "ValidationError";
		this.statusCode = 400;
		this.field = field;
		this.code = "VALIDATION_ERROR";
	}
}

class NotFoundError extends Error {
	constructor(resource) {
		super(`${resource} not found`);
		this.name = "NotFoundError";
		this.statusCode = 404;
		this.code = "NOT_FOUND";
	}
}

// Async error wrapper to catch unhandled promise rejections
const asyncHandler = (fn) => (req, res, next) => {
	Promise.resolve(fn(req, res, next)).catch(next);
};

// Proper error handling in routes
app.get(
	"/api/users/:id",
	asyncHandler(async (req, res, next) => {
		const { id } = req.params;

		if (!id || isNaN(id)) {
			throw new ValidationError("Invalid user ID format", "id");
		}

		const user = await User.findById(id);

		if (!user) {
			throw new NotFoundError("User");
		}

		res.json(user);
	})
);

// Apply error handler
app.use(errorHandler);

// Graceful shutdown handling
process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
	process.exit(1);
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
	process.exit(1);
});
```

#### ❌ Error Handling Issues

```javascript
// REVIEWING SERVER CODE! No error handling in async operations
app.get("/api/data", async (req, res) => {
	const data = await fetchDataFromAPI(); // ❌ No try-catch
	res.json(data);
});

// REVIEWING SERVER CODE! Exposing internal errors
app.post("/api/process", (req, res) => {
	try {
		processData(req.body);
	} catch (error) {
		// ❌ Leaking internal error details
		res.status(500).json({ error: error.message, stack: error.stack });
	}
});
```

### 3. Performance & Scalability

#### ✅ Required Performance Patterns

```javascript
// Database connection pooling and optimization
const mongoose = require("mongoose");

// Connection with proper configuration
mongoose.connect(process.env.DATABASE_URL, {
	maxPoolSize: 10, // Maintain up to 10 socket connections
	serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
	socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
	bufferCommands: false, // Disable mongoose buffering
	bufferMaxEntries: 0, // Disable mongoose buffering
});

// Caching middleware
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes default TTL

const cacheMiddleware = (duration = 600) => {
	return (req, res, next) => {
		const key = req.originalUrl || req.url;
		const cachedResponse = cache.get(key);

		if (cachedResponse) {
			res.set("X-Cache", "HIT");
			return res.json(cachedResponse);
		}

		res.set("X-Cache", "MISS");

		// Override res.json to cache the response
		const originalJson = res.json.bind(res);
		res.json = (data) => {
			cache.set(key, data, duration);
			return originalJson(data);
		};

		next();
	};
};

// Pagination and efficient queries
app.get(
	"/api/products",
	cacheMiddleware(300),
	asyncHandler(async (req, res) => {
		const page = parseInt(req.query.page) || 1;
		const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 items
		const skip = (page - 1) * limit;

		const query = {};

		// Add filters
		if (req.query.category) {
			query.category = req.query.category;
		}

		if (req.query.priceMin || req.query.priceMax) {
			query.price = {};
			if (req.query.priceMin) query.price.$gte = parseFloat(req.query.priceMin);
			if (req.query.priceMax) query.price.$lte = parseFloat(req.query.priceMax);
		}

		// Execute query with pagination
		const [products, total] = await Promise.all([
			Product.find(query)
				.select("name price category imageUrl") // Only select needed fields
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(), // Use lean for better performance
			Product.countDocuments(query),
		]);

		res.json({
			products,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
				hasNext: page < Math.ceil(total / limit),
				hasPrev: page > 1,
			},
		});
	})
);

// Request/Response compression
const compression = require("compression");
app.use(compression());

// Connection pooling for external APIs
const axios = require("axios");
const agent = new require("https").Agent({
	keepAlive: true,
	maxSockets: 50,
});

const apiClient = axios.create({
	httpsAgent: agent,
	timeout: 10000,
	headers: {
		"User-Agent": "MyApp/1.0",
	},
});
```

#### ❌ Performance Issues to Flag

```javascript
// REVIEWING SERVER CODE! N+1 query problem
app.get("/api/posts", async (req, res) => {
	const posts = await Post.find();

	// ❌ Making separate query for each post
	for (let post of posts) {
		post.author = await User.findById(post.authorId);
	}

	res.json(posts);
});

// REVIEWING SERVER CODE! Missing pagination
app.get("/api/all-data", async (req, res) => {
	// ❌ Returning all records without limit
	const data = await Model.find();
	res.json(data);
});

// REVIEWING SERVER CODE! Synchronous operations blocking event loop
app.get("/api/process", (req, res) => {
	// ❌ Blocking synchronous operation
	const result = processDataSync(req.body);
	res.json(result);
});
```

### 4. API Design & Documentation

#### ✅ Required API Patterns

```javascript
// RESTful API design with proper HTTP methods and status codes
const express = require("express");
const router = express.Router();

// GET - Retrieve resources
router.get(
	"/",
	asyncHandler(async (req, res) => {
		const users = await User.find().select("-password");
		res.json({
			success: true,
			data: users,
			count: users.length,
		});
	})
);

// GET - Retrieve single resource
router.get(
	"/:id",
	asyncHandler(async (req, res) => {
		const user = await User.findById(req.params.id).select("-password");

		if (!user) {
			return res.status(404).json({
				success: false,
				error: "User not found",
			});
		}

		res.json({
			success: true,
			data: user,
		});
	})
);

// POST - Create new resource
router.post(
	"/",
	validateUserInput,
	asyncHandler(async (req, res) => {
		const user = await User.create(req.body);

		res.status(201).json({
			success: true,
			data: user,
			message: "User created successfully",
		});
	})
);

// PUT - Update entire resource
router.put(
	"/:id",
	validateUserInput,
	asyncHandler(async (req, res) => {
		const user = await User.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		}).select("-password");

		if (!user) {
			return res.status(404).json({
				success: false,
				error: "User not found",
			});
		}

		res.json({
			success: true,
			data: user,
			message: "User updated successfully",
		});
	})
);

// PATCH - Partial update
router.patch(
	"/:id",
	asyncHandler(async (req, res) => {
		const allowedUpdates = ["name", "email"];
		const updates = Object.keys(req.body);
		const isValidOperation = updates.every((update) =>
			allowedUpdates.includes(update)
		);

		if (!isValidOperation) {
			return res.status(400).json({
				success: false,
				error: "Invalid updates. Allowed fields: " + allowedUpdates.join(", "),
			});
		}

		const user = await User.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		}).select("-password");

		if (!user) {
			return res.status(404).json({
				success: false,
				error: "User not found",
			});
		}

		res.json({
			success: true,
			data: user,
			message: "User updated successfully",
		});
	})
);

// DELETE - Remove resource
router.delete(
	"/:id",
	asyncHandler(async (req, res) => {
		const user = await User.findByIdAndDelete(req.params.id);

		if (!user) {
			return res.status(404).json({
				success: false,
				error: "User not found",
			});
		}

		res.json({
			success: true,
			message: "User deleted successfully",
		});
	})
);

// CORS configuration
const cors = require("cors");
app.use(
	cors({
		origin:
			process.env.NODE_ENV === "production"
				? ["https://yourdomain.com"]
				: ["http://localhost:3000", "http://localhost:5173"],
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
		allowedHeaders: ["Content-Type", "Authorization"],
	})
);
```

### 5. Environment & Configuration

#### ✅ Required Configuration Patterns

```javascript
// Environment configuration
require("dotenv").config();

const config = {
	port: process.env.PORT || 3000,
	nodeEnv: process.env.NODE_ENV || "development",
	dbUrl: process.env.DATABASE_URL || "mongodb://localhost:27017/myapp",
	jwtSecret: process.env.JWT_SECRET,
	jwtExpiry: process.env.JWT_EXPIRY || "24h",

	// API rate limiting
	rateLimit: {
		windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
		max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
	},

	// File upload limits
	upload: {
		maxSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
		allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(",") || [
			"image/jpeg",
			"image/png",
		],
	},
};

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter(
	(varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
	console.error("Missing required environment variables:", missingEnvVars);
	process.exit(1);
}

module.exports = config;
```

## Review Checklist

### Security Review

- [ ] **REVIEWING SERVER CODE!** Is input validation implemented for all endpoints?
- [ ] **REVIEWING SERVER CODE!** Are passwords properly hashed before storage?
- [ ] **REVIEWING SERVER CODE!** Is rate limiting configured to prevent abuse?
- [ ] **REVIEWING SERVER CODE!** Are SQL injection vulnerabilities prevented?
- [ ] **REVIEWING SERVER CODE!** Is sensitive data excluded from API responses?
- [ ] **REVIEWING SERVER CODE!** Are CORS settings properly configured?

### Error Handling Review

- [ ] **REVIEWING SERVER CODE!** Are all async operations wrapped in try-catch?
- [ ] **REVIEWING SERVER CODE!** Is centralized error handling middleware implemented?
- [ ] **REVIEWING SERVER CODE!** Are appropriate HTTP status codes returned?
- [ ] **REVIEWING SERVER CODE!** Is error logging comprehensive but secure?
- [ ] **REVIEWING SERVER CODE!** Are internal errors hidden in production?

### Performance Review

- [ ] **REVIEWING SERVER CODE!** Is database connection pooling configured?
- [ ] **REVIEWING SERVER CODE!** Are queries optimized to prevent N+1 problems?
- [ ] **REVIEWING SERVER CODE!** Is pagination implemented for large datasets?
- [ ] **REVIEWING SERVER CODE!** Is caching used appropriately?
- [ ] **REVIEWING SERVER CODE!** Are synchronous operations avoided in request handlers?

### API Design Review

- [ ] **REVIEWING SERVER CODE!** Do endpoints follow RESTful conventions?
- [ ] **REVIEWING SERVER CODE!** Are consistent response formats used?
- [ ] **REVIEWING SERVER CODE!** Is proper HTTP method usage enforced?
- [ ] **REVIEWING SERVER CODE!** Are resource relationships properly handled?

### Configuration Review

- [ ] **REVIEWING SERVER CODE!** Are environment variables used for configuration?
- [ ] **REVIEWING SERVER CODE!** Are required environment variables validated?
- [ ] **REVIEWING SERVER CODE!** Is sensitive data kept out of version control?
- [ ] **REVIEWING SERVER CODE!** Are different environment configurations supported?

## Common Issues to Flag

### Critical Issues

1. **REVIEWING SERVER CODE!** Missing input validation (security vulnerability)
2. **REVIEWING SERVER CODE!** SQL injection vulnerabilities
3. **REVIEWING SERVER CODE!** Plain text password storage
4. **REVIEWING SERVER CODE!** Unhandled promise rejections
5. **REVIEWING SERVER CODE!** Missing authentication/authorization

### Warning Issues

1. **REVIEWING SERVER CODE!** Missing error handling in async functions
2. **REVIEWING SERVER CODE!** Performance bottlenecks (N+1 queries, missing pagination)
3. **REVIEWING SERVER CODE!** Inconsistent API response formats
4. **REVIEWING SERVER CODE!** Missing request logging
5. **REVIEWING SERVER CODE!** Hardcoded configuration values

## Review Comment Templates

### Security Issues
```
REVIEWING SERVER CODE! 🔴 CRITICAL: Security vulnerability - Missing input validation exposes
the application to injection attacks and data corruption.

Suggested fix:
[provide validation middleware example]
```

### Performance Issues
```
REVIEWING SERVER CODE! 🟠 IMPORTANT: Performance concern - This endpoint may cause N+1 query
problems when loading related data. Consider using populate() or joins.

Suggested fix:
[provide optimized query example]
```

### Error Handling Issues
```
REVIEWING SERVER CODE! 🟠 IMPORTANT: Missing error handling - Unhandled promise rejections
can crash the application. Wrap async operations in try-catch blocks.

Suggested fix:
[provide error handling example]
```

### API Design Issues
```
REVIEWING SERVER CODE! 🟢 MINOR: API design inconsistency - This endpoint doesn't follow
RESTful conventions and uses inconsistent response format.

Suggested fix:
[provide RESTful endpoint example]
```
