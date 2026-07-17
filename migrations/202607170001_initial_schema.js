/**
 * Creates account, session, token, and game tables for the first local release.
 *
 * @param {import("knex").Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("email", 320).notNullable().unique();
    table.string("display_name", 30).notNullable().unique();
    table.text("password_hash").notNullable();
    table.timestamp("email_verified_at").nullable();
    table.timestamp("deletion_requested_at").nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("sessions", (table) => {
    table.string("sid", 128).primary();
    table.text("data").notNullable();
    table.timestamp("expires_at").notNullable().index();
  });

  await knex.schema.createTable("email_tokens", (table) => {
    table.increments("id").primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("type", 24).notNullable();
    table.string("token_hash", 64).notNullable().unique();
    table.timestamp("expires_at").notNullable();
    table.timestamp("used_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("games", (table) => {
    table.string("id", 36).primary();
    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE")
      .index();
    table.string("status", 16).notNullable().defaultTo("active");
    table.string("difficulty", 12).notNullable();
    table.string("human_player", 12).notNullable();
    table.integer("clock_seconds").nullable();
    table.text("state_json").notNullable();
    table.text("moves_json").notNullable().defaultTo("[]");
    table.string("result", 16).nullable();
    table.string("result_reason", 32).nullable();
    table.integer("duration_seconds").nullable();
    table.timestamp("completed_at").nullable();
    table.timestamps(true, true);
  });
}

/**
 * Removes the first-release schema in dependency order.
 *
 * @param {import("knex").Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("games");
  await knex.schema.dropTableIfExists("email_tokens");
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("users");
}
