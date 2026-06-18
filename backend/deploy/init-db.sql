-- Each microservice owns its own logical database. The Postgres entrypoint runs
-- this once on first boot, connected to the default database.
CREATE DATABASE galuh_auth;
CREATE DATABASE galuh_wiki;
CREATE DATABASE galuh_quiz;
