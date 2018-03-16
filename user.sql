DROP DATABASE IF EXISTS narwhal;

CREATE TABLE "user" (
    id serial  NOT NULL,
    username varchar(20)  NOT NULL,
    password varchar(20)  NOT NULL,
    email_address varchar(320)  NOT NULL,
    avatar varchar(100)  NOT NULL,
    create_date timestamp  NOT NULL DEFAULT now(),
    CONSTRAINT user_ak_email_address UNIQUE (email_address) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT user_ak_username UNIQUE (username) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT user_pk PRIMARY KEY (id)
);
