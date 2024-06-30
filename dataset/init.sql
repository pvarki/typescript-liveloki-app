CREATE TABLE events (
    id UUID PRIMARY KEY,
    header TEXT NOT NULL,
    link TEXT,
    source TEXT,
    admiralty_reliability TEXT,
    admiralty_accuracy TEXT,
    keywords TEXT[],
    event_time TEXT,
    creation_time timestamp with time zone default now()
);