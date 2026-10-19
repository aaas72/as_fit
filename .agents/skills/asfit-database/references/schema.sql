-- AS_FIT — Reference DDL (PostgreSQL 16)
-- The Drizzle schema in src/server/db/schema.ts MUST produce an equivalent structure.

-- ───────────── ENUMs ─────────────
CREATE TYPE gender_t           AS ENUM ('male', 'female');
CREATE TYPE meal_type_t        AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE nutrition_basis_t  AS ENUM ('per_100g', 'per_100ml', 'per_unit');
CREATE TYPE milk_type_t        AS ENUM ('none', 'whole', 'semi_skimmed', 'skimmed');
CREATE TYPE insight_severity_t AS ENUM ('info', 'warning', 'critical');

-- ───────────── Profile & Settings ─────────────
CREATE TABLE user_profiles (
  id                       SERIAL PRIMARY KEY,
  display_name             VARCHAR(80)  NOT NULL,
  gender                   gender_t     NOT NULL,
  birth_date               DATE         NOT NULL,
  current_height_cm        NUMERIC(5,1) NOT NULL CHECK (current_height_cm BETWEEN 100 AND 250),
  initial_weight_kg        NUMERIC(5,2) NOT NULL CHECK (initial_weight_kg BETWEEN 30 AND 300),
  target_weight_kg         NUMERIC(5,2) NOT NULL CHECK (target_weight_kg  BETWEEN 30 AND 300),
  -- Non-exercise activity only; logged exercise is added separately (no double counting)
  default_activity_factor  NUMERIC(4,3) NOT NULL DEFAULT 1.200
                           CHECK (default_activity_factor BETWEEN 1.0 AND 2.5),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id                    INT PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  timezone                   VARCHAR(64)  NOT NULL DEFAULT 'Europe/Istanbul',
  planned_daily_deficit_kcal INT          NOT NULL DEFAULT 500 CHECK (planned_daily_deficit_kcal BETWEEN 0 AND 1200),
  protein_g_per_kg           NUMERIC(3,2) NOT NULL DEFAULT 1.80 CHECK (protein_g_per_kg BETWEEN 0.8 AND 3.0),
  use_net_met                BOOLEAN      NOT NULL DEFAULT TRUE,
  caffeine_mg_per_g_coffee   NUMERIC(4,1) NOT NULL DEFAULT 11.0,
  caffeine_half_life_hours   NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  required_fasting_hours     INT          NOT NULL DEFAULT 14,
  kcal_per_kg_fat            INT          NOT NULL DEFAULT 7700,
  ema_alpha_daily            NUMERIC(3,2) NOT NULL DEFAULT 0.10,
  -- Meal schedule (user-defined; NULL = not scheduled). Snacks are never scheduled.
  breakfast_time             TIME,
  lunch_time                 TIME,
  dinner_time                TIME
);

