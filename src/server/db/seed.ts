// Idempotent seed: exercise catalog + one placeholder profile (edited later from /settings).
// Foods and drinks are NOT seeded: the user builds their own lists (they start empty).
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

async function main() {
  const { db } = await import('./client');
  const { exerciseCatalog, userProfiles, userSettings } = await import('./schema');

  const ex = await db.insert(exerciseCatalog).values(EXERCISES).onConflictDoNothing().returning({ id: exerciseCatalog.id });

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

  console.log(`exercise_catalog: +${ex.length} | placeholder profile: ${profileCreated ? 'created' : 'exists'}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
