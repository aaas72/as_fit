CREATE TYPE "public"."drink_type_t" AS ENUM('coffee_brewed', 'coffee_turkish', 'coffee_instant', 'espresso', 'tea_black', 'tea_green', 'water', 'soda_zero', 'herbal');--> statement-breakpoint
CREATE TYPE "public"."gender_t" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."insight_severity_t" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."meal_type_t" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."milk_type_t" AS ENUM('none', 'whole', 'semi_skimmed', 'skimmed');--> statement-breakpoint
CREATE TYPE "public"."nutrition_basis_t" AS ENUM('per_100g', 'per_100ml', 'per_unit');--> statement-breakpoint
CREATE TABLE "beverage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"log_date" date NOT NULL,
	"consumed_at" timestamp with time zone NOT NULL,
	"drink_type" "drink_type_t" NOT NULL,
	"liquid_volume_ml" numeric(6, 1) NOT NULL,
	"dry_coffee_grams" numeric(5, 1),
	"milk_type" "milk_type_t" DEFAULT 'none' NOT NULL,
	"milk_added_ml" numeric(5, 1) DEFAULT '0' NOT NULL,
	"sugar_teaspoons" numeric(3, 1) DEFAULT '0' NOT NULL,
	"caffeine_mg" numeric(6, 1) DEFAULT '0' NOT NULL,
	"milk_calories" numeric(6, 1) DEFAULT '0' NOT NULL,
	"milk_protein_g" numeric(5, 1) DEFAULT '0' NOT NULL,
	"sugar_calories" numeric(6, 1) DEFAULT '0' NOT NULL,
	"total_calories" numeric(6, 1) GENERATED ALWAYS AS (milk_calories + sugar_calories) STORED,
	CONSTRAINT "bev_volume_ck" CHECK ("beverage_logs"."liquid_volume_ml" >= 0),
	CONSTRAINT "bev_coffee_ck" CHECK ("beverage_logs"."dry_coffee_grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE "body_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"log_date" date NOT NULL,
	"neck_cm" numeric(5, 1),
	"chest_cm" numeric(5, 1),
	"waist_cm" numeric(5, 1) NOT NULL,
	"hip_cm" numeric(5, 1) NOT NULL,
	"thigh_cm" numeric(5, 1),
	"bicep_cm" numeric(5, 1),
	"whr" numeric(4, 3) GENERATED ALWAYS AS (waist_cm / NULLIF(hip_cm, 0)) STORED,
	CONSTRAINT "body_measurements_user_date_uq" UNIQUE("user_id","log_date")
);
--> statement-breakpoint
CREATE TABLE "day_status" (
	"user_id" integer NOT NULL,
	"log_date" date NOT NULL,
	"intake_complete" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "day_status_user_id_log_date_pk" PRIMARY KEY("user_id","log_date")
);
--> statement-breakpoint
CREATE TABLE "exercise_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"name_ar" varchar(80) NOT NULL,
	"default_met" numeric(4, 1) NOT NULL,
	"compendium_ref" varchar(20),
	CONSTRAINT "exercise_catalog_code_unique" UNIQUE("code"),
	CONSTRAINT "exercise_met_ck" CHECK ("exercise_catalog"."default_met" > 1)
);
--> statement-breakpoint
CREATE TABLE "exercise_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"log_date" date NOT NULL,
	"exercise_id" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"met_value" numeric(4, 1) NOT NULL,
	"weight_used_kg" numeric(5, 2) NOT NULL,
	"gross_burned_kcal" numeric(7, 1) NOT NULL,
	"net_burned_kcal" numeric(7, 1) NOT NULL,
	"notes" text,
	CONSTRAINT "exercise_duration_ck" CHECK ("exercise_logs"."duration_minutes" BETWEEN 1 AND 600)
);
--> statement-breakpoint
CREATE TABLE "food_dictionary" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_name_ar" varchar(120) NOT NULL,
	"item_name_en" varchar(120),
	"nutrition_basis" "nutrition_basis_t" NOT NULL,
	"grams_per_unit" numeric(6, 1),
	"calories" numeric(7, 2) NOT NULL,
	"protein_g" numeric(6, 2) NOT NULL,
	"carbs_g" numeric(6, 2),
	"fat_g" numeric(6, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_dictionary_item_name_ar_unique" UNIQUE("item_name_ar"),
	CONSTRAINT "food_calories_ck" CHECK ("food_dictionary"."calories" >= 0),
	CONSTRAINT "food_protein_ck" CHECK ("food_dictionary"."protein_g" >= 0),
	CONSTRAINT "food_carbs_ck" CHECK ("food_dictionary"."carbs_g" >= 0),
	CONSTRAINT "food_fat_ck" CHECK ("food_dictionary"."fat_g" >= 0)
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"rule_code" varchar(40) NOT NULL,
	"severity" "insight_severity_t" NOT NULL,
	"title" varchar(160) NOT NULL,
	"message" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed_at" timestamp with time zone,
	CONSTRAINT "insights_dedupe_uq" UNIQUE("user_id","rule_code","period_start","period_end")
);
--> statement-breakpoint
CREATE TABLE "meal_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal_id" integer NOT NULL,
	"food_item_id" integer NOT NULL,
	"quantity" numeric(7, 2) NOT NULL,
	"calculated_calories" numeric(7, 2) NOT NULL,
	"calculated_protein" numeric(6, 2) NOT NULL,
	"calculated_carbs" numeric(6, 2),
	"calculated_fat" numeric(6, 2),
	CONSTRAINT "meal_items_quantity_ck" CHECK ("meal_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"log_date" date NOT NULL,
	"meal_type" "meal_type_t" NOT NULL,
	"scheduled_time" time,
	"actual_time" time NOT NULL,
	"time_drift_minutes" integer GENERATED ALWAYS AS (CASE WHEN scheduled_time IS NULL THEN NULL
    ELSE ((((EXTRACT(EPOCH FROM (actual_time - scheduled_time)) / 60)::INT + 720) % 1440 + 1440) % 1440) - 720 END) STORED,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screen_time_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"log_date" date NOT NULL,
	"high_focus_hours" numeric(4, 2) DEFAULT '0' NOT NULL,
	"moderate_admin_hours" numeric(4, 2) DEFAULT '0' NOT NULL,
	"passive_media_hours" numeric(4, 2) DEFAULT '0' NOT NULL,
	"total_screen_hours" numeric(4, 2) GENERATED ALWAYS AS (high_focus_hours + moderate_admin_hours + passive_media_hours) STORED,
	CONSTRAINT "screen_time_user_date_uq" UNIQUE("user_id","log_date"),
	CONSTRAINT "screen_high_focus_ck" CHECK ("screen_time_logs"."high_focus_hours" BETWEEN 0 AND 24),
	CONSTRAINT "screen_moderate_ck" CHECK ("screen_time_logs"."moderate_admin_hours" BETWEEN 0 AND 24),
	CONSTRAINT "screen_passive_ck" CHECK ("screen_time_logs"."passive_media_hours" BETWEEN 0 AND 24),
	CONSTRAINT "screen_total_ck" CHECK ("screen_time_logs"."high_focus_hours" + "screen_time_logs"."moderate_admin_hours" + "screen_time_logs"."passive_media_hours" <= 24)
);
--> statement-breakpoint
CREATE TABLE "sleep_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"log_date" date NOT NULL,
	"bed_time" timestamp with time zone NOT NULL,
	"sleep_onset_time" timestamp with time zone NOT NULL,
	"wake_up_time" timestamp with time zone NOT NULL,
	"night_interruptions_count" integer DEFAULT 0 NOT NULL,
	"waso_minutes" integer DEFAULT 0 NOT NULL,
	"wake_freshness_score" smallint NOT NULL,
	"time_in_bed_min" integer GENERATED ALWAYS AS ((EXTRACT(EPOCH FROM (wake_up_time - bed_time)) / 60)::INT) STORED,
	"sleep_latency_min" integer GENERATED ALWAYS AS ((EXTRACT(EPOCH FROM (sleep_onset_time - bed_time)) / 60)::INT) STORED,
	"total_sleep_min" integer GENERATED ALWAYS AS ((EXTRACT(EPOCH FROM (wake_up_time - sleep_onset_time)) / 60)::INT - waso_minutes) STORED,
	CONSTRAINT "sleep_user_date_uq" UNIQUE("user_id","log_date"),
	CONSTRAINT "sleep_interruptions_ck" CHECK ("sleep_logs"."night_interruptions_count" >= 0),
	CONSTRAINT "sleep_waso_ck" CHECK ("sleep_logs"."waso_minutes" >= 0),
	CONSTRAINT "sleep_freshness_ck" CHECK ("sleep_logs"."wake_freshness_score" BETWEEN 1 AND 5),
	CONSTRAINT "sleep_order_ck" CHECK ("sleep_logs"."bed_time" <= "sleep_logs"."sleep_onset_time" AND "sleep_logs"."sleep_onset_time" < "sleep_logs"."wake_up_time")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"gender" "gender_t" NOT NULL,
	"birth_date" date NOT NULL,
	"current_height_cm" numeric(5, 1) NOT NULL,
	"initial_weight_kg" numeric(5, 2) NOT NULL,
	"target_weight_kg" numeric(5, 2) NOT NULL,
	"default_activity_factor" numeric(4, 3) DEFAULT '1.200' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_height_ck" CHECK ("user_profiles"."current_height_cm" BETWEEN 100 AND 250),
	CONSTRAINT "user_profiles_initial_weight_ck" CHECK ("user_profiles"."initial_weight_kg" BETWEEN 30 AND 300),
	CONSTRAINT "user_profiles_target_weight_ck" CHECK ("user_profiles"."target_weight_kg" BETWEEN 30 AND 300),
	CONSTRAINT "user_profiles_activity_factor_ck" CHECK ("user_profiles"."default_activity_factor" BETWEEN 1.0 AND 2.5)
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Riyadh' NOT NULL,
	"planned_daily_deficit_kcal" integer DEFAULT 500 NOT NULL,
	"protein_g_per_kg" numeric(3, 2) DEFAULT '1.80' NOT NULL,
	"use_net_met" boolean DEFAULT true NOT NULL,
	"caffeine_mg_per_g_coffee" numeric(4, 1) DEFAULT '11.0' NOT NULL,
	"caffeine_half_life_hours" numeric(3, 1) DEFAULT '5.0' NOT NULL,
	"required_fasting_hours" integer DEFAULT 14 NOT NULL,
	"kcal_per_kg_fat" integer DEFAULT 7700 NOT NULL,
	"ema_alpha_daily" numeric(3, 2) DEFAULT '0.10' NOT NULL,
	CONSTRAINT "user_settings_deficit_ck" CHECK ("user_settings"."planned_daily_deficit_kcal" BETWEEN 0 AND 1200),
	CONSTRAINT "user_settings_protein_ck" CHECK ("user_settings"."protein_g_per_kg" BETWEEN 0.8 AND 3.0)
);
--> statement-breakpoint
CREATE TABLE "weigh_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"log_date" date NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"dry_fasted_weight_kg" numeric(5, 2) NOT NULL,
	"last_meal_at" timestamp with time zone NOT NULL,
	"fasting_hours" numeric(4, 1) GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (measured_at - last_meal_at)) / 3600) STORED,
	"bathroom_done" boolean NOT NULL,
	"no_fluids_before" boolean NOT NULL,
	"high_sodium_yesterday" boolean DEFAULT false NOT NULL,
	"normal_digestion" boolean DEFAULT true NOT NULL,
	"is_official_weekly" boolean DEFAULT true NOT NULL,
	"is_protocol_compliant" boolean NOT NULL,
	CONSTRAINT "weigh_ins_user_date_uq" UNIQUE("user_id","log_date"),
	CONSTRAINT "weigh_ins_weight_ck" CHECK ("weigh_ins"."dry_fasted_weight_kg" BETWEEN 30 AND 300)
);
--> statement-breakpoint
ALTER TABLE "beverage_logs" ADD CONSTRAINT "beverage_logs_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_status" ADD CONSTRAINT "day_status_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_exercise_id_exercise_catalog_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_item_id_food_dictionary_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_dictionary"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_time_logs" ADD CONSTRAINT "screen_time_logs_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weigh_ins" ADD CONSTRAINT "weigh_ins_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bev_user_date" ON "beverage_logs" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE INDEX "idx_ex_user_date" ON "exercise_logs" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE INDEX "idx_meal_items_meal" ON "meal_items" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "idx_meals_user_date" ON "meals" USING btree ("user_id","log_date");