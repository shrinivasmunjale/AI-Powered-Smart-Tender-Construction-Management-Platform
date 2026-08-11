# TenderBridge API Reference

**Base URL:** `http://localhost:5000/api`  
**Authentication:** JWT Bearer Token

---

## 🔐 Authentication

### POST `/auth/login`
Login user and get JWT token.

**Body:**
```json
{
  "email": "admin@tenderbridge.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "admin@tenderbridge.com",
    "role": "admin",
    "contractorId": null,
    "verificationStatus": null,
    "companyName": null
  }
}
```

### POST `/auth/register`
Register new contractor.

**Body:**
```json
{
  "email": "newcontractor@example.com",
  "password": "password123",
  "role": "contractor",
  "companyName": "Example Construction Ltd",
  "registrationNumber": "REG-12345",
  "technicalCapacity": "Civil engineering, road construction"
}
```

### GET `/auth/profile`
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

---

## 📊 Dashboard

### GET `/dashboard/stats`
Get comprehensive system statistics.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "tenders": { "total": 5, "active": 3, "draft": 1, ... },
  "contractors": { "total": 3, "verified": 2, ... },
  "projects": { "total": 0, "ongoing": 0, ... },
  "finance": { "totalBudget": "0.00", ... },
  "payments": { "total": 0, "pending": 0, ... },
  "materials": { "total": 0, "lowStockAlerts": 0, ... },
  "inspections": { "total": 0, "passed": 0, ... },
  "recentActivities": [...],
  "upcomingDeadlines": [...],
  "monthlyTenders": [...],
  "categoryDistribution": [...]
}
```

### GET `/dashboard/my-dashboard`
Get role-specific dashboard data.

**Headers:** `Authorization: Bearer <token>`

---

## 📝 Tenders

### GET `/tenders`
List all tenders with filters.

**Query Parameters:**
- `category` - Filter by category
- `search` - Search in title

**Headers:** `Authorization: Bearer <token>`

### GET `/tenders/:id`
Get tender details including bids.

### POST `/tenders`
Create new tender (Admin only).

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body (FormData):**
```
title: Highway Expansion Project
description: Detailed description...
category: Infrastructure
estimatedBudget: 5000000
deadline: 2026-12-31T23:59:59
status: published
document: [file]
```

### PUT `/tenders/:id`
Update tender (Admin only).

### POST `/tenders/:id/award`
Award tender to a bid (Admin only).

**Body:**
```json
{
  "bidId": 123
}
```

---

## 🏗️ Projects

### GET `/projects`
List all projects with filters.

**Query Parameters:**
- `status` - Filter by status (planning, foundation, construction, finishing, inspection, completed)
- `department` - Filter by department
- `contractorId` - Filter by contractor

**Headers:** `Authorization: Bearer <token>`

### GET `/projects/:id`
Get project details.

### POST `/projects`
Create new project (Admin/Engineer/PM).

**Body:**
```json
{
  "name": "City Highway Expansion",
  "department": "Public Works",
  "startDate": "2026-09-01",
  "endDate": "2027-06-30",
  "budget": 10000000,
  "contractorId": 1,
  "tenderId": 1,
  "location": "Downtown",
  "latitude": 43.5089,
  "longitude": 16.4363,
  "description": "30km highway expansion",
  "assignedEngineers": [1, 2, 3]
}
```

### PUT `/projects/:id`
Update project.

**Body:** Same as POST (all fields optional)

### GET `/projects/stats/overview`
Get project statistics (Admin/Engineer/PM).

**Response:**
```json
{
  "totalProjects": 5,
  "ongoingProjects": 2,
  "completedProjects": 3,
  "delayedProjects": 1,
  "totalBudget": 50000000,
  "totalActualCost": 45000000,
  "budgetUtilization": "90.00"
}
```

---

## 💰 Payments

### GET `/payments`
List all payments with filters.

**Query Parameters:**
- `status` - requested, engineer_approved, finance_approved, released, rejected
- `contractorId` - Filter by contractor
- `projectId` - Filter by project

### GET `/payments/:id`
Get payment details.

### POST `/payments/request`
Request payment (Contractor only).

**Body:**
```json
{
  "projectId": 1,
  "amount": 2000000,
  "paymentType": "milestone",
  "description": "Phase 1 completed"
}
```

### PUT `/payments/:id/engineer-approve`
Engineer approves payment.

**Body:**
```json
{
  "verificationNotes": "Work verified, quality is good"
}
```

### PUT `/payments/:id/finance-approve`
Finance releases payment.

**Headers:** `Content-Type: multipart/form-data`

**Body (FormData):**
```
invoiceNumber: INV-2026-001
invoice: [file]
```

### PUT `/payments/:id/reject`
Reject payment.

**Body:**
```json
{
  "verificationNotes": "Work not meeting standards"
}
```

### GET `/payments/stats/overview`
Get payment statistics (Admin/Finance).

---

## 📦 Materials

### GET `/materials`
List all materials.

**Query Parameters:**
- `category` - Filter by category
- `warehouse` - Filter by warehouse
- `lowStock=true` - Show only low stock items

### GET `/materials/:id`
Get material details.

### POST `/materials`
Add new material (Admin/Engineer/PM).

**Body:**
```json
{
  "name": "Portland Cement",
  "category": "Cement",
  "unit": "bags",
  "currentStock": 500,
  "minimumStock": 100,
  "unitPrice": 450,
  "warehouse": "Central Warehouse A",
  "description": "50kg bags, Grade 43"
}
```

### PUT `/materials/:id`
Update material.

### POST `/materials/:id/consume`
Consume material (Engineer/PM).

**Body:**
```json
{
  "quantity": 50,
  "projectId": 1,
  "notes": "Used for foundation work"
}
```

### POST `/materials/:id/restock`
Restock material (Admin/Engineer/PM).

**Body:**
```json
{
  "quantity": 200,
  "notes": "New shipment received"
}
```

### GET `/materials/stats/overview`
Get material statistics.

### DELETE `/materials/:id`
Delete material (Admin only).

---

## 🔍 Inspections

### GET `/inspections`
List all inspections.

**Query Parameters:**
- `projectId` - Filter by project
- `status` - passed, failed, needs_review
- `inspectorName` - Filter by inspector

### GET `/inspections/:id`
Get inspection details.

### POST `/inspections`
Create new inspection (Engineer/PM).

**Headers:** `Content-Type: multipart/form-data`

**Body (FormData):**
```
projectId: 1
inspectorName: John Engineer
notes: Foundation work quality excellent
defects: [] (JSON array)
safetyViolations: [] (JSON array)
weather: Sunny, 25°C
latitude: 43.5089
longitude: 16.4363
status: passed
media: [file1.jpg, file2.jpg]
```

### PUT `/inspections/:id`
Update inspection.

### POST `/inspections/:id/media`
Add media to inspection.

**Headers:** `Content-Type: multipart/form-data`

**Body:**
```
media: [file1.jpg, file2.jpg, video1.mp4]
```

### GET `/inspections/stats/overview`
Get inspection statistics.

### POST `/inspections/:id/generate-report`
Generate inspection report (coming soon).

---

## 👷 Contractors

### GET `/contractors`
List all contractors.

### GET `/contractors/:id`
Get contractor details.

### PUT `/contractors/:id/verify`
Verify contractor (Admin only).

**Body:**
```json
{
  "status": "verified"
}
```

---

## 📋 Bids

### GET `/bids`
List all bids.

### GET `/bids/:id`
Get bid details.

### POST `/bids`
Submit bid (Contractor only).

**Headers:** `Content-Type: multipart/form-data`

**Body (FormData):**
```
tenderId: 1
price: 2500000
duration: 120
technicalProposal: Detailed proposal...
document: [file]
```

### GET `/bids/tender/:tenderId/compare`
Compare bids for a tender (Admin only).

---

## 🔔 Notifications

### GET `/notifications`
Get user's notifications.

### PUT `/notifications/:id/read`
Mark notification as read.

---

## 🎨 Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized (no token or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 🔑 Role Permissions

| Endpoint | super_admin | admin | engineer | contractor | finance_officer | project_manager |
|----------|------------|-------|----------|------------|----------------|-----------------|
| `/tenders` GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/tenders` POST | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/projects` GET | ✅ | ✅ | ✅ | ✅* | ✅ | ✅ |
| `/projects` POST | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `/payments/request` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/payments/:id/engineer-approve` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `/payments/:id/finance-approve` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `/materials` POST | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `/inspections` POST | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

*Contractors can only see their own projects/payments

---

## 🧪 Example cURL Commands

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tenderbridge.com","password":"admin123"}'
```

### Get Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Project
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Highway Project",
    "department": "Public Works",
    "startDate": "2026-09-01",
    "endDate": "2027-06-30",
    "budget": 5000000,
    "contractorId": 1
  }'
```

---

## 📞 Support

For API issues or questions, check:
1. IMPLEMENTATION_STATUS.md - Overall progress
2. PHASE1_COMPLETION_SUMMARY.md - Detailed feature list
3. Backend console logs for error details

---

**Last Updated:** August 5, 2026  
**API Version:** 1.0.0  
**Backend Status:** ✅ Fully Operational
