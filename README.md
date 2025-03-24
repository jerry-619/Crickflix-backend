# 🏏 Crickflix Backend

Crickflix – Your Ultimate Destination for Live Cricket Streaming! This is the backend service that powers the Crickflix platform, providing APIs for live cricket matches, categories, blogs, and user management.

## 📋 Description

Crickflix Backend is built with Node.js and Express, providing a robust API infrastructure for managing live cricket streams, match details, categories, blogs, and user authentication. It uses MongoDB for data storage and supports file uploads for match thumbnails and blog images.

## 🚀 Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/crickflix-backend.git
cd crickflix-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```
Edit the `.env` file with your configuration:
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=your_mongodb_uri

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d

# Admin Configuration
ADMIN_USERNAME=your_admin_username
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password

# File Upload Configuration
MAX_FILE_SIZE=5242880 # 5MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# CORS Configuration
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# Optional Features
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_RATE_LIMITING=true
```

4. Start the server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🛣️ API Routes

### Authentication Routes
- `POST /api/auth/setup-admin` - Register a admin
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - verify admin 

### Match Routes
- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get single match
- `POST /api/matches` - Create new match (Admin)
- `PUT /api/matches/:id` - Update match (Admin)
- `DELETE /api/matches/:id` - Delete match (Admin)
- `POST /api/matches/:id/view` - Increment match views

### Category Routes
- `GET /api/categories` - Get all categories
- `GET /api/categories/:slug` - Get single category
- `POST /api/categories` - Create new category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Blog Routes
- `GET /api/blogs` - Get all blogs
- `GET /api/blogs/:slug` - Get single blog
- `POST /api/blogs` - Create new blog (Admin)
- `PUT /api/blogs/:id` - Update blog (Admin)
- `DELETE /api/blogs/:id` - Delete blog (Admin)

### Admin Routes
- `GET /api/admin/stats` - Get platform statistics
- `GET /api/admin/users` - Get all users (Admin)
- `PUT /api/admin/users/:id` - Update user role (Admin)
- `DELETE /api/admin/users/:id` - Delete user (Admin)

### Stream Routes
- `GET /api/stream/:id` - Get stream details
- `POST /api/stream` - Create new stream (Admin)
- `PUT /api/stream/:id` - Update stream (Admin)
- `DELETE /api/stream/:id` - Delete stream (Admin)

## 🔒 Security Features

- JWT Authentication
- Role-based access control
- Request rate limiting
- CORS protection
- File upload validation
- Error handling middleware
- Secure password hashing
- Environment Variables Protection:
  - Secure admin credentials
  - File upload restrictions
  - CORS origin validation
  - Rate limiting configuration
  - JWT secret management

## 🛠️ Built With

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Multer (File uploads)
- Express Validator
- CORS
- Dotenv

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ✍️ Author

**Fardeen Beigh**
- Email: itxjerry.com@gmail.com
- Telegram: [@btw_69](https://t.me/btw_69)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/jerry-619/crickflix-backend/issues).

## 📬 Contact

For any queries or support, please contact:
- Email: itxjerry.com@gmail.com
- Telegram: [@btw_69](https://t.me/btw_69)

## 🌟 Show your support

Give a ⭐️ if this project helped you!