-- ───────────── Food Dictionary ─────────────
CREATE TABLE food_dictionary (
  id               SERIAL PRIMARY KEY,
  item_name_ar     VARCHAR(120) NOT NULL UNIQUE,
  item_name_en     VARCHAR(120),
  nutrition_basis  nutrition_basis_t NOT NULL,
  grams_per_unit   NUMERIC(6,1),
  calories         NUMERIC(7,2) NOT NULL CHECK (calories >= 0),
  protein_g        NUMERIC(6,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g          NUMERIC(6,2) CHECK (carbs_g >= 0),
  fat_g            NUMERIC(6,2) CHECK (fat_g >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────── Meals ─────────────
CREATE TABLE meals (
  id                  SERIAL PRIMARY KEY,
  user_id             INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date            DATE NOT NULL,
  meal_type           meal_type_t NOT NULL,
  scheduled_time      TIME,
  actual_time         TIME NOT NULL,
  time_drift_minutes  INT GENERATED ALWAYS AS (
                        CASE WHEN scheduled_time IS NULL THEN NULL
                             -- wrapped to [-720, 720): 23:30 scheduled → 00:30 actual = +60, not -1380
                             ELSE ((((EXTRACT(EPOCH FROM (actual_time - scheduled_time)) / 60)::INT + 720) % 1440 + 1440) % 1440) - 720
                        END) STORED,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meals_user_date ON meals(user_id, log_date);

CREATE TABLE meal_items (
  id                   SERIAL PRIMARY KEY,
  meal_id              INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_item_id         INT NOT NULL REFERENCES food_dictionary(id),
  quantity             NUMERIC(7,2) NOT NULL CHECK (quantity > 0),
  calculated_calories  NUMERIC(7,2) NOT NULL,
  calculated_protein   NUMERIC(6,2) NOT NULL,
  calculated_carbs     NUMERIC(6,2),
  calculated_fat       NUMERIC(6,2)
);
CREATE INDEX idx_meal_items_meal ON meal_items(meal_id);

-- ───────────── Beverages ─────────────
-- User-defined drinks (list starts empty). Values per 100 ml of the drink itself, before milk and sugar.
CREATE TABLE beverage_catalog (
  id                     SERIAL PRIMARY KEY,
  user_id                INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name_ar                VARCHAR(120) NOT NULL,
  by_coffee_weight       BOOLEAN NOT NULL DEFAULT FALSE,   -- caffeine = grams × caffeine_mg_per_g_coffee
  caffeine_mg_per_100ml  NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (caffeine_mg_per_100ml >= 0),
  kcal_per_100ml         NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (kcal_per_100ml >= 0),
  protein_g_per_100ml    NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (protein_g_per_100ml >= 0),
  default_volume_ml      NUMERIC(6,1) NOT NULL DEFAULT 250 CHECK (default_volume_ml > 0),
  default_coffee_g       NUMERIC(5,1),
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name_ar)
);

CREATE TABLE beverage_logs (
  id                 SERIAL PRIMARY KEY,
  user_id            INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date           DATE NOT NULL,
  consumed_at        TIMESTAMPTZ NOT NULL,
  beverage_id        INT REFERENCES beverage_catalog(id) ON DELETE SET NULL,
  drink_name         VARCHAR(120) NOT NULL,                 -- snapshot
  liquid_volume_ml   NUMERIC(6,1) NOT NULL CHECK (liquid_volume_ml >= 0),
  dry_coffee_grams   NUMERIC(5,1) CHECK (dry_coffee_grams >= 0),
  milk_type          milk_type_t  NOT NULL DEFAULT 'none',
  milk_added_ml      NUMERIC(5,1) NOT NULL DEFAULT 0,
  sugar_teaspoons    NUMERIC(3,1) NOT NULL DEFAULT 0,
  caffeine_mg        NUMERIC(6,1) NOT NULL DEFAULT 0,
  milk_calories      NUMERIC(6,1) NOT NULL DEFAULT 0,
  milk_protein_g     NUMERIC(5,1) NOT NULL DEFAULT 0,
  sugar_calories     NUMERIC(6,1) NOT NULL DEFAULT 0,
  base_calories      NUMERIC(6,1) NOT NULL DEFAULT 0,       -- the drink itself
  base_protein_g     NUMERIC(5,1) NOT NULL DEFAULT 0,
  total_calories     NUMERIC(6,1) GENERATED ALWAYS AS (base_calories + milk_calories + sugar_calories) STORED
);
CREATE INDEX idx_bev_user_date ON beverage_logs(user_id, log_date);

-- ───────────── Day Status (intake completeness) ─────────────
-- Only days with intake_complete = TRUE enter deficit, expected loss and observed TDEE.
CREATE TABLE day_status (
  user_id          INT  NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date         DATE NOT NULL,
  intake_complete  BOOLEAN NOT NULL DEFAULT FALSE,
  closed_at        TIMESTAMPTZ,
  PRIMARY KEY (user_id, log_date)
);

-- ───────────── Screen Time ─────────────
CREATE TABLE screen_time_logs (
  id                    SERIAL PRIMARY KEY,
  user_id               INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  high_focus_hours      NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (high_focus_hours BETWEEN 0 AND 24),
  moderate_admin_hours  NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (moderate_admin_hours BETWEEN 0 AND 24),
  passive_media_hours   NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (passive_media_hours BETWEEN 0 AND 24),
  total_screen_hours    NUMERIC(4,2) GENERATED ALWAYS AS
                          (high_focus_hours + moderate_admin_hours + passive_media_hours) STORED,
  UNIQUE (user_id, log_date),
  CHECK (high_focus_hours + moderate_admin_hours + passive_media_hours <= 24)
);

-- ───────────── Exercise ─────────────
CREATE TABLE exercise_catalog (
  id             SERIAL PRIMARY KEY,
  code           VARCHAR(40) UNIQUE NOT NULL,
  name_ar        VARCHAR(80) NOT NULL,
  default_met    NUMERIC(4,1) NOT NULL CHECK (default_met > 1),
  compendium_ref VARCHAR(20)
);

CREATE TABLE exercise_logs (
  id                 SERIAL PRIMARY KEY,
  user_id            INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date           DATE NOT NULL,
  exercise_id        INT NOT NULL REFERENCES exercise_catalog(id),
  duration_minutes   INT NOT NULL CHECK (duration_minutes BETWEEN 1 AND 600),
  met_value          NUMERIC(4,1) NOT NULL,
  weight_used_kg     NUMERIC(5,2) NOT NULL,
  gross_burned_kcal  NUMERIC(7,1) NOT NULL,
  net_burned_kcal    NUMERIC(7,1) NOT NULL,
  notes              TEXT
);
CREATE INDEX idx_ex_user_date ON exercise_logs(user_id, log_date);

-- ───────────── Sleep ─────────────
CREATE TABLE sleep_logs (
  id                         SERIAL PRIMARY KEY,
  user_id                    INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date                   DATE NOT NULL,              -- wake-up date
  bed_time                   TIMESTAMPTZ NOT NULL,
  sleep_onset_time           TIMESTAMPTZ NOT NULL,
  wake_up_time               TIMESTAMPTZ NOT NULL,
  night_interruptions_count  INT NOT NULL DEFAULT 0 CHECK (night_interruptions_count >= 0),
  waso_minutes               INT NOT NULL DEFAULT 0 CHECK (waso_minutes >= 0),
  wake_freshness_score       SMALLINT NOT NULL CHECK (wake_freshness_score BETWEEN 1 AND 5),
  time_in_bed_min            INT GENERATED ALWAYS AS
                               ((EXTRACT(EPOCH FROM (wake_up_time - bed_time)) / 60)::INT) STORED,
  sleep_latency_min          INT GENERATED ALWAYS AS
                               ((EXTRACT(EPOCH FROM (sleep_onset_time - bed_time)) / 60)::INT) STORED,
  total_sleep_min            INT GENERATED ALWAYS AS
                               ((EXTRACT(EPOCH FROM (wake_up_time - sleep_onset_time)) / 60)::INT
                                 - waso_minutes) STORED,
  UNIQUE (user_id, log_date),
  CHECK (bed_time <= sleep_onset_time AND sleep_onset_time < wake_up_time)
);

-- ───────────── Weigh-ins ─────────────
CREATE TABLE weigh_ins (
  id                     SERIAL PRIMARY KEY,
  user_id                INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date               DATE NOT NULL,
  measured_at            TIMESTAMPTZ NOT NULL,
  dry_fasted_weight_kg   NUMERIC(5,2) NOT NULL CHECK (dry_fasted_weight_kg BETWEEN 30 AND 300),
  last_meal_at           TIMESTAMPTZ NOT NULL,
  fasting_hours          NUMERIC(4,1) GENERATED ALWAYS AS
                           (EXTRACT(EPOCH FROM (measured_at - last_meal_at)) / 3600) STORED,
  bathroom_done          BOOLEAN NOT NULL,
  no_fluids_before       BOOLEAN NOT NULL,
  high_sodium_yesterday  BOOLEAN NOT NULL DEFAULT FALSE,
  normal_digestion       BOOLEAN NOT NULL DEFAULT TRUE,
  is_official_weekly     BOOLEAN NOT NULL DEFAULT TRUE,
  is_protocol_compliant  BOOLEAN NOT NULL,
  UNIQUE (user_id, log_date)
);

-- ───────────── Monthly Measurements ─────────────
CREATE TABLE body_measurements (
  id        SERIAL PRIMARY KEY,
  user_id   INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date  DATE NOT NULL,
  neck_cm   NUMERIC(5,1),
  chest_cm  NUMERIC(5,1),
  waist_cm  NUMERIC(5,1) NOT NULL,   -- navel level, end of exhale
  hip_cm    NUMERIC(5,1) NOT NULL,   -- widest point of buttocks
  thigh_cm  NUMERIC(5,1),
  bicep_cm  NUMERIC(5,1),
  whr       NUMERIC(4,3) GENERATED ALWAYS AS (waist_cm / NULLIF(hip_cm, 0)) STORED,
  UNIQUE (user_id, log_date)
);

-- ───────────── Insights ─────────────
CREATE TABLE insights (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rule_code     VARCHAR(40) NOT NULL,
  severity      insight_severity_t NOT NULL,
  title         VARCHAR(160) NOT NULL,
  message       TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at  TIMESTAMPTZ,
  UNIQUE (user_id, rule_code, period_start, period_end)
);

-- ───────────── Read Model ─────────────
CREATE OR REPLACE VIEW v_daily_intake AS
SELECT d.user_id, d.log_date,
       COALESCE(f.food_kcal, 0)    AS food_kcal,
       COALESCE(f.food_protein, 0) AS food_protein_g,
       COALESCE(b.bev_kcal, 0)     AS beverage_kcal,
       COALESCE(b.bev_protein, 0)  AS beverage_protein_g,
       COALESCE(b.caffeine_mg, 0)  AS caffeine_mg,
       COALESCE(e.net_kcal, 0)     AS exercise_net_kcal,
       COALESCE(e.gross_kcal, 0)   AS exercise_gross_kcal,
       COALESCE(f.food_kcal, 0) + COALESCE(b.bev_kcal, 0)       AS total_intake_kcal,
       COALESCE(f.food_protein, 0) + COALESCE(b.bev_protein, 0) AS total_protein_g,
       COALESCE(ds.intake_complete, FALSE)                      AS intake_complete
FROM (
  SELECT user_id, log_date FROM meals
  UNION SELECT user_id, log_date FROM beverage_logs
  UNION SELECT user_id, log_date FROM exercise_logs
) d
LEFT JOIN (
  SELECT m.user_id, m.log_date,
         SUM(mi.calculated_calories) AS food_kcal,
         SUM(mi.calculated_protein)  AS food_protein
  FROM meals m JOIN meal_items mi ON mi.meal_id = m.id
  GROUP BY m.user_id, m.log_date
) f USING (user_id, log_date)
LEFT JOIN (
  SELECT user_id, log_date, SUM(total_calories) AS bev_kcal, SUM(milk_protein_g + base_protein_g) AS bev_protein,
         SUM(caffeine_mg) AS caffeine_mg
  FROM beverage_logs GROUP BY user_id, log_date
) b USING (user_id, log_date)
LEFT JOIN (
  SELECT user_id, log_date, SUM(net_burned_kcal) AS net_kcal, SUM(gross_burned_kcal) AS gross_kcal
  FROM exercise_logs GROUP BY user_id, log_date
) e USING (user_id, log_date)
LEFT JOIN day_status ds USING (user_id, log_date);
