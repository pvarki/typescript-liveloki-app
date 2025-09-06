use crate::db::DbPool;
use crate::models::event::*;
use crate::schema::events;
use diesel::prelude::*;
use rocket::State;
use serde_json::{json, Value};
use std::collections::HashMap;
use uuid::Uuid;

pub async fn fetch_events(db: &State<DbPool>) -> Value {
    use crate::schema::events::dsl::*;

    let mut conn = db.get().expect("Failed to get DB connection");

    match events
        .order_by(creation_time.desc())
        .select(Event::as_select())
        .get_results(&mut conn)
    {
        Ok(results) => {
            if results.is_empty() {
                json!([])
            } else {
                json!(results)
            }
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            json!({
                "message": "Failed to fetch events from database"
            })
        }
    }
}

pub async fn add_events(event_data: Value, db: &State<DbPool>) -> Value {
    // Validate that event_data is an array
    if !event_data.is_array() {
        return json!({
            "error": "Invalid input format: expected an array of events"
        });
    }

    let events = event_data.as_array().unwrap();

    let mut conn = db.get().expect("Failed to get DB connection");

    // Start a transaction
    let result = conn.transaction(|conn| {
        for event in events {
            // Extract values from the event JSON
            let header = event
                .get("header")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let link = event
                .get("link")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let source = event
                .get("source")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let admiralty_reliability = event
                .get("admiralty_reliability")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let admiralty_accuracy = event
                .get("admiralty_accuracy")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let notes = event
                .get("notes")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let location = event
                .get("location")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let location_lng = event
                .get("location_lng")
                .and_then(|v| v.as_f64())
                .map(|v| v as f32);
            let location_lat = event
                .get("location_lat")
                .and_then(|v| v.as_f64())
                .map(|v| v as f32);
            let author = event
                .get("author")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let event_time_str = event.get("event_time").and_then(|v| v.as_str());

            // Convert keywords to Vec<String>
            let keywords = match event.get("keywords") {
                Some(k) => {
                    let mut keyword_array: Vec<String> = Vec::new();
                    if let Some(k_str) = k.as_str() {
                        keyword_array = k_str
                            .split(',')
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty())
                            .collect();
                    } else if let Some(k_arr) = k.as_array() {
                        keyword_array = k_arr
                            .iter()
                            .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
                            .filter(|s| !s.is_empty())
                            .collect();
                    }
                    Some(keyword_array)
                }
                None => None,
            };

            // Convert HCOE domains to Vec<String>
            let hcoe_domains = match event.get("hcoe_domains") {
                Some(d) => {
                    if let Some(d_arr) = d.as_array() {
                        Some(
                            d_arr
                                .iter()
                                .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
                                .filter(|s| !s.is_empty())
                                .collect::<Vec<String>>(),
                        )
                    } else {
                        None
                    }
                }
                None => None,
            };

            // Parse event_time if provided and convert to string
            let event_time = match event_time_str {
                Some(time_str) if !time_str.trim().is_empty() => {
                    match chrono::NaiveDateTime::parse_from_str(time_str, "%Y-%m-%dT%H:%M") {
                        Ok(dt) => Some(dt.format("%Y-%m-%dT%H:%M").to_string()), // Convert to string
                        Err(_) => None,
                    }
                }
                _ => None,
            };

            // Generate UUID for the new event
            let id = Uuid::now_v7();

            // Insert the event into the database
            diesel::insert_into(events::table)
                .values((
                    events::id.eq(id),
                    events::header.eq(header),
                    events::link.eq(link),
                    events::source.eq(source),
                    events::admiralty_reliability.eq(admiralty_reliability),
                    events::admiralty_accuracy.eq(admiralty_accuracy),
                    events::keywords.eq(keywords),
                    events::event_time.eq(event_time),
                    events::notes.eq(notes),
                    events::hcoe_domains.eq(hcoe_domains),
                    events::location.eq(location),
                    events::location_lng.eq(location_lng),
                    events::location_lat.eq(location_lat),
                    events::author.eq(author),
                    events::creation_time.eq(chrono::Utc::now()),
                ))
                .execute(conn)?;
        }

        diesel::result::QueryResult::Ok(())
    });

    // Return appropriate response based on transaction result
    match result {
        Ok(_) => json!({
            "message": "Events added successfully"
        }),
        Err(e) => json!({
            "error": format!("{}", e)
        }),
    }
}

