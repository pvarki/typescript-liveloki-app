-- Provision PostGIS during database initialization so the application does not
-- need CREATE EXTENSION privileges when running migrations.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
