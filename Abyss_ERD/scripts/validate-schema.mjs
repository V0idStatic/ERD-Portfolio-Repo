// Run after installing @electric-sql/pglite in tmp/schema-tools (see VALIDATION.md).
// Executes the actual DDL in an isolated in-memory PostgreSQL WASM instance.
import { PGlite } from '../tmp/schema-tools/node_modules/@electric-sql/pglite/dist/index.js';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
const sql = await readFile(new URL('../abyss.sql', import.meta.url), 'utf8');
let checks = 0;
const pass = (name) => { checks++; console.log(`PASS ${name}`); };
async function reject(name, statement, params, expectedCode) {
  try { await db.query(statement, params); }
  catch (error) { assert.equal(error.code, expectedCode, `${name}: ${error.message}`); pass(name); return; }
  assert.fail(`${name}: invalid data was accepted`);
}
async function one(statement, params = []) { return (await db.query(statement, params)).rows[0]; }

try {
  await db.exec(sql);
  pass('complete schema executes');
  const tables = (await db.query(`SELECT n.nspname AS schema, c.relname AS name,
    obj_description(c.oid) AS comment FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind='r'`)).rows;
  assert.equal(tables.length, (sql.match(/^CREATE TABLE /gm) || []).length);
  assert(tables.every(t => /^\d+\./.test(t.comment || '')));
  pass(`all ${tables.length} tables have numbered metadata comments`);

  const a = (await one(`INSERT INTO users(username,email,password_hash) VALUES ('Alpha','a@example.test','test-hash') RETURNING id`)).id;
  const b = (await one(`INSERT INTO users(username,email,password_hash) VALUES ('Beta','b@example.test','test-hash') RETURNING id`)).id;
  await reject('case-insensitive username uniqueness', `INSERT INTO users(username,email,password_hash) VALUES ('ALPHA','c@example.test','x')`, [], '23505');
  await reject('case-insensitive email uniqueness', `INSERT INTO users(username,email,password_hash) VALUES ('Gamma','A@EXAMPLE.TEST','x')`, [], '23505');
  await db.exec(`INSERT INTO regions VALUES ('PH','Philippines','Asia/Manila');
    INSERT INTO squad_levels VALUES ('amateur','Amateur',false);`);
  const game = (await one(`INSERT INTO games(code,name,publisher) VALUES ('test-game','Test Game','Test Publisher') RETURNING id`)).id;
  const mode = (await one(`INSERT INTO game_modes(game_id,code,name,team_size) VALUES ($1,'standard','Standard 5v5',5) RETURNING id`, [game])).id;
  const sa = (await one(`INSERT INTO squads(owner_user_id,game_id,game_mode_id,name,slug,region_code,level_code)
    VALUES ($1,$2,$3,'A','a','PH','amateur') RETURNING id`, [a,game,mode])).id;
  const sb = (await one(`INSERT INTO squads(owner_user_id,game_id,game_mode_id,name,slug,region_code,level_code)
    VALUES ($1,$2,$3,'B','b','PH','amateur') RETURNING id`, [b,game,mode])).id;
  const coachA = (await one(`INSERT INTO squad_coaches(squad_id,user_id,is_primary) VALUES ($1,$2,true) RETURNING id`, [sa,a])).id;
  const coachB = (await one(`INSERT INTO squad_coaches(squad_id,user_id,is_primary) VALUES ($1,$2,true) RETURNING id`, [sb,b])).id;
  const playerProfile = (await one(`INSERT INTO player_profiles(created_by,public_name) VALUES ($1,'Player P') RETURNING id`, [a])).id;
  const playerGameProfile = (await one(`INSERT INTO player_game_profiles(player_profile_id,game_id,in_game_name,external_account_id,external_region_id)
    VALUES ($1,$2,'P','123','456') RETURNING id`, [playerProfile,game])).id;
  const membershipA = (await one(`INSERT INTO squad_memberships(squad_id,player_game_profile_id,game_id,added_by_coach_id,roster_role)
    VALUES ($1,$2,$3,$4,'captain') RETURNING id`, [sa,playerGameProfile,game,coachA])).id;
  await reject('player cannot join two active squads', `INSERT INTO squad_memberships(squad_id,player_game_profile_id,game_id,added_by_coach_id,roster_role)
    VALUES ($1,$2,$3,$4,'starter')`, [sb,playerGameProfile,game,coachB], '23505');
  await db.query(`UPDATE squad_memberships SET left_at=now() WHERE id=$1`, [membershipA]);
  const membershipB = (await one(`INSERT INTO squad_memberships(squad_id,player_game_profile_id,game_id,added_by_coach_id,roster_role)
    VALUES ($1,$2,$3,$4,'starter') RETURNING id`, [sb,playerGameProfile,game,coachB])).id;
  assert.equal((await one(`SELECT count(*)::int AS n FROM player_game_profiles WHERE id=$1`, [playerGameProfile])).n, 1);
  pass('roster transfer preserves player identity and old membership');

  const inviteSql = `INSERT INTO scrim_invites(game_id,sender_squad_id,recipient_squad_id,created_by,created_by_coach_id,proposed_start,proposed_end,game_count,expires_at)
    VALUES ($1,$2,$3,$4,$5,now()+interval '2 days',now()+interval '2 days 2 hours',$6,now()+interval '1 day') RETURNING id`;
  await reject('self invite rejected', inviteSql, [game,sa,sa,a,coachA,3], '23514');
  await reject('even best-of rejected', inviteSql, [game,sa,sb,a,coachA,2], '23514');
  const invite = (await one(inviteSql, [game,sa,sb,a,coachA,3])).id;
  // Reuse the exact instant from the saved row to test reverse-pair uniqueness.
  await reject('reciprocal duplicate pending invite rejected', `INSERT INTO scrim_invites
    (game_id,sender_squad_id,recipient_squad_id,created_by,created_by_coach_id,proposed_start,proposed_end,game_count,expires_at)
    SELECT game_id,recipient_squad_id,sender_squad_id,$2,$3,proposed_start,proposed_end,game_count,expires_at
    FROM scrim_invites WHERE id=$1`, [invite,b,coachB], '23505');
  const scrimSql = `INSERT INTO scrims(game_id,invite_id,home_squad_id,away_squad_id,scheduled_start,scheduled_end,series_format,game_count)
    SELECT game_id,id,sender_squad_id,recipient_squad_id,proposed_start,proposed_end,series_format,game_count
    FROM scrim_invites WHERE id=$1 RETURNING id`;
  await db.query(`UPDATE scrim_invites SET status='accepted',responded_by=$2,responded_at=now() WHERE id=$1`, [invite,b]);
  const scrim = (await one(scrimSql, [invite])).id;
  await reject('one scrim per invite', scrimSql, [invite], '23505');
  await reject('negative schedule duration rejected', `UPDATE scrims SET scheduled_end=scheduled_start-interval '1 hour' WHERE id=$1`, [scrim], '23514');
  const statDefinition = (await one(`INSERT INTO stat_definitions(game_id,code,display_name,value_type,aggregation)
    VALUES ($1,'kills','Kills','integer','sum') RETURNING id`, [game])).id;
  const participant = (await one(`INSERT INTO match_participants(scrim_id,game_id,squad_membership_id,squad_id,player_game_profile_id,in_game_name_snapshot,role_snapshot)
    VALUES ($1,$2,$3,$4,$5,'P','starter') RETURNING id`, [scrim,game,membershipB,sb,playerGameProfile])).id;
  await db.query(`INSERT INTO participant_stat_values(match_participant_id,stat_definition_id,game_id,numeric_value)
    VALUES ($1,$2,$3,12)`, [participant,statDefinition,game]);
  await db.query(`UPDATE squad_memberships SET left_at=now() WHERE id=$1`, [membershipB]);
  assert.equal((await one(`SELECT numeric_value FROM participant_stat_values WHERE match_participant_id=$1`, [participant])).numeric_value, '12.000000');
  pass('match statistics survive a player leaving the squad');
  const submission = (await one(`INSERT INTO result_submissions(scrim_id,submitted_by_squad_id,submitted_by,home_wins,away_wins)
    VALUES ($1,$2,$3,2,1) RETURNING id`, [scrim,sa,a])).id;
  await reject('score/outcome inconsistency rejected', `INSERT INTO scrim_results(scrim_id,accepted_submission_id,home_wins,away_wins,outcome,finalized_by)
    VALUES ($1,$2,2,1,'away_win',$3)`, [scrim,submission,b], '23514');
  const invite2 = (await one(inviteSql,[game,sa,sb,a,coachA,3])).id;
  await reject('scrim squads must match invitation orientation', `INSERT INTO scrims
    (game_id,invite_id,home_squad_id,away_squad_id,scheduled_start,scheduled_end,series_format,game_count)
    SELECT game_id,id,recipient_squad_id,sender_squad_id,proposed_start,proposed_end,series_format,game_count
    FROM scrim_invites WHERE id=$1`, [invite2], '23503');
  const scrim2 = (await one(scrimSql,[invite2])).id;
  await reject('canonical result cannot use another scrim submission', `INSERT INTO scrim_results(scrim_id,accepted_submission_id,home_wins,away_wins,outcome,finalized_by)
    VALUES ($1,$2,2,1,'home_win',$3)`, [scrim2,submission,b], '23503');
  await db.query(`INSERT INTO scrim_results(scrim_id,accepted_submission_id,home_wins,away_wins,outcome,finalized_by)
    VALUES ($1,$2,2,1,'home_win',$3)`,[scrim,submission,b]);
  pass('valid series result persists');
  const claim = (await one(`INSERT INTO player_profile_claims(player_profile_id,claimant_user_id) VALUES ($1,$2) RETURNING id`, [playerProfile,b])).id;
  await db.query(`UPDATE player_profile_claims SET status='approved',reviewed_by=$2,reviewed_at=now() WHERE id=$1`, [claim,a]);
  await db.query(`UPDATE player_profiles SET linked_user_id=$2,ownership_status='claimed',claimed_at=now() WHERE id=$1`, [playerProfile,b]);
  await db.query(`INSERT INTO player_team_preferences(player_game_profile_id,is_looking_for_squad,preferred_region_code,desired_squad_level_code,introduction)
    VALUES ($1,true,'PH','amateur','Available for tryouts')`, [playerGameProfile]);
  const freeAgent = await one(`SELECT player_name, game_name, preferred_region FROM vw_free_agents WHERE player_game_profile_id=$1`, [playerGameProfile]);
  assert.deepEqual(freeAgent, { player_name: 'P', game_name: 'Test Game', preferred_region: 'Philippines' });
  pass('coach-created profile can be claimed and shown as an independent player');
  const otherGame = (await one(`INSERT INTO games(code,name) VALUES ('other-game','Other Game') RETURNING id`)).id;
  await reject('cross-game squad membership rejected', `INSERT INTO squad_memberships(squad_id,player_game_profile_id,game_id,added_by_coach_id,roster_role)
    VALUES ($1,$2,$3,$4,'starter')`, [sa,playerGameProfile,otherGame,coachA], '23503');
  const profile = await one(`SELECT squad_name, game_name, game_mode, region_name, primary_coach_name, player_count, players
    FROM vw_squad_profile WHERE squad_id=$1`, [sa]);
  assert.equal(profile.squad_name, 'A');
  assert.equal(profile.game_name, 'Test Game');
  assert.equal(profile.game_mode, 'Standard 5v5');
  assert.equal(profile.region_name, 'Philippines');
  assert.equal(profile.primary_coach_name, 'Alpha');
  assert.equal(profile.player_count, 0); // Player was transferred to squad B above.
  const schedule = await one(`SELECT opponent_name, score_display, result_label
    FROM vw_squad_schedule WHERE squad_id=$1 AND scrim_id=$2`, [sa, scrim]);
  assert.deepEqual(schedule, { opponent_name: 'B', score_display: '2-1', result_label: 'Win' });
  const season = (await one(`INSERT INTO rating_seasons(game_id,game_mode_id,name,starts_at,ends_at,algorithm_version)
    VALUES ($1,$2,'Test season',now()-interval '1 day',now()+interval '1 day','test-v1') RETURNING id`, [game,mode])).id;
  await db.query(`INSERT INTO squad_ratings(season_id,squad_id,game_id,rating) VALUES ($1,$2,$3,1500)`, [season,sa,game]);
  await db.exec('REFRESH MATERIALIZED VIEW mv_squad_statistics');
  await db.exec('REFRESH MATERIALIZED VIEW mv_leaderboard');
  const statistics = await one(`SELECT squad_name, wins, losses, win_rate_percent
    FROM mv_squad_statistics WHERE squad_id=$1`, [sa]);
  assert.deepEqual(statistics, { squad_name: 'A', wins: 1, losses: 0, win_rate_percent: '100.00' });
  const leaderboard = await one(`SELECT squad_name, rating, leaderboard_rank
    FROM mv_leaderboard WHERE season_id=$1 AND squad_id=$2`, [season, sa]);
  assert.deepEqual(leaderboard, { squad_name: 'A', rating: '1500.0000', leaderboard_rank: 1 });
  pass('display views and materialized views denormalize IDs into names and calculations');
  await reject('sanction requires exactly one target', `INSERT INTO sanctions(squad_id,user_id,action,reason,issued_by) VALUES ($1,$2,'warning','test',$2)`, [sa,a], '23514');
  await reject('internal note cannot be public', `INSERT INTO content_items(kind,title,audience,created_by,updated_by) VALUES ('admin_note','secret','public',$1,$1)`,[a],'23514');
  const [first,second] = [sa,sb].sort();
  await reject('conversation pair canonical ordering', `INSERT INTO conversations(first_squad_id,second_squad_id) VALUES ($1,$2)`,[second,first],'23514');
  const conv = (await one(`INSERT INTO conversations(first_squad_id,second_squad_id) VALUES ($1,$2) RETURNING id`,[first,second])).id;
  const msgSql=`INSERT INTO messages(conversation_id,sequence,sender_user_id,sender_squad_id,sender_coach_id,body) VALUES ($1,1,$2,$3,$4,'hello')`;
  await db.query(msgSql,[conv,a,sa,coachA]);
  await reject('message sequence uniqueness',msgSql,[conv,a,sa,coachA],'23505');
  await reject('coach cannot send for another squad', `INSERT INTO messages(conversation_id,sequence,sender_user_id,sender_squad_id,sender_coach_id,body)
    VALUES ($1,2,$2,$3,$4,'invalid coach')`, [conv,a,sa,coachB], '23503');
  const visibleMessage = await one(`SELECT sender_coach_name, sender_squad_name, recipient_squad_name, body FROM vw_messages WHERE conversation_id=$1`, [conv]);
  assert.deepEqual(visibleMessage, { sender_coach_name: 'Alpha', sender_squad_name: 'A', recipient_squad_name: 'B', body: 'hello' });
  pass('coach identity, roster authority and coach-to-coach message display are preserved');

  const event = (await one(`INSERT INTO event_outbox(aggregate_type,aggregate_id,aggregate_version,event_type,correlation_id,payload)
    VALUES ('squad',$1,1,'SquadCreated',gen_random_uuid(),'{}') RETURNING event_id`,[sa])).event_id;
  await reject('event version/index uniqueness',`INSERT INTO event_outbox(aggregate_type,aggregate_id,aggregate_version,event_type,correlation_id,payload)
    VALUES ('squad',$1,1,'SquadCreated',gen_random_uuid(),'{}')`,[sa],'23505');
  await db.query(`INSERT INTO event_receipts(projection_name,event_id) VALUES ('directory',$1)`,[event]);
  await reject('projection deduplicates event',`INSERT INTO event_receipts(projection_name,event_id) VALUES ('directory',$1)`,[event],'23505');
  await db.query(`INSERT INTO event_receipts(projection_name,projection_generation,event_id) VALUES ('directory',2,$1)`,[event]);
  pass('new projection generation can replay event');
  const receipt=`INSERT INTO request_receipts(actor_user_id,idempotency_key,request_type,request_hash,response,expires_at)
    VALUES ($1,'same-request','AcceptInvite',repeat('a',64),'{}',now()+interval '1 day')`;
  await db.query(receipt,[a]);
  await reject('command receipt uniqueness',receipt,[a],'23505');
  const before = await one(`SELECT count(*)::int AS n FROM event_outbox`);
  await db.exec('BEGIN');
  await db.query(`UPDATE squads SET bio='rolled back' WHERE id=$1`,[sa]);
  await db.query(`INSERT INTO event_outbox(aggregate_type,aggregate_id,aggregate_version,event_type,correlation_id,payload)
    VALUES ('squad',$1,2,'SquadUpdated',gen_random_uuid(),'{}')`,[sa]);
  await db.exec('ROLLBACK');
  assert.equal((await one(`SELECT bio FROM squads WHERE id=$1`,[sa])).bio,null);
  assert.equal((await one(`SELECT count(*)::int AS n FROM event_outbox`)).n,before.n);
  pass('business state and outbox roll back together');
  console.log(`Validated ${tables.length} tables; ${checks} checks passed. Handler concurrency and production load are not tested.`);
} finally { await db.close(); }
