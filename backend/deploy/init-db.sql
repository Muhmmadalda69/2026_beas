-- Creates one database per microservice. Runs once, on first initialisation of
-- an empty Postgres data directory (executed by the entrypoint as POSTGRES_USER,
-- so the connecting user 'galuh' owns each database). gen_random_uuid() used by
-- the schemas is built into PostgreSQL 13+, so no extension is required here.
CREATE DATABASE galuh_auth;
CREATE DATABASE galuh_wiki;
CREATE DATABASE galuh_quiz;