pub async fn fetch_trending_events_day(db: &State<DbPool>) -> Value {
    // Implement trending events (day) logic here
    json!({
        "status": "success",
        "events": []
    })
}

pub async fn fetch_trending_events_week(db: &State<DbPool>) -> Value {
    // Implement trending events (week) logic here
    json!({
        "status": "success",
        "events": []
    })
}

pub async fn fetch_event_by_id(id: String, db: &State<DbPool>) -> Value {
    // Implement fetch by ID logic here
    json!({
        "status": "success",
        "event": null
    })
}

pub async fn fetch_keywords(db: &State<DbPool>) -> Value {
    let mut conn = match db.get() {
        Ok(conn) => conn,
        Err(_) => {
            return json!({
                "error": "Failed to get database connection"
            })
        }
    };

    // Use raw SQL to unnest keywords array and count occurrences
    let results = diesel::sql_query(
        r#"
        SELECT UNNEST(keywords) AS keyword, COUNT(*) AS count
        FROM events
        WHERE keywords IS NOT NULL
        GROUP BY keyword
        ORDER BY count DESC
        "#,
    )
        .load::<KeywordCount>(&mut conn);

    match results {
        Ok(keyword_counts) => {
            // Convert to HashMap<String, i32> format like the JavaScript version
            let mut keywords_with_count = HashMap::new();
            for kc in keyword_counts {
                keywords_with_count.insert(kc.keyword, kc.count);
            }
            json!(keywords_with_count)
        }
        Err(e) => {
            eprintln!("Database error fetching keywords: {}", e);
            json!({
                "error": "Failed to fetch keywords from database"
            })
        }
    }
}

pub async fn search_events_by_location(query: Value, db: &State<DbPool>) -> Value {
    // Extract parameters
    let lat = match query.get("lat").and_then(|v| v.as_f64()) {
        Some(val) => val,
        None => {
            return json!({
                "status": "error",
                "message": "Missing or invalid latitude parameter"
            })
        }
    };

    let lng = match query.get("lng").and_then(|v| v.as_f64()) {
        Some(val) => val,
        None => {
            return json!({
                "status": "error",
                "message": "Missing or invalid longitude parameter"
            })
        }
    };

    let radius_km = query.get("radius").and_then(|v| v.as_f64()).unwrap_or(10.0);

    let mut conn = match db.get() {
        Ok(conn) => conn,
        Err(_) => {
            return json!({
                "status": "error",
                "message": "Failed to get database connection"
            })
        }
    };

    // Using PostGIS ST_DWithin for more efficient spatial query
    let results = diesel::sql_query(
        r#"
        SELECT * FROM events
        WHERE
            (location_lat IS NOT NULL) AND
            (location_lng IS NOT NULL) AND
            ST_DWithin(
                ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326),
                ST_SetSRID(ST_MakePoint($2, $1), 4326),
                $3 * 1000  -- Convert km to meters
            )
        ORDER BY
            ST_Distance(
                ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326),
                ST_SetSRID(ST_MakePoint($2, $1), 4326)
            ) ASC,
            creation_time DESC
    "#,
    )
    .bind::<diesel::sql_types::Double, _>(lat)
    .bind::<diesel::sql_types::Double, _>(lng)
    .bind::<diesel::sql_types::Double, _>(radius_km)
    .load::<Event>(&mut conn);

    match results {
        Ok(found_events) => {
            if found_events.is_empty() {
                json!([])
            } else {
                json!(found_events)
            }
        }
        Err(e) => {
            eprintln!("Database error searching by location: {}", e);
            json!({
                "status": "error",
                "message": "Failed to search events by location"
            })
        }
    }
}

pub async fn fetch_metrics(db: &State<DbPool>) -> Value {
    // Implement metrics fetch logic
    json!({
        "status": "success",
        "metrics": {}
    })
}
