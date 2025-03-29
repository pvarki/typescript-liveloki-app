use crate::controllers::event_controller;
use crate::db::DbPool;
use rocket::form::Form;
use rocket::fs::TempFile;
use rocket::http::Status;
use rocket::serde::json::Json;
use rocket::Route;
use rocket::State;
use std::fs;
use std::path::Path;
use uuid::Uuid;

#[derive(FromForm)]
pub struct Upload<'r> {
    #[field(name = "file")]
    file: TempFile<'r>,
}

#[get("/api/events")]
async fn fetch_events(db: &State<DbPool>) -> Json<serde_json::Value> {
    let events = event_controller::fetch_events(db).await;
    Json(events)
}

#[post("/api/events", format = "json", data = "<event_data>")]
async fn add_events(
    event_data: Json<serde_json::Value>,
    db: &State<DbPool>,
) -> Json<serde_json::Value> {
    let result = event_controller::add_events(event_data.into_inner(), db).await;
    Json(result)
}

#[get("/api/events/trending/day")]
async fn fetch_trending_events_day(db: &State<DbPool>) -> Json<serde_json::Value> {
    let events = event_controller::fetch_trending_events_day(db).await;
    Json(events)
}

#[get("/api/events/trending/week")]
async fn fetch_trending_events_week(db: &State<DbPool>) -> Json<serde_json::Value> {
    let events = event_controller::fetch_trending_events_week(db).await;
    Json(events)
}

#[get("/api/event/<id>")]
async fn fetch_event_by_id(id: String, db: &State<DbPool>) -> Json<serde_json::Value> {
    let event = event_controller::fetch_event_by_id(id, db).await;
    Json(event)
}

#[get("/api/keywords")]
async fn fetch_keywords(db: &State<DbPool>) -> Json<serde_json::Value> {
    let keywords = event_controller::fetch_keywords(db).await;
    Json(keywords)
}

#[derive(FromForm)]
pub struct LocationSearch {
    latitude: Option<f64>,
    longitude: Option<f64>,
    radius: Option<f64>,
    // Add other parameters as needed
}

#[get("/api/locationsearch?<query..>")]
async fn search_events_by_location(
    query: LocationSearch,
    db: &State<DbPool>,
) -> Json<serde_json::Value> {
    let query_json = serde_json::json!({
            "latitude": query.latitude,
            "longitude": query.longitude,
            "radius": query.radius,
            // Add other fields as needed
        }
    );
    let events = event_controller::search_events_by_location(query_json, db).await;
    Json(events)
}

#[post("/api/upload", data = "<form>")]
async fn upload_images(mut form: Form<Upload<'_>>) -> Result<Json<serde_json::Value>, Status> {
    // Ensure uploads directory exists
    let upload_dir = "uploads";
    if !Path::new(upload_dir).exists() {
        fs::create_dir_all(upload_dir).map_err(|_| Status::InternalServerError)?;
    }

    let file_uuid = Uuid::now_v7();
    let file_path = format!(
        "{}/{}{}",
        upload_dir,
        file_uuid,
        Path::new(&form.file.name().unwrap_or("unknown"))
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| format!(".{}", ext))
            .unwrap_or_default()
    );

    form.file
        .persist_to(&file_path)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let response = serde_json::json!({
        "status": "success",
        "filename": file_path
    });

    Ok(Json(response))
}

#[get("/api/metrics")]
async fn fetch_metrics(db: &State<DbPool>) -> Json<serde_json::Value> {
    let metrics = event_controller::fetch_metrics(db).await;
    Json(metrics)
}

pub fn routes() -> Vec<Route> {
    routes![
        fetch_events,
        add_events,
        fetch_trending_events_day,
        fetch_trending_events_week,
        fetch_event_by_id,
        fetch_keywords,
        search_events_by_location,
        upload_images,
        fetch_metrics
    ]
}
