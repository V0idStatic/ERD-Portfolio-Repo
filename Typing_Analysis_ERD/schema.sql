CREATE TABLE auth_id
(
 
 user_id SERIAL PRIMARY KEY
);

CREATE TABLE user_level
(
 user_level_id SERIAL PRIMARY KEY,
 user_id INT REFERENCES auth_id(user_id),
 level_id INT REFERENCES level(level_id)
);

CREATE TABLE level
(
 level_id SERIAL PRIMARY KEY,
 level_number INT REFERENCES zombie_typing_game(level_number),
 level_name VARCHAR(100)
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
 gamemode_id INT REFERENCES gamemode(gamemode_id),
 level_number int,
 sentence TEXT[],
 difficulty Varchar(50)
);
  
CREATE TABLE only_typing_game
(
 only_typing_game_id SERIAL PRIMARY KEY,
 gamemode_id INT REFERENCES gamemode(gamemode_id),
 sentence TEXT[],
 difficulty TEXT[]

);

CREATE TABLE session
(
 session_id SERIAL PRIMARY KEY,
 user_id INT REFERENCES auth_id(user_id),
 gamemode_id INT REFERENCES gamemode(gamemode_id),
 gamep_id INT REFERENCES game_performance(gamep_id),
 common_mistake_id INT REFERENCES common_mistake(common_mistake_id),
 keystroke_id INT REFERENCES keystroke(keystroke_id),
 performance_id INT REFERENCES performance_metrics(performance_id)
);

CREATE TABLE game_performance
(
    gamep_id SERIAL PRIMARY KEY,
    session_id INT REFERENCES session(session_id),
    user_id INT REFERENCES session(user_id),
    final_score INT,
    zombies_defeated INT,
    avg_points DOUBLE PRECISION
);

CREATE TABLE common_mistake
(
 common_mistake_id SERIAL PRIMARY KEY,
 session_id INT REFERENCES session(session_id),
 user_id INT REFERENCES session(user_id),
 correct INT,
 incorrect INT
);

CREATE TABLE keystroke
(
 keystroke_id SERIAL PRIMARY KEY,
 session_id INT REFERENCES session(session_id),
 user_id INT REFERENCES session(user_id),
 total_keystroke INT
);

CREATE TABLE performance_metrics
(
 performance_id SERIAL PRIMARY KEY,
 session_id INT REFERENCES session(session_id),
 user_id INT REFERENCES session(user_id),
 wpm INT,
 cpm INT,
 accuracy DOUBLE PRECISION,
 duration TIMESTAMP
);

CREATE TABLE leaderboard
(
 leaderboard_id SERIAL PRIMARY KEY,
 user_id INT REFERENCES session(user_id)

);