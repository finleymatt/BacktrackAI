-- Check if pgvector extension is available and enabled
-- Run this first to diagnose the issue

-- Check available extensions
SELECT name, default_version, installed_version, comment 
FROM pg_available_extensions 
WHERE name = 'vector';

-- Check installed extensions
SELECT extname, extversion, extrelocatable 
FROM pg_extension 
WHERE extname = 'vector';

-- Check if vector type is available
SELECT typname, typlen, typbyval 
FROM pg_type 
WHERE typname = 'vector';
