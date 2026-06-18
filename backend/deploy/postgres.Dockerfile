# Postgres image with the multi-database init script baked in, so no host
# bind-mount is needed (avoids read-only-filesystem / missing-file issues on
# servers). The script runs once, on first initialisation of an empty data dir.
FROM postgres:16-alpine
COPY init-db.sql /docker-entrypoint-initdb.d/init-db.sql
