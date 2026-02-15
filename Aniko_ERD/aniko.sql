CREATE TABLE auth_id
(
 auth_id SERIAL PRIMARY KEY
);

CREATE TABLE lib_crop_regions
(
 reg_id SERIAL PRIMARY KEY,
 reg_desc VARCHAR(100)
);

CREATE TABLE lib_crop_provinces
(
 province_id SERIAL PRIMARY KEY,
 province_desc VARCHAR(100)
);

CREATE TABLE lib_crop_city
(
 city_id SERIAL PRIMARY KEY,
 city_desc VARCHAR(100),
 lat INT,
 lon INT
);

CREATE TABLE lib_crop_location
(
 location_id SERIAL PRIMARY KEY,
 region_id INT REFERENCES lib_crop_regions(reg_id),
 province_id INT REFERENCES lib_crop_provinces(province_id),
 city_id INT REFERENCES lib_crop_city(city_id)
);

CREATE TABLE lib_crop_category
(
 id SERIAL PRIMARY KEY,
 categories VARCHAR(100)
);

CREATE TABLE lib_crop_name
(
 id SERIAL PRIMARY KEY,
 name varchar(50),
 category_id INT REFERENCES lib_crop_category(id),
 image_url TEXT
);

CREATE TABLE lib_crop_details
(
 id SERIAL PRIMARY KEY,
 crop_id INT REFERENCES lib_crop_name(id),
 location_id INT REFERENCES lib_crop_location(location_id)
);

CREATE TABLE lib_crop_parameter
(
 id SERIAL PRIMARY KEY,
 crop_detail_id INT REFERENCES lib_crop_details(id),
 temperature_min NUMERIC,
 temperature_max NUMERIC,
 ph_level_min NUMERIC,
 ph_level_max NUMERIC,
 moisture_min NUMERIC,
 moisture_max NUMERIC,
 nitrogen_min NUMERIC,
 nitrogen_max NUMERIC,
 potassium_min NUMERIC,
 potassium_max NUMERIC,
 phosphorus_min NUMERIC,
 phosphorus_max NUMERIC,
 soil_depth_min NUMERIC,
 soil_depth_max NUMERIC
);

CREATE TABLE users
(
 id SERIAL PRIMARY KEY,
 auth_id INT REFERENCES auth_id(auth_id),
 username VARCHAR(100),
 email TEXT,
 display_name VARCHAR(100),
 avatar_url TEXT,
 created_at TIMESTAMP,
 updated_at TIMESTAMP
);

CREATE TABLE plant_recommendations
(
 id SERIAL PRIMARY KEY,
 user_id INT REFERENCES users(id),
 crop_details INT REFERENCES lib_crop_details(id),
 current_status VARCHAR(50),
 best_months INT,
 generated_at TIMESTAMP,
 generated_date DATE,
 valid_until TIMESTAMP,
 analyzed_weather_performance TEXT,
 avg_temp_analyzed DOUBLE PRECISION,
 avg_humidity_analyzed DOUBLE PRECISION,
 avg_rainfall_analyzed DOUBLE PRECISION,
 risk_factors JSONB,
 recommendations JSONB,
 alternative_dates JSONB,
 predicted_weather JSONB,
 optimal_conditions JSONB
);

CREATE TABLE esp32_readings
(
 id SERIAL PRIMARY KEY,
 user_id INT REFERENCES users(id),
 measured_at TIMESTAMPTZ,
 temp_c NUMERIC,
 moisture_pct NUMERIC,
 ec_us_cm NUMERIC,
 ph_level NUMERIC,
 nitrogen_ppm NUMERIC,
 phosphorus_ppm NUMERIC,
 potassium_ppm NUMERIC,
 humidity_pct NUMERIC,
 created_at TIMESTAMPTZ
);

CREATE TABLE crop_sensor_comparisons
(
 id SERIAL PRIMARY KEY,
 user_id INT REFERENCES users(id),
 crop_name TEXT,
 esp32_reading_id INT REFERENCES esp32_readings(id),
 recommendation_id INT REFERENCES plant_recommendations(id),
 current_temperature NUMERIC,
 current_moisture NUMERIC,
 current_ph NUMERIC,
 current_nitrogen NUMERIC,
 current_phosphorus NUMERIC,
 current_potassium NUMERIC,
 optimal_temp_min NUMERIC,
 optimal_temp_max NUMERIC,
 optimal_moisture_min NUMERIC,
 optimal_moisture_max NUMERIC,
 optimal_ph_min NUMERIC,
 optimal_ph_max NUMERIC,
 optimal_nitrogen_min NUMERIC,
 optimal_nitrogen_max NUMERIC,
 optimal_phosphorus_min NUMERIC,
 optimal_phosphorus_max NUMERIC,
 optimal_potassium_min NUMERIC,
 optimal_potassium_max NUMERIC,
 overall_status TEXT,
 created_at TIMESTAMPTZ
);

CREATE TABLE weather_historical
(
 id SERIAL PRIMARY KEY,
 location_id INT,
 date DATE,
 temperature_avg NUMERIC,
 humidity_avg NUMERIC,
 rainfall_mm NUMERIC,
 weather_description TEXT,
 year INT,
 month INT,
 data_source TEXT,
 created_at TIMESTAMPTZ
);

CREATE TABLE weather_current
(
 id SERIAL PRIMARY KEY,
 location_id INT,
 date DATE,
 temperature_avg NUMERIC,
 humidity_avg NUMERIC,
 rainfall_mm NUMERIC,
 weather_description TEXT,
 data_source TEXT,
 created_at TIMESTAMPTZ,
 year INT,
 month INT
);

CREATE TABLE weather_api_logs
(
 id SERIAL PRIMARY KEY,
 location_id INT,
 api_endpoint TEXT,
 request_params TEXT,
 date_range_start DATE,
 date_range_end DATE,
 response_status TEXT,
 fetched_at TIMESTAMPTZ
);

CREATE TABLE esp32_readings_backup
(
 id SERIAL PRIMARY KEY,
 user_id INT,
 measured_at TIMESTAMPTZ,
 temp_c NUMERIC,
 ec_us_cm NUMERIC,
 nitrogen_ppm NUMERIC,
 phosphorus_ppm NUMERIC,
 potassium_ppm NUMERIC,
 ph_level NUMERIC,
 humidity_pct NUMERIC,
 created_at TIMESTAMPTZ
);





