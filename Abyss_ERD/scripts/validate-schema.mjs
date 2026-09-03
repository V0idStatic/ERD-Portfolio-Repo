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
  const sa = (await one(`INSERT INTO squads(owner_user_id,name,slug,region_code,level_code) VALUES ($1,'A','a','PH','amateur') RETURNING id`, [a])).id;
  const sb = (await one(`INSERT INTO squads(owner_user_id,name,slug,region_code,level_code) VALUES ($1,'B','b','PH','amateur') RETURNING id`, [b])).id;
  const coachA = (await one(`INSERT INTO squad_coaches(squad_id,user_id,is_primary) VALUES ($1,$2,true) RETURNING id`, [sa,a])).id;
  const coachB = (await one(`INSERT INTO squad_coaches(squad_id,user_id,is_primary) VALUES ($1,$2,true) RETURNING id`, [sb,b])).id;
  const player = (await one(`INSERT INTO players(created_by,in_game_name,mlbb_account_id,mlbb_zone_id) VALUES ($1,'P','123','456') RETURNING id`, [a])).id;
  await db.query(`INSERT INTO squad_roster(squad_id,player_id,added_by_coach_id,roster_role) VALUES ($1,$2,$3,'captain')`, [sa,player,coachA]);
  await reject('player cannot join two active squads', `INSERT INTO squad_roster(squad_id,player_id,added_by_coach_id,roster_role) VALUES ($1,$2,$3,'starter')`, [sb,player,coachB], '23505');
  await db.query(`UPDATE squad_roster SET left_at=now() WHERE player_id=$1`, [player]);
  await db.query(`INSERT INTO squad_roster(squad_id,player_id,added_by_coach_id,roster_role) VALUES ($1,$2,$3,'starter')`, [sb,player,coachB]);
  pass('roster transfer preserves old membership');

  const inviteSql = `INSERT INTO scrim_invites(sender_squad_id,recipient_squad_id,created_by,created_by_coach_id,proposed_start,proposed_end,game_count,expires_at)
    VALUES ($1,$2,$3,$4,now()+interval '2 days',now()+interval '2 days 2 hours',$5,now()+interval '1 day') RETURNING id`;
  await reject('self invite rejected', inviteSql, [sa,sa,a,coachA,3], '23514');
  await reject('even best-of rejected', inviteSql, [sa,sb,a,coachA,2], '23514');
  const invite = (await one(inviteSql, [sa,sb,a,coachA,3])).id;
  // Reuse the exact instant from the saved row to test reverse-pair uniqueness.
  await reject('reciprocal duplicate pending invite rejected', `INSERT INTO scrim_invites
    (sender_squad_id,recipient_squad_id,created_by,created_by_coach_id,proposed_start,proposed_end,game_count,expires_at)
    SELECT recipient_squad_id,sender_squad_id,$2,$3,proposed_start,proposed_end,game_count,expires_at
    FROM scrim_invites WHERE id=$1`, [invite,b,coachB], '23505');
  const scrimSql = `INSERT INTO scrims(invite_id,home_squad_id,away_squad_id,scheduled_start,scheduled_end,series_format,game_count)
    SELECT id,sender_squad_id,recipient_squad_id,proposed_start,proposed_end,series_format,game_count
    FROM scrim_invites WHERE id=$1 RETURNING id`;
  await db.query(`UPDATE scrim_invites SET status='accepted',responded_by=$2,responded_at=now() WHERE id=$1`, [invite,b]);
  const scrim = (await one(scrimSql, [invite])).id;
  await reject('one scrim per invite', scrimSql, [invite], '23505');
  await reject('negative schedule duration rejected', `UPDATE scrims SET scheduled_end=scheduled_start-interval '1 hour' WHERE id=$1`, [scrim], '23514');
  const submission = (await one(`INSERT INTO result_submissions(scrim_id,submitted_by_squad_id,submitted_by,home_wins,away_wins)
    VALUES ($1,$2,$3,2,1) RETURNING id`, [scrim,sa,a])).id;
  await reject('score/outcome inconsistency rejected', `INSERT INTO scrim_results(scrim_id,accepted_submission_id,home_wins,away_wins,outcome,finalized_by)
    VALUES ($1,$2,2,1,'away_win',$3)`, [scrim,submission,b], '23514');
  const invite2 = (await one(inviteSql,[sa,sb,a,coachA,3])).id;
  await reject('scrim squads must match invitation orientation', `INSERT INTO scrims
    (invite_id,home_squad_id,away_squad_id,scheduled_start,scheduled_end,series_format,game_count)
    SELECT id,recipient_squad_id,sender_squad_id,proposed_start,proposed_end,series_format,game_count
    FROM scrim_invites WHERE id=$1`, [invite2], '23503');
  const scrim2 = (await one(scrimSql,[invite2])).id;
  await reject('canonical result cannot use another scrim submission', `INSERT INTO scrim_results(scrim_id,accepted_submission_id,home_wins,away_wins,outcome,finalized_by)
    VALUES ($1,$2,2,1,'home_win',$3)`, [scrim2,submission,b], '23503');
  await db.query(`INSERT INTO scrim_results(scrim_id,accepted_submission_id,home_wins,away_wins,outcome,finalized_by)
    VALUES ($1,$2,2,1,'home_win',$3)`,[scrim,submission,b]);
  pass('valid series result persists');
  const profile = await one(`SELECT squad_name, region_name, primary_coach_name, player_count, players
    FROM vw_squad_profile WHERE squad_id=$1`, [sa]);
  assert.equal(profile.squad_name, 'A');
  assert.equal(profile.region_name, 'Philippines');
  assert.equal(profile.primary_coach_name, 'Alpha');
  assert.equal(profile.player_count, 0); // Player was transferred to squad B above.
  const schedule = await one(`SELECT opponent_name, score_display, result_label
    FROM vw_squad_schedule WHERE squad_id=$1 AND scrim_id=$2`, [sa, scrim]);
  assert.deepEqual(schedule, { opponent_name: 'B', score_display: '2-1', result_label: 'Win' });
  const season = (await one(`INSERT INTO rating_seasons(name,starts_at,ends_at,algorithm_version)
    VALUES ('Test season',now()-interval '1 day',now()+interval '1 day','test-v1') RETURNING id`)).id;
  await db.query(`INSERT INTO squad_ratings(season_id,squad_id,rating) VALUES ($1,$2,1500)`, [season, sa]);
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
