-- Database Migration Runner
-- This script runs all migrations in the correct order with transaction safety

\echo 'Starting database migrations...'

-- Begin transaction to ensure all-or-nothing execution
BEGIN;

-- Set error handling to stop on error
\set ON_ERROR_STOP on

-- Create savepoint before starting migrations
SAVEPOINT migration_start;

\echo 'Running migration 01: Creating usuarios table...'
\i 01_create_usuarios_table.sql

\echo 'Migration 01 completed successfully.'

-- Create savepoint after migration 01
SAVEPOINT migration_01_complete;

\echo 'Running migration 02: Updating fichajes table...'
\i 02_update_fichajes_table.sql

\echo 'Migration 02 completed successfully.'

-- Commit all changes
COMMIT;

\echo 'All migrations completed successfully!'
