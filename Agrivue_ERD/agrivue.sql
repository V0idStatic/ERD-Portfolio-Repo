CREATE TABLE user_auth
(
 auth_id SERIAL PRIMARY KEY
);

CREATE TABLE role
(
 role_id SERIAL PRIMARY KEY,
 role_name VARCHAR(100)
);

CREATE TABLE user_role
(
 user_role_id SERIAL PRIMARY KEY,
 user_id INT,
 role_id INT,
 username VARCHAR(100),
 image_url TEXT,

 CONSTRAINT us_user_id FOREIGN KEY(user_id) REFERENCES user_auth(auth_id),
 CONSTRAINT us_role_id FOREIGN KEY(role_id) REFERENCES role(role_id)
);

CREATE TABLE regions
(
 reg_id SERIAL PRIMARY KEY,
 reg_desc VARCHAR(100),
 geometry DOUBLE PRECISION,
 centroid DOUBLE PRECISION,
 m_2 DOUBLE PRECISION
);

CREATE TABLE provinces
(
 province_id SERIAL PRIMARY KEY,
 province_desc VARCHAR(100),
 geometry GEOMETRY,
 centroid GEOMETRY,
 m_2 DOUBLE PRECISION
);

CREATE TABLE cities
(
 city_id SERIAL PRIMARY KEY,
 city_desc VARCHAR(100),
 geometry GEOMETRY,
 centroid GEOMETRY,
 m_2 DOUBLE PRECISION
);

CREATE TABLE location
(
 location_id SERIAL PRIMARY KEY,
 region_id INT,
 province_id INT,
 city_id INT,
 geometry GEOMETRY,
 centroid GEOMETRY,
 m_2 DOUBLE PRECISION,
 
 CONSTRAINT lcr_region_id FOREIGN KEY (region_id) REFERENCES regions(reg_id),
 CONSTRAINT lcp_province_id FOREIGN KEY (province_id) REFERENCES provinces(province_id),
 CONSTRAINT lcc_city_id FOREIGN KEY (city_id) REFERENCES cities(city_id)
);

CREATE TABLE crop_category
(
 crop_category_id SERIAL PRIMARY KEY,
 categories VARCHAR(100)
);

CREATE TABLE crop_name
(
 crop_name_id SERIAL PRIMARY KEY,
 name varchar(50),
 category_id INT,
 image_url TEXT,
 CONSTRAINT lcc_category_id FOREIGN KEY (category_id) REFERENCES crop_category(crop_category_id)
);

CREATE TABLE crop_details
(
 id SERIAL PRIMARY KEY,
 crop_name_id INT,
 crop_indicator_value_id INT,
 crop_growth_id INT,
 crop_spacing_id INT,
 CONSTRAINT cd_crop_spacing FOREIGN KEY (crop_spacing_id) REFERENCES crop_spacing_models(crop_spacing_id),
 CONSTRAINT cd_crop_growth_id FOREIGN KEY (crop_growth_id) REFERENCES crop_growth_profiles(crop_growth_profile_id),
 CONSTRAINT cd_crop_indicator_value_id FOREIGN KEY (crop_indicator_value_id) REFERENCES indicator_value(indicator_value_id),
 CONSTRAINT cd_crop_id FOREIGN KEY (crop_name_id) REFERENCES crop_name(crop_name_id)
);

CREATE TABLE indicator_types
(
 indicator_types_id SERIAL PRIMARY KEY,
 heat_index DOUBLE PRECISION,
 rain_fall DOUBLE PRECISION,
 wind_speed DOUBLE PRECISION,
 humidity DOUBLE PRECISION
);

CREATE TABLE indicator_value
(
 indicator_value_id SERIAL PRIMARY KEY,
 indicator_types_id INT,
 value DOUBLE PRECISION,
 season VARCHAR(50),
 recorded_at TIMESTAMP,
 CONSTRAINT iv_indicator_types_id FOREIGN KEY (indicator_types_id) REFERENCES indicator_types(indicator_types_id)
);

CREATE TABLE crop_growth_profiles
(
 crop_growth_profile_id SERIAL PRIMARY KEY,
 min_rainfall DOUBLE PRECISION NULL,
 max_rainfall DOUBLE PRECISION NULL,
 soil_type VARCHAR(100) NULL,
 growth_days DOUBLE PRECISION
);

