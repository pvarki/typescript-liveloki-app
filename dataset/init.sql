CREATE TABLE events (
    id UUID PRIMARY KEY,
    header TEXT NOT NULL,
    link TEXT,
    source TEXT,
    keywords TEXT[]
);
