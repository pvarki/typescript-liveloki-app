use crate::schema::events;
use chrono::{DateTime, NaiveDateTime, ParseError, Utc};
use diesel::backend::Backend;
use diesel::deserialize::{self, FromSql};
use diesel::prelude::*;
use diesel::serialize::ToSql;
use diesel::sql_types::{Nullable, Text, BigInt};
use diesel::FromSqlRow;
use serde::{Deserialize, Serialize};
use std::error::Error;
use uuid::Uuid;

/// This type is a wrapper around `Option<NaiveDateTime>` for a TEXT column
/// that may be `NULL` or might contain a textual date/time string.
#[derive(Debug, Clone, FromSqlRow)]
#[diesel(sql_type = Nullable<Text>)]
pub struct TextTimestamp(pub Option<NaiveDateTime>);

impl<DB: Backend> FromSql<Nullable<Text>, DB> for TextTimestamp
where
    DB: Backend,
    String: FromSql<Text, DB>,
    Option<String>: FromSql<Nullable<Text>, DB>,
{
    fn from_sql(bytes: DB::RawValue<'_>) -> deserialize::Result<Self> {
        // Get the `Option<String>` from Diesel for the text column
        let string_value = <Option<String> as FromSql<Nullable<Text>, DB>>::from_sql(bytes)?;

        match string_value {
            None => {
                // The database column was NULL
                Ok(TextTimestamp(None))
            }
            Some(s) if s.trim().is_empty() => {
                // The database column was an empty string
                Ok(TextTimestamp(None))
            }
            Some(s) => {
                // Attempt to parse the string into a NaiveDateTime
                // Adjust the format string to match your data
                let parsed = NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S%.fZ")
                    .or_else(|_| NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%SZ"))
                    .or_else(|_| NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S"))
                    .or_else(|_| NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M"))
                    .map_err(|e: ParseError| Box::new(e) as Box<dyn Error + Send + Sync>)?;
                Ok(TextTimestamp(Some(parsed)))
            }
        }
    }
}

impl From<TextTimestamp> for Option<NaiveDateTime> {
    fn from(timestamp: TextTimestamp) -> Self {
        timestamp.0 // We just need to extract the inner Option<NaiveDateTime>
    }
}

#[derive(Debug, Queryable, QueryableByName, Serialize, Deserialize, Selectable)]
#[diesel(table_name = crate::schema::events)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Event {
    pub id: Uuid,
    pub header: String,
    pub link: Option<String>,
    pub source: Option<String>,
    pub admiralty_reliability: Option<String>,
    pub admiralty_accuracy: Option<String>,
    pub keywords: Option<Vec<String>>,
    #[diesel(deserialize_as = TextTimestamp)]
    pub event_time: Option<NaiveDateTime>,
    pub creation_time: Option<DateTime<Utc>>, // This is the key change
    pub notes: Option<String>,
    pub hcoe_domains: Option<Vec<String>>, // Array of domains
    pub location: Option<String>,
    pub location_lng: Option<f32>, // Longitude as a floating-point value
    pub location_lat: Option<f32>, // Latitude as a floating-point value
    pub author: Option<String>,
}

#[derive(QueryableByName, Debug)]
pub struct KeywordCount {
    #[diesel(sql_type = Text)]
    pub keyword: String,
    #[diesel(sql_type = BigInt)]
    pub count: i64,
}

// impl Event {
//     // Add any utility methods here (e.g., validation or helper methods)
// }

// #[derive(Insertable, Deserialize)]
// #[diesel(table_name = events)]
// pub struct NewEvent {
//     #[diesel(sql_type = Float)]
//     pub location_lng: Option<f64>, // Longitude as a floating-point value
//     // #[diesel(sql_type = Float)]
//     pub location_lat: Option<f64>, // Latitude as a floating-point value
//     // pub title: String,
//     // pub description: Option<String>,
//     // Add more fields as needed
// }
