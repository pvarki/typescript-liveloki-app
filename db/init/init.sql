CREATE ROLE livelogiuser LOGIN PASSWORD 'r3zqpj2psdp98fuwf';
CREATE DATABASE livelogi;

\c livelogi;

CREATE TABLE events (
    id UUID PRIMARY KEY,
    header TEXT NOT NULL,
    link TEXT,
    source TEXT,
    keywords TEXT[]
);

GRANT ALL PRIVILEGES ON DATABASE livelogi TO livelogiuser;
