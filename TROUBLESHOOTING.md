# 🔧 TenderBridge Troubleshooting Guide

Common issues and their solutions.

---

## 🚨 Database Issues

### Error: "no such column: User.firstName"
**Symptom:** 500 errors when logging in or accessing user data

**Cause:** Database schema is outdated

**Solution:**
```powershell
# Stop backend server
# Backup current database
Copy-Item "backend\database.sqlite" "backend\database.sqlite.backup"

# Delete old database
Remove-Item "backend\database.sqlite"

# Restart server - it will recreate with new schema
cd backend
npm start
```

### Error: "SQLITE_BUSY: database is locked"
**Cause:** Multiple processes accessing database

**Solution:**
```powershell
# Stop all node processes
Stop-Process -Name "node" -Force

# Restart backend
cd backend
npm start
```

---

## 🔐 Authentication Issues

### Error: "Access token required"
**Cause:** Token not sent or expired

**Solution:**
```javascript
// Ensure Authorization header is set
headers: {
  'Authorization': `Bearer ${token}`
}

// Token expires after 24 hours - re-login if needed
```

### Error: "Invalid or expired token"
**Cause:** JWT token has expired or is malformed

**Solution:**
Login again to get a fresh token:
```javascript
POST /api/auth/login
{
  "email": "admin@tenderbridge.com",
  "password": "admin123"
}
```

---

## 🌐 CORS Issues

### Error: "blocked by CORS policy"
**Symptom:** Frontend can't access backend

**Solution:** Backend already configured for CORS. If still seeing errors:

1. Check backend is running on port 5000
2. Check frontend is on port 5173 or 5174
3. Verify server.js has correct CORS config:

```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
```

---

## 📁 File Upload Issues

### Error: "Invalid file type"
**Cause:** File extension not allowed

**Solution:** Check allowed extensions in `backend/utils/uploader.js`:
```javascript
const allowedExtensions = ['.pdf', '.dwg', '.png', '.jpg', '.jpeg', '.zip', '.xlsx', '.csv'];
```

### Error: "File too large"
**Cause:** File exceeds 10MB limit

**Solution:** Increase limit in `backend/utils/uploader.js`:
```javascript
limits: {
  fileSize: 10 * 1024 * 1024 // 10MB - increase if needed
}
```

---

## 🔄 Server Issues

### Backend won't start
**Symptoms:** Port errors, module errors

**Solutions:**

1. **Port already in use:**
```powershell
# Find and kill process on port 5000
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

2. **Missing dependencies:**
```powershell
cd backend
npm install
```

3. **Syntax errors:**
Check backend console for error details

### Frontend won't start

**Solutions:**

1. **Port already in use:**
```powershell
# Find and kill process on port 5173/5174
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
```

2. **Missing dependencies:**
```powershell
cd frontend
npm install
```

---

## 💰 Payment Workflow Issues

### Can't approve payment as engineer
**Cause:** User role not correct

**Check:**
```javascript
// User must have role: 'engineer' or 'project_manager'
// Payment must be in status: 'requested'
```

### Can't release payment as finance
**Cause:** Payment not engineer-approved yet

**Solution:**
Payments must go through workflow:
1. Contractor requests → status: 'requested'
2. Engineer approves → status: 'engineer_approved'
3. Finance releases → status: 'released'

---

## 📊 Dashboard Statistics Issues

### Stats showing zero
**Cause:** Fresh database with no data

**Solution:**
Database comes with seeded data. If empty:
```powershell
# Check seeder ran
# Look for "Database successfully seeded!" in backend console

# If not, restart backend - seeder runs automatically
```

### Stats endpoint returns 500
**Cause:** Database query error

**Check:**
1. All tables exist
2. Backend console for error details
3. User has proper permissions

---

## 🔍 Common API Errors

### 400 - Bad Request
**Cause:** Missing required fields or invalid data

**Solution:**
- Check API_REFERENCE.md for required fields
- Validate data types (numbers, dates, etc.)

### 401 - Unauthorized
**Cause:** No token or invalid token

**Solution:**
- Include `Authorization: Bearer <token>` header
- Re-login if token expired

### 403 - Forbidden
**Cause:** Insufficient permissions for action

**Solution:**
- Check user role matches required role
- See API_REFERENCE.md for role permissions

### 404 - Not Found
**Cause:** Resource doesn't exist

**Solution:**
- Verify ID is correct
- Check resource was created

### 500 - Internal Server Error
**Cause:** Server-side error

**Solution:**
- Check backend console for error details
- Check database connection
- Verify all fields are valid

---

## 🗄️ Database Migrations

### Need to add new field
**Current approach:** Database reset required

**Future improvement:** Use Sequelize migrations

**For now:**
```powershell
# Backup database
Copy-Item "backend\database.sqlite" "backend\database.sqlite.backup"

