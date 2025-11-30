# How to Update Care Plan Patient IDs

## Problem
The care plan seed script has placeholder patient IDs that don't match your actual MySQL database. This causes care plans to not show up on patient detail pages.

## Solution
Update the patient IDs in `seed-care-plans.js` with real patient IDs from your MySQL database.

## Step 1: Get Real Patient IDs from MySQL

Run this SQL query in your MySQL database:

```sql
SELECT id, first_name, last_name, room 
FROM patients 
WHERE active = 1 
ORDER BY room 
LIMIT 5;
```

**Example output:**
```
+--------------------------------------+------------+-----------+------+
| id                                   | first_name | last_name | room |
+--------------------------------------+------------+-----------+------+
| 0efaf57b-2331-4887-aef6-1730643a18c2 | Matti      | Virtanen  | 101  |
| a1b2c3d4-e5f6-7890-abcd-ef1234567890 | Aino       | Korhonen  | 102  |
| b2c3d4e5-f6a7-8901-bcde-f12345678901 | Eino       | Mäkinen   | 103  |
+--------------------------------------+------------+-----------+------+
```

## Step 2: Update seed-care-plans.js

Open `visits-service/scripts/seed-care-plans.js` and replace the placeholder IDs:

### Find these lines:
```javascript
{
  patientId: 'UPDATE_WITH_REAL_UUID_1', // Matti Virtanen
  patientName: 'Matti Virtanen',
```

### Replace with actual UUID:
```javascript
{
  patientId: '0efaf57b-2331-4887-aef6-1730643a18c2', // Matti Virtanen
  patientName: 'Matti Virtanen',
```

### Do the same for all three care plans:
1. **Care Plan 1** - Matti Virtanen (Mobility & Blood Pressure)
2. **Care Plan 2** - Aino Korhonen (Cognitive Function & Nutrition)  
3. **Care Plan 3** - Eino Mäkinen (Diabetes Management)

## Step 3: Run the Seed Script

```bash
cd visits-service
node scripts/seed-care-plans.js
```

## Step 4: Verify

### Check MongoDB:
```bash
# If you have mongosh installed:
mongosh nursing_home_visits --eval "db.care_plans.find({}, {patientId: 1, patientName: 1}).pretty()"
```

### Check via API:
```bash
curl http://localhost:3008/api/care-plans
```

### Test in Browser:
Navigate to a patient detail page using one of the patient IDs you used:
```
http://localhost:3000/patients/0efaf57b-2331-4887-aef6-1730643a18c2
```

You should now see the care plans section populated!

## Quick PowerShell Script to Get Patient IDs

Save this as `get-patient-ids.ps1` in the visits-service folder:

```powershell
# Connect to MySQL and get patient IDs
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$query = "SELECT id, first_name, last_name, room FROM patients WHERE active = 1 ORDER BY room LIMIT 5;"

& $mysqlPath -u root -p -D nursing_home_db -e $query
```

Run it:
```powershell
.\get-patient-ids.ps1
```

## Alternative: Use MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database
3. Run the query:
   ```sql
   SELECT id, first_name, last_name, room 
   FROM patients 
   WHERE active = 1 
   ORDER BY room 
   LIMIT 5;
   ```
4. Copy the UUIDs from the results
5. Paste them into `seed-care-plans.js`

## Troubleshooting

### Issue: "No care plans found"
- Check that you updated all three patient IDs
- Verify the patient IDs exist in MySQL
- Check that the seed script ran successfully

### Issue: "Patient not found"
- The patient ID in the URL doesn't match any patient in MySQL
- Check the patient list page to get valid patient IDs

### Issue: MongoDB connection error
- Make sure MongoDB is running: `mongod --version`
- Check the MONGODB_URI in `.env` file
- Default: `mongodb://localhost:27017/nursing_home_visits`

---
**Created:** November 29, 2025
**Purpose:** Guide to update care plan patient IDs with real database values
