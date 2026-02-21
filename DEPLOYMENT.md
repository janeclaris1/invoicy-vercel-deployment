# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
PORT=8000
MONGO_URI=your-production-mongodb-uri
JWT_SECRET=your-strong-secret-key-min-32-characters
GEMINI_API_KEY=your-gemini-api-key
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
LOG_LEVEL=info
```

**Frontend (.env):**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_GRA_COMPANY_REFERENCE=your-company-reference
VITE_GRA_SECURITY_KEY=your-security-key
```

### 2. Security Checklist

- [ ] Change `JWT_SECRET` to a strong random string (use: `openssl rand -base64 32`)
- [ ] Set `ALLOWED_ORIGINS` to your production domain only
- [ ] Ensure MongoDB connection uses SSL/TLS
- [ ] Whitelist your server IP in MongoDB Atlas
- [ ] Review and adjust rate limits if needed
- [ ] Set up SSL/TLS certificates (HTTPS)

### 3. Database

- [ ] MongoDB Atlas cluster is running (not paused)
- [ ] Database backups are configured
- [ ] IP whitelist includes your server IP
- [ ] Connection string uses SSL

### 4. Build & Test

**Backend:**
```bash
cd Backend
npm install --production
NODE_ENV=production npm start
```

**Frontend:**
```bash
cd Frontend/Invoicy
npm install
npm run build
# Test the build locally
npm run preview
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. Update environment variables in `docker-compose.yml` or use a `.env` file
2. Build and start:
```bash
docker-compose up -d --build
```

3. Check logs:
```bash
docker-compose logs -f
```

4. Health check:
```bash
curl http://localhost:8000/api/health
```

### Option 2: Manual Deployment

**Backend:**
1. Install Node.js 18+ on server
2. Clone repository
3. Install dependencies: `npm install --production`
4. Set environment variables
5. Start with PM2: `pm2 start server.js --name invoicy-backend`
6. Set up reverse proxy (nginx) for HTTPS

**Frontend:**
1. Build: `npm run build`
2. Serve `dist` folder with nginx or similar
3. Configure nginx for SPA routing (see `nginx.conf`)

### Option 3: Cloud Platforms

**Vercel/Netlify (Frontend):**
- Connect your repository
- Set build command: `npm run build`
- Set publish directory: `dist`
- Add environment variables

**Railway/Render/Heroku (Backend):**
- Connect your repository
- Set start command: `npm start`
- Add environment variables
- Configure MongoDB connection

## Post-Deployment

1. **Verify Health Check:**
   ```bash
   curl https://api.yourdomain.com/api/health
   ```

2. **Test Authentication:**
   - Register a new user
   - Login
   - Access protected routes

3. **Monitor Logs:**
   - Backend logs: `Backend/logs/combined.log` and `error.log`
   - Check for errors and warnings

4. **Set Up Monitoring:**
   - Monitor server resources (CPU, memory)
   - Set up alerts for errors
   - Monitor API response times

5. **Backup Strategy:**
   - Configure MongoDB Atlas automated backups
   - Set up regular database exports

## Troubleshooting

### Server Won't Start
- Check MongoDB connection
- Verify all environment variables are set
- Check logs for specific errors

### CORS Errors
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check browser console for specific origin

### Database Connection Issues
- Verify MongoDB URI is correct
- Check IP whitelist in MongoDB Atlas
- Ensure cluster is not paused

### Rate Limiting Issues
- Adjust limits in `Backend/middlewares/rateLimiter.js`
- Check if legitimate users are being blocked

## Security Notes

- Never commit `.env` files
- Use strong, unique secrets for production
- Enable HTTPS/SSL
- Regularly update dependencies: `npm audit fix`
- Monitor for security vulnerabilities
- Keep Node.js and dependencies updated
