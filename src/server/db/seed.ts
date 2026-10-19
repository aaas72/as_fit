// Idempotent seed: reference catalogs + one placeholder profile (edited later from /settings).
// Run with: pnpm db:seed
try {
  process.loadEnvFile();
} catch {
  // no .env file: rely on the shell environment
}

const EXERCISES = [
  { code: 'walking_moderate', nameAr: 'مشي معتدل (~5 كم/س)', defaultMet: '3.5' },
  { code: 'walking_brisk', nameAr: 'مشي سريع (~5.6–6.4 كم/س)', defaultMet: '4.3' },
  { code: 'running_8kmh', nameAr: 'جري (8 كم/س)', defaultMet: '8.3' },
  { code: 'running_10kmh', nameAr: 'جري (10 كم/س)', defaultMet: '9.8' },
  { code: 'football_gk_training', nameAr: 'كرة قدم — حارس مرمى/تدريب', defaultMet: '5.0' },
  { code: 'football_casual', nameAr: 'كرة قدم — لعب عام', defaultMet: '7.0' },
  { code: 'football_competitive', nameAr: 'كرة قدم — مباراة تنافسية', defaultMet: '10.0' },
  { code: 'home_workout_moderate', nameAr: 'تمارين منزلية (وزن الجسم) معتدلة', defaultMet: '3.8' },
  { code: 'home_workout_vigorous', nameAr: 'تمارين منزلية مكثفة / دائرية', defaultMet: '8.0' },
];

// USDA FoodData Central (approximate). Olive oil: 884 kcal is per 100 g, not per 100 ml.
const FOODS = [
  { itemNameAr: 'بيضة كاملة', itemNameEn: 'Egg, whole', nutritionBasis: 'per_unit', gramsPerUnit: '50', calories: '72', proteinG: '6.3' },
  { itemNameAr: 'صدر دجاج مطبوخ (مشوي)', itemNameEn: 'Chicken breast, roasted', nutritionBasis: 'per_100g', gramsPerUnit: null, calories: '165', proteinG: '31.0' },
  { itemNameAr: 'رز أبيض مطبوخ', itemNameEn: 'White rice, cooked', nutritionBasis: 'per_100g', gramsPerUnit: null, calories: '130', proteinG: '2.7' },
  { itemNameAr: 'خبز أسمر (قمح كامل)', itemNameEn: 'Whole-wheat bread', nutritionBasis: 'per_100g', gramsPerUnit: null, calories: '247', proteinG: '13.0' },
  { itemNameAr: 'زبادي يوناني قليل الدسم', itemNameEn: 'Greek yogurt, low-fat', nutritionBasis: 'per_100g', gramsPerUnit: null, calories: '73', proteinG: '10.0' },
  { itemNameAr: 'تونة معلبة بالماء (مصفاة)', itemNameEn: 'Tuna, canned in water, drained', nutritionBasis: 'per_100g', gramsPerUnit: null, calories: '116', proteinG: '26.0' },
  { itemNameAr: 'شوفان جاف', itemNameEn: 'Oats, dry', nutritionBasis: 'per_100g', gramsPerUnit: null, calories: '389', proteinG: '16.9' },
  { itemNameAr: 'زيت زيتون', itemNameEn: 'Olive oil', nutritionBasis: 'per_100g', gramsPerUnit: null, calories: '884', proteinG: '0' },
] as const;

async function main() {
  const { db } = await import('./client');
  const { exerciseCatalog, foodDictionary, userProfiles, userSettings } = await import('./schema');

  const ex = await db.insert(exerciseCatalog).values(EXERCISES).onConflictDoNothing().returning({ id: exerciseCatalog.id });
  const fd = await db.insert(foodDictionary).values([...FOODS]).onConflictDoNothing().returning({ id: foodDictionary.id });

  const existing = await db.select({ id: userProfiles.id }).from(userProfiles).limit(1);
  let profileCreated = false;
  if (existing.length === 0) {
    const [profile] = await db.insert(userProfiles).values({
      displayName: 'المستخدم',
      gender: 'male',
      birthDate: '1995-01-01',
      currentHeightCm: '175.0',
      initialWeightKg: '80.00',
      targetWeightKg: '75.00',
    }).returning({ id: userProfiles.id });
    await db.insert(userSettings).values({ userId: profile!.id }).onConflictDoNothing();
    profileCreated = true;
  }

  console.log(`exercise_catalog: +${ex.length} | food_dictionary: +${fd.length} | placeholder profile: ${profileCreated ? 'created' : 'exists'}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
