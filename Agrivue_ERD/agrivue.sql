CREATE TABLE user_auth
(
 auth_id SERIAL PRIMARY KEY
);

CREATE TABLE regions
(
 reg_id SERIAL PRIMARY KEY,
 reg_desc VARCHAR(100)
);

CREATE TABLE provinces
(
 province_id SERIAL PRIMARY KEY,
 province_desc VARCHAR(100)
);

CREATE TABLE cities
(
 city_id SERIAL PRIMARY KEY,
 city_desc VARCHAR(100),
 lat INT,
 lon INT
);

CREATE TABLE location
(
 location_id SERIAL PRIMARY KEY,
 region_id INT,
 province_id INT,
 city_id INT,
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
 location_id INT,
 CONSTRAINT lcn_crop_id FOREIGN KEY (crop_name_id) REFERENCES crop_name(crop_name_id),
 CONSTRAINT lcl_location_id FOREIGN KEY (location_id) REFERENCES location(location_id)
);