use rocket::Route;

pub mod event_routes;
// pub mod rm_routes;

pub fn routes() -> Vec<Route> {
    let mut routes = vec![];
    routes.extend(event_routes::routes());
    // routes.extend(rm_routes::routes());
    routes
}