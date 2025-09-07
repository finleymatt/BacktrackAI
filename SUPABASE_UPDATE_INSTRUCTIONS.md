# Supabase Update Instructions

## What You Need to Do

You need to update your Supabase database schema to support the new URL ingestion feature. Here's what to do:

### Option 1: Run the Migration (Recommended)

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migration-add-platform.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration

This will:
- Add the `platform` column to the `items` table
- Update the `source` constraint to include `'url'`
- Create indexes for better performance

### Option 2: If Migration Fails (Alternative)

If you get constraint errors, try the simpler fix:

1. Go to **SQL Editor**
2. Copy the contents of `supabase/fix-constraint-simple.sql`
3. Paste and run it

This script will:
- Show you what constraints currently exist
- Drop all source-related constraints
- Add the new constraint with `'url'` included

### Option 3: Update the Schema File (For New Deployments)

If you're setting up a new Supabase project, the updated `supabase/schema.sql` file already includes the platform column and updated constraints.

## What This Enables

After running the migration, your Supabase database will support:
- ✅ URL items with platform detection (YouTube, Spotify, Instagram, generic)
- ✅ Proper source constraint validation
- ✅ Optimized queries with platform-based filtering
- ✅ Cloud sync for URL items

## Verification

After running the migration, you can verify it worked by running this query in the SQL Editor:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'items' 
ORDER BY ordinal_position;
```

You should see the `platform` column listed.

## Next Steps

Once the Supabase schema is updated:
1. Restart your app
2. Try adding a URL in the AddScreen
3. The URL should save successfully and sync to Supabase
4. You can view the item in your Supabase dashboard under the `items` table

## Troubleshooting

If you get any errors:
- Make sure you're running the migration as a user with sufficient permissions
- Check that the `items` table exists
- Verify the migration ran completely (all statements should show "Success")
