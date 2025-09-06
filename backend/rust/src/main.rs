#[macro_use]
extern crate rocket;
// #[macro_use]
extern crate diesel;

mod routes;
mod controllers;
mod models;
mod schema;
mod db;

use rocket::fs::{FileServer, relative};
use dotenv::dotenv;
use db::establish_connection_pool;

#[launch]
fn rocket() -> _ {
    dotenv().ok();
    // env_logger::init();

    // Set up database connection pool
    let pool = establish_connection_pool();

    rocket::build()
        .manage(pool)
        .mount("/", routes::routes())
        .mount("/uploads", FileServer::from(relative!("uploads")))
}