# Add field to model
# Delete database
Remove-Item "backend\database.sqlite"

# Restart - will recreate with new field
```

---

## 🧪 Testing Issues

### Can't test with Postman/curl
**Common mistakes:**

1. **Forgot Authorization header:**
```bash
# ❌ Wrong
curl http://localhost:5000/api/tenders

# ✅ Correct
curl http://localhost:5000/api/tenders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Wrong Content-Type for file upload:**
```bash
# ❌ Wrong - JSON for file upload
Content-Type: application/json

# ✅ Correct - FormData for file upload
Content-Type: multipart/form-data
```

3. **Forgot to stringify JSON:**
```javascript
// ❌ Wrong
body: { email: 'admin@example.com' }

# ✅ Correct
body: JSON.stringify({ email: 'admin@example.com' })
```

---

## 🐛 Debugging Tips

### Enable detailed logging

**Backend:**
Already has request logging. Check console for:
```
GET /api/tenders
POST /api/auth/login
```

### Check database directly

**Using SQLite browser:**
```powershell
# Install sqlite3 if needed
# Open database
sqlite3 backend\database.sqlite

# Run queries
SELECT * FROM Users;
SELECT * FROM Contractors WHERE verificationStatus = 'verified';
```

### Verify token payload

**Decode JWT:**
Use jwt.io or:
```javascript
const jwt = require('jsonwebtoken');
const decoded = jwt.decode(token);
console.log(decoded);
```

---

## 🔄 Reset Everything

### Complete system reset

```powershell
# 1. Stop all servers
Stop-Process -Name "node" -Force

# 2. Backup database (optional)
Copy-Item "backend\database.sqlite" "backend\database_full_backup.sqlite"

# 3. Delete database
Remove-Item "backend\database.sqlite"

# 4. Clean node_modules (optional - if dependency issues)
Remove-Item "backend\node_modules" -Recurse -Force
Remove-Item "frontend\node_modules" -Recurse -Force

# 5. Reinstall dependencies
cd backend
npm install
cd ../frontend
npm install

# 6. Start backend
cd ../backend
npm start

# 7. Start frontend (in new terminal)
cd ../frontend
npm run dev
```

---

## 📞 Getting More Help

### Check logs
1. **Backend console** - Server errors and requests
2. **Browser console** - Frontend errors
3. **Network tab** - API call details

### Check documentation
1. **API_REFERENCE.md** - All endpoints and examples
2. **PHASE1_COMPLETION_SUMMARY.md** - Feature details
3. **SETUP_COMPLETE.md** - Current system status

### Verify system status
```powershell
# Check if backend is running
curl http://localhost:5000/api/auth/login -Method Get

# Should return: {"error":"Access token required."}
# This means server is up and running
```

---

## 🛠️ Development Tools

### Recommended Tools
- **Postman** - API testing
- **DB Browser for SQLite** - Database inspection
- **VS Code** - Code editing
- **Thunder Client** - VS Code extension for API testing

### Useful Commands
```powershell
# Check running Node processes
Get-Process node

# Check ports in use
Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 5000}

# View backend logs
Get-Content backend\error.log -Wait

# Quick test API
Invoke-RestMethod -Uri http://localhost:5000/api/dashboard/stats `
  -Headers @{Authorization="Bearer YOUR_TOKEN"}
```

---

## ✅ Health Check Checklist

Run this checklist if something isn't working:

- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 5173 or 5174
- [ ] Database file exists: `backend/database.sqlite`
- [ ] Can login successfully
- [ ] Dashboard stats endpoint returns data
- [ ] CORS headers present in responses
- [ ] No errors in backend console
- [ ] No errors in browser console

---

**Last Updated:** August 5, 2026  
**For support:** Check documentation files or backend console logs
