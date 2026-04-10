-- Database Migration Runner
-- This script runs all migrations in the correct order

\echo 'Starting database migrations...'

\echo 'Running migration 01: Creating usuarios table...'
\i 01_create_usuarios_table.sql

\echo 'Migration 01 completed successfully.'

\echo 'Running migration 02: Updating fichajes table...'
\i 02_update_fichajes_table.sql

\echo 'Migration 02 completed successfully.'

\echo 'All migrations completed successfully!'
