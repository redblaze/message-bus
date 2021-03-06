drop database if exists `message_bus`;
create database `message_bus`;
use `message_bus`;

drop table if exists tasks;
create table if not exists tasks (
  id bigint(20) not null primary key auto_increment,
  version bigint(20) not null default 0,
  date_created datetime not null,
  last_updated datetime not null,
  name varchar(255) not null,
  args text not null,
  status varchar(255) not null,
  retry_times int(11) not null default 0
);

