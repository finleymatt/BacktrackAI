# Supabase Setup Guide for Backtrack

This guide walks you through setting up Supabase for cloud sync and optional semantic search in the Backtrack app.

## Overview

Backtrack uses a local-first architecture with optional cloud sync via Supabase. The setup includes:

- **Tables**: `users`, `items`, `folders`, `tags`, `item_folders`, `item_tags`
- **Row Level Security (RLS)**: Each user can only access their own data
- **Optional pgvector**: For semantic search using embeddings
- **Environment Variables**: Secure configuration via `.env` files

## Prerequisites

- Supabase account (free tier available)
- Expo development environment
- Node.js and npm installed

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `backtrack-app`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be ready (2-3 minutes)

## Step 2: Configure Environment Variables

### Option A: Using .env file (Recommended for development)

1. Create a `.env` file in your project root (`Backtrack/.env`):

```bash
EXPO_PUBLIC_SUPABASE_URL=your_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Get these values from your Supabase dashboard:
   - Go to **Settings** → **API**
   - Copy the **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - Copy the **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Option B: Using app.json (Alternative)

Add to your `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "your_project_url_here",
      "supabaseAnonKey": "your_anon_key_here"
    }
  }
}
```

## Step 3: Set Up Database Schema

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/schema.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the schema

This will create:
- All necessary tables with proper relationships
- Row Level Security policies
- Indexes for performance
- Helper functions for timestamp updates

**Note**: The schema is designed to work without pgvector initially. If you want semantic search capabilities, follow Step 6 below.

## Step 4: Enable Authentication (Optional)

If you want to add user authentication:

1. Go to **Authentication** → **Settings**
2. Configure your preferred auth providers
3. For email/password auth (recommended for mobile):
   - Enable **Email** provider
   - Configure email templates if desired
4. Set up **Site URL** for redirects (can use `exp://localhost:19000` for development)

## Step 5: Test the Setup

1. Start your Expo development server:
   ```bash
   npm start
   ```

2. The app should now be able to connect to Supabase
3. Check the console for any connection errors

## Step 6: Enable Semantic Search (Optional)

To enable semantic search with embeddings:

1. Go to **Database** → **Extensions**
2. Find **pgvector** and click **Enable**
3. Wait for the extension to be enabled (may take a few minutes)
4. Go to **SQL Editor** and create a new query
5. Copy the contents of `supabase/enable-pgvector.sql`
6. Paste and run the script

This will:
- Convert the `items_embedding` column to vector type
- Create the vector index for fast similarity search
- Add the `search_items_by_embedding()` function

### If pgvector Still Not Available

Sometimes pgvector takes time to become available or may not be available on all Supabase instances. If you continue to get errors:

1. **Check Extension Status**:
   ```sql
   -- Run check-pgvector.sql to see what's available
   ```

2. **Try Alternative Approach**:
   ```sql
   -- Run enable-pgvector-alternative.sql
   ```

3. **Use JSON Fallback** (Recommended):
   ```sql
   -- Run disable-pgvector.sql for JSON-based embeddings
   -- This works without pgvector and is more flexible
   ```

The JSON approach stores embeddings as JSONB arrays and provides basic search functionality without requiring the pgvector extension.

### Embedding Integration Example

```typescript
// Generate embedding using OpenAI API
const embedding = await generateEmbedding(item.title + ' ' + item.description);

// Store with item
await supabase
  .from('items')
  .insert({
    ...item,
    items_embedding: embedding
  });

// Search by similarity
const { data } = await supabase.rpc('search_items_by_embedding', {
  query_embedding: searchEmbedding,
  user_uuid: userId,
  match_threshold: 0.5,
  match_count: 10
});
```

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- All operations are scoped to the authenticated user
- Junction tables respect user ownership through related items

### API Keys

- **Anon Key**: Safe to expose in client apps (has RLS protection)
- **Service Role Key**: Never expose in client apps (bypasses RLS)
- **JWT Secret**: Keep server-side only

### Best Practices

1. Always use the anon key in client applications
2. Test RLS policies thoroughly
3. Monitor API usage in the Supabase dashboard
4. Set up proper CORS policies if needed

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check environment variables are correct
   - Verify project URL and API key
   - Ensure project is not paused

2. **RLS Policy Errors**
   - Check that user is authenticated
   - Verify policies are correctly applied
   - Test with different user accounts

3. **Schema Errors**
   - Ensure all SQL ran successfully
   - Check for any missing extensions
   - Verify foreign key relationships

4. **pgvector Issues**
   - Confirm extension is enabled in Database → Extensions
   - Wait 5-10 minutes after enabling the extension
   - Run `check-pgvector.sql` to diagnose the issue
   - Try `enable-pgvector-alternative.sql` if the main script fails
   - If pgvector is still not available, use `disable-pgvector.sql` for JSON-based embeddings
   - Check vector dimensions match (1536 for OpenAI)
   - Verify embedding format

### Debug Mode

Enable debug logging in development:

```typescript
const supabase = createClient(url, key, {
  auth: {
    debug: __DEV__, // Enable in development
  },
});
```

## Production Deployment

### Environment Variables

For production builds:
1. Use EAS Build secrets for sensitive values
2. Configure environment variables in your CI/CD pipeline
3. Never commit `.env` files to version control

### Database Optimization

1. Monitor query performance in the dashboard
2. Add additional indexes based on usage patterns
3. Consider connection pooling for high-traffic apps
4. Set up database backups and monitoring

### Security Hardening

1. Review and test all RLS policies
2. Set up proper CORS policies
3. Configure rate limiting if needed
4. Monitor for suspicious activity

## Next Steps

1. **Implement Sync Logic**: Create functions to sync local data with Supabase
2. **Add Offline Support**: Handle network failures gracefully
3. **User Authentication**: Implement sign-up/sign-in flows
4. **Semantic Search**: Integrate with embedding services
5. **Real-time Updates**: Use Supabase real-time subscriptions

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
