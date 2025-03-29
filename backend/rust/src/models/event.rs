use serde::{Deserialize, Serialize};
use diesel::prelude::*;
use chrono::NaiveDateTime;
use crate::schema::events;

#[derive(Queryable  , Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub header: String,
    pub link: Option<String>,
    pub source: Option<String>,
    pub admiralty_reliability: Option<String>,
    pub admiralty_accuracy: Option<String>,
    pub keywords: Option<Vec<String>>, // Array of keywords
    pub event_time: Option<NaiveDateTime>,
    pub notes: Option<String>,
    pub hcoe_domains: Option<Vec<String>>, // Array of domains
    pub location: Option<String>,
    #[diesel(sql_type = Float)]
    pub location_lng: Option<f64>, // Longitude as a floating-point value
    #[diesel(sql_type = Float)]
    pub location_lat: Option<f64>, // Latitude as a floating-point value
    pub author: Option<String>,
    pub creation_time: Option<NaiveDateTime>, // Assuming this is in the database schema
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
