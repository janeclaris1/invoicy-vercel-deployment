# Invoicy - Invoice & HR Management System

A comprehensive invoice generation and HR management system built with React and Node.js, designed for businesses in Ghana with GRA (Ghana Revenue Authority) integration.

## Features

- **Invoice Management**: Create, edit, and manage invoices with GRA QR code integration
- **HR Management**: Employee records, attendance, leave requests, payroll, and benefits
- **AI-Powered**: AI-assisted invoice creation from text or images
- **Reports & Analytics**: Comprehensive reporting and dashboard insights
- **Multi-user Support**: Team management with role-based access control
- **GRA Integration**: Automatic VAT submission to Ghana Revenue Authority

## Tech Stack

### Frontend
- React 19
- Vite
- Tailwind CSS
- React Router
- Axios
- React Hot Toast
- Moment.js
- html2pdf.js

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Google Gemini AI
- Express Validator
- Helmet (Security)
- Rate Limiting

## Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account (or local MongoDB instance)
- Google Gemini API key (for AI features)
- GRA API credentials (optional, for VAT submission)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "AIinvoice generator"
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend` directory:

```env
PORT=8000
NODE_ENV=development
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-super-secret-jwt-key
GEMINI_API_KEY=your-gemini-api-key
ALLOWED_ORIGINS=http://localhost:5173
LOG_LEVEL=debug
```

### 3. Frontend Setup

```bash
cd Frontend/Invoicy
npm install
```

Create a `.env` file in the `Frontend/Invoicy` directory:

```env
VITE_API_URL=http://localhost:8000
VITE_GRA_COMPANY_REFERENCE=your-company-reference
VITE_GRA_SECURITY_KEY=your-security-key
```

## Running the Application

### Development Mode

**Backend:**
```bash
cd Backend
npm run dev
```

**Frontend:**
```bash
cd Frontend/Invoicy
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

### Production Mode

#### Using Docker Compose (Recommended)

1. Create a `.env` file in the root directory with all required environment variables
2. Run:
```bash
docker-compose up -d
```

#### Manual Deployment

**Backend:**
```bash
cd Backend
NODE_ENV=production npm start
```

**Frontend:**
```bash
cd Frontend/Invoicy
npm run build
# Serve the dist folder using a web server like nginx
```

## Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 8000) |
| `NODE_ENV` | Environment (development/production) | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes (for AI features) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | Yes (production) |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | No |

### Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_GRA_COMPANY_REFERENCE` | GRA company reference | No |
| `VITE_GRA_SECURITY_KEY` | GRA security key | No |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice by ID
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Health Check
- `GET /api/health` - Server health status

See API documentation for complete endpoint list.

## Security Features

- ✅ JWT-based authentication
- ✅ Rate limiting on API endpoints
- ✅ CORS protection
- ✅ Security headers (Helmet.js)
- ✅ Input validation and sanitization
- ✅ Password hashing (bcrypt)
- ✅ Error message sanitization

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` with your domain
- [ ] Use strong `JWT_SECRET` (at least 32 characters)
- [ ] Ensure MongoDB connection is secure
- [ ] Set up SSL/TLS certificates
- [ ] Configure proper logging
- [ ] Set up monitoring and alerts
- [ ] Review and update rate limits
- [ ] Test all critical workflows
- [ ] Set up database backups

## Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB URI is correct
- Check IP whitelist in MongoDB Atlas
- Ensure cluster is not paused

### CORS Errors
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check browser console for specific error messages

### API Errors
- Check backend logs in `Backend/logs/`
- Verify environment variables are set correctly
- Ensure backend server is running

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Support

For support, email support@invoicy.com or create an issue in the repository.
