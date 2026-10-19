# بيانات الـ Seed — AS_FIT

يُنفَّذ عبر `src/server/db/seed.ts` بأسلوب idempotent (`ON CONFLICT DO NOTHING` على `code` / `item_name_ar`).

## exercise_catalog

| code | name_ar | default_met |
|---|---|---|
| `walking_moderate` | مشي معتدل (~5 كم/س) | 3.5 |
| `walking_brisk` | مشي سريع (~5.6–6.4 كم/س) | 4.3 |
| `running_8kmh` | جري (8 كم/س) | 8.3 |
| `running_10kmh` | جري (10 كم/س) | 9.8 |
| `football_gk_training` | كرة قدم — حارس مرمى/تدريب | 5.0 |
| `football_casual` | كرة قدم — لعب عام | 7.0 |
| `football_competitive` | كرة قدم — مباراة تنافسية | 10.0 |
| `home_workout_moderate` | تمارين منزلية (وزن الجسم) معتدلة | 3.8 |
| `home_workout_vigorous` | تمارين منزلية مكثفة / دائرية | 8.0 |

## food_dictionary (قيم تقريبية USDA)

| item_name_ar | basis | grams_per_unit | calories | protein_g |
|---|---|---|---|---|
| بيضة كاملة | per_unit | 50 | 72 | 6.3 |
| صدر دجاج مطبوخ (مشوي) | per_100g | — | 165 | 31.0 |
| رز أبيض مطبوخ | per_100g | — | 130 | 2.7 |
| خبز أسمر (قمح كامل) | per_100g | — | 247 | 13.0 |
| زبادي يوناني قليل الدسم | per_100g | — | 73 | 10.0 |
| تونة معلبة بالماء (مصفاة) | per_100g | — | 116 | 26.0 |
| شوفان جاف | per_100g | — | 389 | 16.9 |
| زيت زيتون | per_100g | — | 884 | 0 |

## مستخدم افتراضي

إنشاء `user_profiles` واحد + `user_settings` بالقيم الافتراضية فقط إذا كان الجدول فارغاً؛ بيانات المستخدم الفعلية تُدخل من `/settings`.
