// @generated automatically by Diesel CLI.

diesel::table! {
    event_media (id) {
        id -> Uuid,
        event_id -> Uuid,
        url -> Text,
    }
}

diesel::table! {
    events (id) {
        id -> Uuid,
        header -> Text,
        link -> Nullable<Text>,
        source -> Nullable<Text>,
        admiralty_reliability -> Nullable<Text>,
        admiralty_accuracy -> Nullable<Text>,
        keywords -> Nullable<Array<Nullable<Text>>>,
        event_time -> Nullable<Text>,
        creation_time -> Nullable<Timestamptz>,
        notes -> Nullable<Text>,
        hcoe_domains -> Nullable<Array<Nullable<Text>>>,
        location -> Nullable<Text>,
        location_lng -> Nullable<Float4>,
        location_lat -> Nullable<Float4>,
        author -> Nullable<Text>,
    }
}

diesel::table! {
    pgmigrations (id) {
        id -> Int4,
        #[max_length = 255]
        name -> Varchar,
        run_on -> Timestamp,
    }
}

diesel::table! {
    spatial_ref_sys (srid) {
        srid -> Int4,
        #[max_length = 256]
        auth_name -> Nullable<Varchar>,
        auth_srid -> Nullable<Int4>,
        #[max_length = 2048]
        srtext -> Nullable<Varchar>,
        #[max_length = 2048]
        proj4text -> Nullable<Varchar>,
    }
}

diesel::joinable!(event_media -> events (event_id));

diesel::allow_tables_to_appear_in_same_query!(
    event_media,
    events,
    pgmigrations,
    spatial_ref_sys,
);
