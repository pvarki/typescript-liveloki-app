COPY events (
  id,
  header,
  link,
  source,
  admiralty_reliability,
  admiralty_accuracy,
  keywords,
  event_time,
  notes,
  hcoe_domains,
  author,
  location,
  location_lng,
  location_lat,
  creation_time
)
FROM '/tmp/preseed.csv'
DELIMITER ','
CSV HEADER;