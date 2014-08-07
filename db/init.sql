drop database if exists `message_bus`;
create database `message_bus`;
use `message_bus`;

drop table if exists tasks;
create table if not exists tasks (
  id bigint(20) not null primary key auto_increment,
  name varchar(255) not null,
  args text not null,
  status varchar(255) not null
);

