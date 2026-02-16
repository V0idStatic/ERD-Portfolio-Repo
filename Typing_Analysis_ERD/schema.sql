CREATE TABLE auth_id
(
 
 user_id SERIAL PRIMARY KEY
);

CREATE TABLE user_level
(
 user_level_id SERIAL PRIMARY KEY,
 user_id INT,
 level_id INT,
 CONSTRAINT fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_id(user_id),
 CONSTRAINT fk_lvl_level_id FOREIGN KEY (level_id) REFERENCES level(level_id)
);

CREATE TABLE level
(
 level_id SERIAL PRIMARY KEY,
 level_number INT,
 level_name VARCHAR(100),
 CONSTRAINT fk_ztg_level_number FOREIGN KEY (level_number) REFERENCES zombie_typing_game(level_number)
 );


 CREATE TABLE gamemode
 (
 gamemode_id SERIAL PRIMARY KEY,
 gamemode_name VARCHAR(100),
 uses_level boolean
 );

CREATE TABLE zombie_typing_game
(
 zombie_typing_game_id SERIAL PRIMARY KEY,
 gamemode_id INT,
 level_number int,
 sentence TEXT[],
 difficulty Varchar(50),
 CONSTRAINT fk_gm_gamemode_id FOREIGN KEY (gamemode_id) REFERENCES gamemode(gamemode_id)
);
  
CREATE TABLE only_typing_game
(
 only_typing_game_id SERIAL PRIMARY KEY,
 gamemode_id INT,
 sentence TEXT[],
 difficulty TEXT[],
 CONSTRAINT fk_gm_gamemode_id_otg FOREIGN KEY (gamemode_id) REFERENCES gamemode(gamemode_id)
);

CREATE TABLE session
(
 session_id SERIAL PRIMARY KEY,
 user_id INT,
 gamemode_id INT,
 gamep_id INT,
 common_mistake_id INT,
 keystroke_id INT,
 performance_id INT,
 CONSTRAINT fk_auth_user_id_sess FOREIGN KEY (user_id) REFERENCES auth_id(user_id),
 CONSTRAINT fk_gm_gamemode_id_sess FOREIGN KEY (gamemode_id) REFERENCES gamemode(gamemode_id),
 CONSTRAINT fk_gp_gamep_id FOREIGN KEY (gamep_id) REFERENCES game_performance(gamep_id),
 CONSTRAINT fk_cm_common_mistake_id FOREIGN KEY (common_mistake_id) REFERENCES common_mistake(common_mistake_id),
 CONSTRAINT fk_ks_keystroke_id FOREIGN KEY (keystroke_id) REFERENCES keystroke(keystroke_id),
 CONSTRAINT fk_pm_performance_id FOREIGN KEY (performance_id) REFERENCES performance_metrics(performance_id)
);

CREATE TABLE game_performance
(
    gamep_id SERIAL PRIMARY KEY,
    session_id INT,
    user_id INT,
    final_score INT,
    zombies_defeated INT,
    avg_points DOUBLE PRECISION,
    CONSTRAINT fk_sess_session_id_gp FOREIGN KEY (session_id) REFERENCES session(session_id),
    CONSTRAINT fk_sess_user_id_gp FOREIGN KEY (user_id) REFERENCES session(user_id)
);

CREATE TABLE common_mistake
(
 common_mistake_id SERIAL PRIMARY KEY,
 session_id INT,
 user_id INT,
 correct INT,
 incorrect INT,
 CONSTRAINT fk_sess_session_id_cm FOREIGN KEY (session_id) REFERENCES session(session_id),
 CONSTRAINT fk_sess_user_id_cm FOREIGN KEY (user_id) REFERENCES session(user_id)
);

CREATE TABLE keystroke
(
 keystroke_id SERIAL PRIMARY KEY,
 session_id INT,
 user_id INT,
 total_keystroke INT,
 CONSTRAINT fk_sess_session_id_ks FOREIGN KEY (session_id) REFERENCES session(session_id),
 CONSTRAINT fk_sess_user_id_ks FOREIGN KEY (user_id) REFERENCES session(user_id)
);

CREATE TABLE performance_metrics
(
 performance_id SERIAL PRIMARY KEY,
 session_id INT,
 user_id INT,
 wpm INT,
 cpm INT,
 accuracy DOUBLE PRECISION,
 duration TIMESTAMP,
 CONSTRAINT fk_sess_session_id_pm FOREIGN KEY (session_id) REFERENCES session(session_id),
 CONSTRAINT fk_sess_user_id_pm FOREIGN KEY (user_id) REFERENCES session(user_id)
);

CREATE TABLE leaderboard
(
 leaderboard_id SERIAL PRIMARY KEY,
 user_id INT,
 CONSTRAINT fk_sess_user_id_lb FOREIGN KEY (user_id) REFERENCES session(user_id)
);