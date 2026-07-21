-- One Postgres instance, one database per module. Each service connects only
-- to its own database; Adminer can browse them all. Add a line here when you
-- add a module, and mount its schema in docker-compose.yml.
CREATE DATABASE ecommerce;
CREATE DATABASE bank;
CREATE DATABASE catalog;
CREATE DATABASE registration;
