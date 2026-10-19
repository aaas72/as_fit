-- Read model v2: beverage protein = milk protein + the drink's own protein. TDEE and deficit are NOT computed in SQL.
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
  SELECT user_id, log_date, SUM(total_calories) AS bev_kcal,
         SUM(milk_protein_g + base_protein_g) AS bev_protein,
         SUM(caffeine_mg) AS caffeine_mg
  FROM beverage_logs GROUP BY user_id, log_date
) b USING (user_id, log_date)
LEFT JOIN (
  SELECT user_id, log_date, SUM(net_burned_kcal) AS net_kcal, SUM(gross_burned_kcal) AS gross_kcal
  FROM exercise_logs GROUP BY user_id, log_date
) e USING (user_id, log_date)
LEFT JOIN day_status ds USING (user_id, log_date);