CREATE TABLE crop_spacing_models
(
 crop_spacing_id SERIAL PRIMARY KEY,
 spacing_cm DOUBLE PRECISION,
 density_per_hectare DOUBLE PRECISION
);


CREATE TABLE crop_parameter
(
 id SERIAL PRIMARY KEY,
 crop_detail_id INT,
 temperature_min DOUBLE PRECISION NULL,
 temperature_max DOUBLE PRECISION NULL,
 ph_level_min DOUBLE PRECISION NULL,
 ph_level_max DOUBLE PRECISION NULL,
 moisture_min DOUBLE PRECISION NULL,
 moisture_max DOUBLE PRECISION NULL,
 nitrogen_min DOUBLE PRECISION NULL,
 nitrogen_max DOUBLE PRECISION NULL,
 potassium_min DOUBLE PRECISION NULL,
 potassium_max DOUBLE PRECISION NULL,
 phosphorus_min DOUBLE PRECISION NULL,
 phosphorus_max DOUBLE PRECISION NULL,
 soil_depth_min DOUBLE PRECISION NULL,
 soil_depth_max DOUBLE PRECISION NULL,
 CONSTRAINT tcp_crop_detail_id FOREIGN KEY (crop_detail_id) REFERENCES crop_details(id)
);

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE INDEX idx_plots_geometry
ON plots
USING GIST (geometry);



CREATE TABLE plots
(
 plot_id SERIAL PRIMARY KEY,
 user_id INT,
 geometry GEOMETRY,
 area_m2 DOUBLE PRECISION,
 centroid GEOMETRY,
 created_at TIMESTAMP,
 CONSTRAINT p_user_id FOREIGN KEY(user_id) REFERENCES user_role(user_id)
);

CREATE TABLE plot_versions
(
 plot_versions SERIAL PRIMARY KEY,
 plot_id INT NOT NULL,
 geometry_snapshot GEOMETRY(Polygon, 4326) NOT NULL,
 created_at TIMESTAMP ,
 CONSTRAINT pv_plot_id FOREIGN KEY (plot_id) REFERENCES plots(plot_id)
);

CREATE TABLE plot_environmental_summary
(
 plot_environmental_id SERIAL PRIMARY KEY,
 plot_id INT NOT NULL,
 avg_heat_index DOUBLE PRECISION,
 avg_rainfall DOUBLE PRECISION,
 avg_wind DOUBLE PRECISION,
 avg_slope DOUBLE PRECISION,
 dominant_soil DOUBLE PRECISION,
 computed_at TIMESTAMP,
 CONSTRAINT pes_plot_id FOREIGN KEY (plot_id) REFERENCES plots(plot_id)
);

CREATE TABLE plot_land_cover_analysis
(
 plot_analysis_id SERIAL PRIMARY KEY,
 plot_id INT,
 road_percent DOUBLE PRECISION,
 residential_percent DOUBLE PRECISION,
 tree_cover_percent DOUBLE PRECISION,
 plantable_percent DOUBLE PRECISION,
 restricted_area_percent DOUBLE PRECISION,
 infrastructure_percent DOUBLE PRECISION,
 water_percent DOUBLE PRECISION,

 CONSTRAINT plca_plot_id FOREIGN KEY (plot_id) REFERENCES plots(plot_id)

);

CREATE TABLE suitability_evaluations
(
 suitability_id SERIAL PRIMARY KEY,
 plot_id INT,
 crop_id INT,
 suitability_score DOUBLE PRECISION,
 limiting_factor DOUBLE PRECISION,
 created_at TIMESTAMP,

 CONSTRAINT se_plot_id FOREIGN KEY(plot_id) REFERENCES plots(plot_id),
 CONSTRAINT se_crop_id FOREIGN KEY(crop_id) REFERENCES crop_details(id)
);

CREATE TABLE yield_predictions
(
 yield_prediction_id SERIAL PRIMARY KEY,
 plot_id INT,
 crop_id INT,
 predicted_yield DOUBLE PRECISION,
 confidence_score DOUBLE PRECISION,
 created_at TIMESTAMP,

 CONSTRAINT yp_plot_id FOREIGN KEY(plot_id) REFERENCES plots(plot_id),
 CONSTRAINT yp_crop_id FOREIGN KEY(crop_id) REFERENCES crop_details(id)
);