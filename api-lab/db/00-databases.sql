-- One Postgres instance, one database per module. Each service connects only
-- to its own database; Adminer can browse them all. Add a line here when you
-- add a module, and mount its schema in docker-compose.yml.
CREATE DATABASE ecommerce;
CREATE DATABASE bank;
CREATE DATABASE catalog;
CREATE DATABASE registration;
CREATE DATABASE healthcare;
CREATE DATABASE trading;
CREATE DATABASE hotel;
CREATE DATABASE delivery;
CREATE DATABASE exam;
CREATE DATABASE insurance;
CREATE DATABASE auth;
CREATE DATABASE mobile;
