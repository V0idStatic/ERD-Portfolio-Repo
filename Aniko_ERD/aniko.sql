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
 region_id INT,
 province_id INT,
 city_id INT,
 CONSTRAINT fk_lcr_region_id FOREIGN KEY (region_id) REFERENCES lib_crop_regions(reg_id),
 CONSTRAINT fk_lcp_province_id FOREIGN KEY (province_id) REFERENCES lib_crop_provinces(province_id),
 CONSTRAINT fk_lcc_city_id FOREIGN KEY (city_id) REFERENCES lib_crop_city(city_id)
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
 category_id INT,
 image_url TEXT,
 CONSTRAINT fk_lcc_category_id FOREIGN KEY (category_id) REFERENCES lib_crop_category(id)
);

CREATE TABLE lib_crop_details
(
 id SERIAL PRIMARY KEY,
 crop_id INT,
 location_id INT,
 CONSTRAINT fk_lcn_crop_id FOREIGN KEY (crop_id) REFERENCES lib_crop_name(id),
 CONSTRAINT fk_lcl_location_id FOREIGN KEY (location_id) REFERENCES lib_crop_location(location_id)
);

CREATE TABLE lib_crop_parameter
(
 id SERIAL PRIMARY KEY,
 crop_detail_id INT,
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
 soil_depth_max NUMERIC,
 CONSTRAINT fk_lcd_crop_detail_id FOREIGN KEY (crop_detail_id) REFERENCES lib_crop_details(id)
);

CREATE TABLE users
(
 id SERIAL PRIMARY KEY,
 auth_id INT,
 username VARCHAR(100),
 email TEXT,
 display_name VARCHAR(100),
 avatar_url TEXT,
 created_at TIMESTAMP,
 updated_at TIMESTAMP,
 CONSTRAINT fk_auth_auth_id FOREIGN KEY (auth_id) REFERENCES auth_id(auth_id)
);

CREATE TABLE plant_recommendations
(
 id SERIAL PRIMARY KEY,
 user_id INT,
 crop_details INT,
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
 optimal_conditions JSONB,
 CONSTRAINT fk_users_user_id FOREIGN KEY (user_id) REFERENCES users(id),
 CONSTRAINT fk_lcd_crop_details FOREIGN KEY (crop_details) REFERENCES lib_crop_details(id)
);

CREATE TABLE esp32_readings
(
 id SERIAL PRIMARY KEY,
 user_id INT,
 measured_at TIMESTAMPTZ,
 temp_c NUMERIC,
 moisture_pct NUMERIC,
 ec_us_cm NUMERIC,
 ph_level NUMERIC,
 nitrogen_ppm NUMERIC,
 phosphorus_ppm NUMERIC,
 potassium_ppm NUMERIC,
 humidity_pct NUMERIC,
 created_at TIMESTAMPTZ,
 CONSTRAINT fk_users_user_id_esp32 FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE crop_sensor_comparisons
(
 id SERIAL PRIMARY KEY,
 user_id INT,
 crop_name TEXT,
 esp32_reading_id INT,
 recommendation_id INT,
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
 created_at TIMESTAMPTZ,
 CONSTRAINT fk_users_user_id_csc FOREIGN KEY (user_id) REFERENCES users(id),
 CONSTRAINT fk_esp32_reading_id FOREIGN KEY (esp32_reading_id) REFERENCES esp32_readings(id),
 CONSTRAINT fk_pr_recommendation_id FOREIGN KEY (recommendation_id) REFERENCES plant_recommendations(id)
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





