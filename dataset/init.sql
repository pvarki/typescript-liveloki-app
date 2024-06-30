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

COPY events (id,header,link,source,admiralty_reliability,admiralty_accuracy,keywords,event_time) FROM '/tmp/preseed.csv' delimiter ',' csv header;