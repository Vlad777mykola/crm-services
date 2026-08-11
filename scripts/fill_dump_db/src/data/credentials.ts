/**
 * Every login-capable account this seed script creates - the single source of
 * truth for both the insert logic (seed.ts) and the printed/documented
 * "cheat sheet" (README.md, index.ts), so they can never drift apart.
 *
 * Every account below shares the same password: Passw0rd!123
 */
export const SHARED_TEST_PASSWORD = 'Passw0rd!123';

export interface TestAccount {
  email: string;
  name: string;
  phone: string;
  city: string;
  bio: string | null;
  status: 'active' | 'disabled';
  /** Human-readable role/company summary - shown in the printed summary and README. */
  note: string;
}

export const TEST_ACCOUNTS: TestAccount[] = [
  // --- Company owners / managers ---
  {
    email: 'owner.dental@example.com',
    name: 'Ivanna Petrenko',
    phone: '+380501234501',
    city: 'Kyiv',
    bio: null,
    status: 'active',
    note: 'Owner - Bright Smile Dental (published company)',
  },
  {
    email: 'manager.dental@example.com',
    name: 'Oleh Bondar',
    phone: '+380501234502',
    city: 'Kyiv',
    bio: null,
    status: 'active',
    note: 'Manager - Bright Smile Dental',
  },
  {
    email: 'owner.beauty@example.com',
    name: 'Marta Shevchenko',
    phone: '+380501234503',
    city: 'Lviv',
    bio: null,
    status: 'active',
    note: 'Owner - Glow Beauty Studio (published, remote-supported company)',
  },
  {
    email: 'member.beauty.removed@example.com',
    name: 'Petro Ivanov',
    phone: '+380501234504',
    city: 'Lviv',
    bio: null,
    status: 'active',
    note: 'Former manager (membership removed) - Glow Beauty Studio',
  },
  {
    email: 'owner.fitness@example.com',
    name: 'Dmytro Kravets',
    phone: '+380501234505',
    city: 'Odesa',
    bio: null,
    status: 'active',
    note: 'Owner - Fresh Start Fitness (draft company, not published yet)',
  },
  {
    email: 'owner.spa@example.com',
    name: 'Sofia Melnyk',
    phone: '+380501234506',
    city: 'Kharkiv',
    bio: null,
    status: 'active',
    note: 'Owner - Old Town Spa (suspended company)',
  },

  // --- Specialists ---
  {
    email: 'specialist.olena@example.com',
    name: 'Olena Kovalenko',
    phone: '+380501234507',
    city: 'Kyiv',
    bio: 'Dentist, 8 years of experience.',
    status: 'active',
    note: 'Specialist - published profile, active at Bright Smile Dental',
  },
  {
    email: 'specialist.ihor@example.com',
    name: 'Ihor Sydorenko',
    phone: '+380501234508',
    city: 'Kyiv',
    bio: 'Orthodontist.',
    status: 'active',
    note: 'Specialist - published profile; pending request to Bright Smile Dental, rejected by Old Town Spa',
  },
  {
    email: 'specialist.nina@example.com',
    name: 'Nina Tkachenko',
    phone: '+380501234509',
    city: 'Lviv',
    bio: 'Hair stylist and colorist.',
    status: 'active',
    note: 'Specialist - published profile, active at Glow Beauty Studio',
  },
  {
    email: 'specialist.pavlo@example.com',
    name: 'Pavlo Rud',
    phone: '+380501234510',
    city: 'Odesa',
    bio: 'Personal trainer.',
    status: 'active',
    note: 'Specialist - draft profile (not published); cancelled own request to Fresh Start Fitness',
  },
  {
    email: 'specialist.kate@example.com',
    name: 'Kateryna Bila',
    phone: '+380501234511',
    city: 'Kyiv',
    bio: 'Massage therapist.',
    status: 'active',
    note: 'Specialist - suspended profile; paused at Glow Beauty Studio, removed from Bright Smile Dental',
  },

  // --- Clients ---
  {
    email: 'client.andriy@example.com',
    name: 'Andriy Moroz',
    phone: '+380501234512',
    city: 'Kyiv',
    bio: null,
    status: 'active',
    note: 'Client - has a pending, a cancelled, and a completed (unreviewed) appointment',
  },
  {
    email: 'client.iryna@example.com',
    name: 'Iryna Vovk',
    phone: '+380501234513',
    city: 'Kyiv',
    bio: null,
    status: 'active',
    note: 'Client - has an approved appointment and a completed + reviewed appointment',
  },
  {
    email: 'client.taras@example.com',
    name: 'Taras Lys',
    phone: '+380501234514',
    city: 'Lviv',
    bio: null,
    status: 'active',
    note: 'Client - has a rejected appointment and a completed + reviewed appointment',
  },
  {
    email: 'client.disabled@example.com',
    name: 'Yulia Chorna',
    phone: '+380501234515',
    city: 'Kyiv',
    bio: null,
    status: 'disabled',
    note: 'Client - account status is disabled; login must be rejected (403)',
  },
];
