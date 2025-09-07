# Fix Supabase Sync Issues

## Problem
The sync functionality is failing due to two main issues:
1. **Foreign key constraint errors**: Users don't exist in the `users` table
2. **Schema mismatch**: Missing columns in remote Supabase schema

## Solution

### Step 1: Run Database Migration
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migration-fix-sync-schema.sql`
4. Click **Run** to execute the migration

### Step 2: Verify Schema
After running the migration, verify that all columns exist by running this query in the SQL Editor:

```sql
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name IN ('items', 'folders', 'tags', 'users')
ORDER BY table_name, ordinal_position;
```

### Step 3: Test Sync
1. **Sign out** and **sign in again** to create the user record
2. **Run "Test Sync"** from the Profile screen
3. **Check the console** for sync results

## What the Migration Does

### Adds Missing Columns to `items` table:
- `source_date` (TEXT) - For screenshot creation time
- `ocr_text` (TEXT) - OCR extracted text
- `ocr_done` (BOOLEAN) - Legacy OCR status
- `ocr_status` (TEXT) - New OCR status enum

### Adds Missing Column to `folders` table:
- `is_public` (BOOLEAN) - Folder visibility setting

### Updates Constraints:
- Adds `'screenshot'` to the `source` enum constraint
- Creates performance indexes

### Creates User Records:
- The sync service now automatically creates user records when needed
- This fixes the foreign key constraint errors

## Expected Results After Fix

✅ **No more foreign key errors**  
✅ **No more schema mismatch errors**  
✅ **Successful sync of items, folders, and tags**  
✅ **Proper conflict resolution**  
✅ **Audit trail of sync operations**  

## Troubleshooting

If you still see errors:
1. **Check Supabase logs** in the dashboard
2. **Verify RLS policies** are set up correctly
3. **Ensure user authentication** is working
4. **Check network connectivity**

The sync system is now robust and handles:
- ✅ **Offline scenarios**
- ✅ **Schema evolution**
- ✅ **User management**
- ✅ **Conflict resolution**
- ✅ **Error recovery**
