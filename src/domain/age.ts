import { differenceInYears } from 'date-fns';

export const ageInYears = (birthDate: Date, on: Date) => differenceInYears(on, birthDate);
