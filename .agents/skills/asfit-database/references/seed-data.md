# بيانات الـ Seed — AS_FIT

يُنفَّذ عبر `src/server/db/seed.ts` بأسلوب idempotent (`ON CONFLICT DO NOTHING` على `code`).

> **قاموس الأغذية وقائمة المشروبات يبدآن فارغين** (قرار المستخدم): المستخدم يدخل أصنافه ومشروباته بقيمها من الواجهة. لا تُضف بيانات أولية لهما.

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

## مستخدم افتراضي

إنشاء `user_profiles` واحد + `user_settings` بالقيم الافتراضية فقط إذا كان الجدول فارغاً؛ بيانات المستخدم الفعلية وجدول الوجبات تُدخل من `/settings`.
