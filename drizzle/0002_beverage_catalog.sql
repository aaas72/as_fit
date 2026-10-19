-- v_daily_intake depends on beverage_logs.total_calories; it is recreated in 0004_v_daily_intake_v2
DROP VIEW IF EXISTS v_daily_intake;--> statement-breakpoint
CREATE TABLE "beverage_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name_ar" varchar(120) NOT NULL,
	"by_coffee_weight" boolean DEFAULT false NOT NULL,
	"caffeine_mg_per_100ml" numeric(6, 1) DEFAULT '0' NOT NULL,
	"kcal_per_100ml" numeric(6, 1) DEFAULT '0' NOT NULL,
	"protein_g_per_100ml" numeric(5, 1) DEFAULT '0' NOT NULL,
	"default_volume_ml" numeric(6, 1) DEFAULT '250' NOT NULL,
	"default_coffee_g" numeric(5, 1),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beverage_catalog_user_name_uq" UNIQUE("user_id","name_ar"),
	CONSTRAINT "bev_cat_caffeine_ck" CHECK ("beverage_catalog"."caffeine_mg_per_100ml" >= 0),
	CONSTRAINT "bev_cat_kcal_ck" CHECK ("beverage_catalog"."kcal_per_100ml" >= 0),
	CONSTRAINT "bev_cat_protein_ck" CHECK ("beverage_catalog"."protein_g_per_100ml" >= 0),
	CONSTRAINT "bev_cat_volume_ck" CHECK ("beverage_catalog"."default_volume_ml" > 0)
);
--> statement-breakpoint
ALTER TABLE "beverage_logs" ALTER COLUMN "drink_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "beverage_logs" drop column "total_calories";--> statement-breakpoint
ALTER TABLE "beverage_logs" ADD COLUMN "beverage_id" integer;--> statement-breakpoint
ALTER TABLE "beverage_logs" ADD COLUMN "drink_name" varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE "beverage_logs" ADD COLUMN "base_calories" numeric(6, 1) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "beverage_logs" ADD COLUMN "base_protein_g" numeric(5, 1) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "beverage_logs" ADD COLUMN "total_calories" numeric(6, 1) GENERATED ALWAYS AS (base_calories + milk_calories + sugar_calories) STORED;--> statement-breakpoint
ALTER TABLE "beverage_catalog" ADD CONSTRAINT "beverage_catalog_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beverage_logs" ADD CONSTRAINT "beverage_logs_beverage_id_beverage_catalog_id_fk" FOREIGN KEY ("beverage_id") REFERENCES "public"."beverage_catalog"("id") ON DELETE set null ON UPDATE no action;