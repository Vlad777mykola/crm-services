import bcrypt from 'bcryptjs';

import { SHARED_TEST_PASSWORD, TEST_ACCOUNTS } from './data/credentials.js';
import { ensureAllMicroserviceSchemas } from './ensure-schemas.js';
import { daysFromNow, insertQualified, insertRow } from './insert.js';

// Same cost factor as auth-service password hashing.
const BCRYPT_SALT_ROUNDS = 10;

export async function seedDatabase(): Promise<void> {
  await ensureAllMicroserviceSchemas();
  const passwordHash = await bcrypt.hash(SHARED_TEST_PASSWORD, BCRYPT_SALT_ROUNDS);

  // ---------------------------------------------------------------------
  // Auth identities + users-service profiles (shared userId = auth_identities.id)
  // ---------------------------------------------------------------------
  const userIdByEmail = new Map<string, string>();
  for (const account of TEST_ACCOUNTS) {
    const userId = await insertQualified('auth_schema', 'auth_identities', {
      provider: 'password',
      providerUserId: account.email,
      email: account.email,
      passwordHash,
    });
    userIdByEmail.set(account.email, userId);

    await insertQualified('users_schema', 'users', {
      id: userId,
      email: account.email,
      status: account.status,
    });
    await insertRow('users_schema', 'user_profiles', {
      userId,
      name: account.name,
      phone: account.phone,
      city: account.city,
      bio: account.bio,
    });
  }
  const uid = (email: string): string => {
    const id = userIdByEmail.get(email);
    if (!id) throw new Error(`Unknown seed account: ${email}`);
    return id;
  };
  console.log(`[fill_dump_db] created ${TEST_ACCOUNTS.length} users`);

  // ---------------------------------------------------------------------
  // Companies - one of each CompanyStatus (draft/published/suspended)
  // ---------------------------------------------------------------------
  const dentalId = await insertQualified('companies_schema', 'companies', {
    name: 'Bright Smile Dental',
    slug: 'bright-smile-dental',
    description: 'Full-service dental clinic in the city center.',
    category: 'Dental',
    website: 'https://bright-smile-dental.example.com',
    phone: '+380441234501',
    email: 'contact@bright-smile-dental.example.com',
    status: 'published',
    isRemoteSupported: false,
    city: 'Kyiv',
    address: '12 Khreshchatyk St',
    createdByUserId: uid('owner.dental@example.com'),
  });

  const beautyId = await insertQualified('companies_schema', 'companies', {
    name: 'Glow Beauty Studio',
    slug: 'glow-beauty-studio',
    description: 'Hair, nails, and skincare - in-studio or at your place.',
    category: 'Beauty',
    website: 'https://glow-beauty-studio.example.com',
    phone: '+380441234502',
    email: 'contact@glow-beauty-studio.example.com',
    status: 'published',
    isRemoteSupported: true,
    city: 'Lviv',
    address: '5 Rynok Square',
    createdByUserId: uid('owner.beauty@example.com'),
  });

  const fitnessId = await insertQualified('companies_schema', 'companies', {
    name: 'Fresh Start Fitness',
    slug: 'fresh-start-fitness',
    description: 'Personal training studio - opening soon.',
    category: 'Fitness',
    website: null,
    phone: null,
    email: null,
    status: 'draft',
    isRemoteSupported: false,
    city: 'Odesa',
    address: null,
    createdByUserId: uid('owner.fitness@example.com'),
  });

  const spaId = await insertQualified('companies_schema', 'companies', {
    name: 'Old Town Spa',
    slug: 'old-town-spa',
    description: 'Spa and massage salon.',
    category: 'Spa',
    website: null,
    phone: '+380441234504',
    email: 'contact@old-town-spa.example.com',
    status: 'suspended',
    isRemoteSupported: false,
    city: 'Kharkiv',
    address: '3 Sumska St',
    createdByUserId: uid('owner.spa@example.com'),
  });
  console.log('[fill_dump_db] created 4 companies (draft, published x2, suspended)');

  // ---------------------------------------------------------------------
  // Company members - OWNER + MANAGER roles, ACTIVE + REMOVED statuses
  // ---------------------------------------------------------------------
  await insertQualified('company_members_schema', 'company_members', { companyId: dentalId, userId: uid('owner.dental@example.com'), role: 'owner', status: 'active' });
  await insertQualified('company_members_schema', 'company_members', { companyId: dentalId, userId: uid('manager.dental@example.com'), role: 'manager', status: 'active' });
  await insertQualified('company_members_schema', 'company_members', { companyId: beautyId, userId: uid('owner.beauty@example.com'), role: 'owner', status: 'active' });
  await insertQualified('company_members_schema', 'company_members', {
    companyId: beautyId,
    userId: uid('member.beauty.removed@example.com'),
    role: 'manager',
    status: 'removed',
  });
  await insertQualified('company_members_schema', 'company_members', { companyId: fitnessId, userId: uid('owner.fitness@example.com'), role: 'owner', status: 'active' });
  await insertQualified('company_members_schema', 'company_members', { companyId: spaId, userId: uid('owner.spa@example.com'), role: 'owner', status: 'active' });
  console.log('[fill_dump_db] created 6 company members');

  // auth-service membership projection (active company members only)
  await insertQualified('auth_schema', 'auth_membership_projection', {
    userId: uid('owner.dental@example.com'),
    companyId: dentalId,
    role: 'owner',
  });
  await insertQualified('auth_schema', 'auth_membership_projection', {
    userId: uid('manager.dental@example.com'),
    companyId: dentalId,
    role: 'manager',
  });
  await insertQualified('auth_schema', 'auth_membership_projection', {
    userId: uid('owner.beauty@example.com'),
    companyId: beautyId,
    role: 'owner',
  });
  await insertQualified('auth_schema', 'auth_membership_projection', {
    userId: uid('owner.fitness@example.com'),
    companyId: fitnessId,
    role: 'owner',
  });
  await insertQualified('auth_schema', 'auth_membership_projection', {
    userId: uid('owner.spa@example.com'),
    companyId: spaId,
    role: 'owner',
  });
  console.log('[fill_dump_db] created 5 auth membership projections');

  // ---------------------------------------------------------------------
  // Specialist profiles - one of each SpecialistProfileStatus
  // ---------------------------------------------------------------------
  const olenaId = await insertQualified('specialists_schema', 'specialist_profiles', {
    userId: uid('specialist.olena@example.com'),
    displayName: 'Dr. Olena Kovalenko',
    headline: 'General & cosmetic dentistry',
    bio: 'Dentist, 8 years of experience.',
    category: 'Dental',
    city: 'Kyiv',
    isRemoteSupported: false,
    status: 'published',
  });
  const ihorId = await insertQualified('specialists_schema', 'specialist_profiles', {
    userId: uid('specialist.ihor@example.com'),
    displayName: 'Dr. Ihor Sydorenko',
    headline: 'Orthodontist',
    bio: 'Orthodontist.',
    category: 'Dental',
    city: 'Kyiv',
    isRemoteSupported: false,
    status: 'published',
  });
  const ninaId = await insertQualified('specialists_schema', 'specialist_profiles', {
    userId: uid('specialist.nina@example.com'),
    displayName: 'Nina Tkachenko',
    headline: 'Hair stylist & colorist',
    bio: 'Hair stylist and colorist.',
    category: 'Beauty',
    city: 'Lviv',
    isRemoteSupported: true,
    status: 'published',
  });
  const pavloId = await insertQualified('specialists_schema', 'specialist_profiles', {
    userId: uid('specialist.pavlo@example.com'),
    displayName: 'Pavlo Rud',
    headline: 'Personal trainer',
    bio: 'Personal trainer.',
    category: 'Fitness',
    city: 'Odesa',
    isRemoteSupported: false,
    status: 'draft',
  });
  const kateId = await insertQualified('specialists_schema', 'specialist_profiles', {
    userId: uid('specialist.kate@example.com'),
    displayName: 'Kateryna Bila',
    headline: 'Massage therapist',
    bio: 'Massage therapist.',
    category: 'Spa',
    city: 'Kyiv',
    isRemoteSupported: false,
    status: 'suspended',
  });
  console.log('[fill_dump_db] created 5 specialist profiles (draft, published x3, suspended)');

  // ---------------------------------------------------------------------
  // Company <-> specialist requests - one of each CompanySpecialistRequestStatus
  // ---------------------------------------------------------------------
  await insertQualified('company_specialists_schema', 'company_specialist_requests', {
    companyId: dentalId,
    specialistProfileId: olenaId,
    requestedByUserId: uid('owner.dental@example.com'),
    status: 'accepted',
    message: 'Would love to have you join our clinic.',
    respondedAt: daysFromNow(-60),
    createdAt: daysFromNow(-62),
  });
  await insertQualified('company_specialists_schema', 'company_specialist_requests', {
    companyId: dentalId,
    specialistProfileId: ihorId,
    requestedByUserId: uid('owner.dental@example.com'),
    status: 'pending',
    message: 'We have an opening for an orthodontist.',
    respondedAt: null,
  });
  await insertQualified('company_specialists_schema', 'company_specialist_requests', {
    companyId: spaId,
    specialistProfileId: ihorId,
    requestedByUserId: uid('owner.spa@example.com'),
    status: 'rejected',
    message: 'Interested in joining our spa?',
    respondedAt: daysFromNow(-30),
    createdAt: daysFromNow(-33),
  });
  await insertQualified('company_specialists_schema', 'company_specialist_requests', {
    companyId: beautyId,
    specialistProfileId: ninaId,
    requestedByUserId: uid('owner.beauty@example.com'),
    status: 'accepted',
    message: 'Join Glow Beauty Studio!',
    respondedAt: daysFromNow(-45),
    createdAt: daysFromNow(-47),
  });
  await insertQualified('company_specialists_schema', 'company_specialist_requests', {
    companyId: beautyId,
    specialistProfileId: kateId,
    requestedByUserId: uid('owner.beauty@example.com'),
    status: 'accepted',
    message: 'We need a massage therapist.',
    respondedAt: daysFromNow(-90),
    createdAt: daysFromNow(-92),
  });
  await insertQualified('company_specialists_schema', 'company_specialist_requests', {
    companyId: dentalId,
    specialistProfileId: kateId,
    requestedByUserId: uid('owner.dental@example.com'),
    status: 'accepted',
    message: 'Occasional massage slot for patients.',
    respondedAt: daysFromNow(-120),
    createdAt: daysFromNow(-123),
  });
  await insertQualified('company_specialists_schema', 'company_specialist_requests', {
    companyId: fitnessId,
    specialistProfileId: pavloId,
    requestedByUserId: uid('owner.fitness@example.com'),
    status: 'cancelled',
    message: 'Would you like to run our training sessions?',
    respondedAt: daysFromNow(-5),
    createdAt: daysFromNow(-8),
  });
  console.log('[fill_dump_db] created 7 company specialist requests (pending, accepted x4, rejected, cancelled)');

  // ---------------------------------------------------------------------
  // Company <-> specialist relationships - one of each CompanySpecialistStatus
  // ---------------------------------------------------------------------
  await insertQualified('company_specialists_schema', 'company_specialists', {
    companyId: dentalId,
    specialistProfileId: olenaId,
    status: 'active',
    startedAt: daysFromNow(-60),
    endedAt: null,
  });
  await insertQualified('company_specialists_schema', 'company_specialists', {
    companyId: beautyId,
    specialistProfileId: ninaId,
    status: 'active',
    startedAt: daysFromNow(-45),
    endedAt: null,
  });
  await insertQualified('company_specialists_schema', 'company_specialists', {
    companyId: beautyId,
    specialistProfileId: kateId,
    status: 'paused',
    startedAt: daysFromNow(-90),
    endedAt: null,
  });
  await insertQualified('company_specialists_schema', 'company_specialists', {
    companyId: dentalId,
    specialistProfileId: kateId,
    status: 'removed',
    startedAt: daysFromNow(-120),
    endedAt: daysFromNow(-10),
  });
  console.log('[fill_dump_db] created 4 company specialists (active x2, paused, removed)');

  // ---------------------------------------------------------------------
  // Services - one of each ServiceStatus
  // ---------------------------------------------------------------------
  const teethCleaningId = await insertQualified('services_schema', 'services', {
    companyId: dentalId,
    name: 'Teeth Cleaning',
    description: 'Professional dental cleaning.',
    category: 'Dental',
    durationMinutes: 30,
    price: '25.00',
    status: 'published',
  });
  const teethWhiteningId = await insertQualified('services_schema', 'services', {
    companyId: dentalId,
    name: 'Teeth Whitening',
    description: 'In-office whitening treatment.',
    category: 'Dental',
    durationMinutes: 60,
    price: '80.00',
    status: 'published',
  });
  await insertQualified('services_schema', 'services', {
    companyId: dentalId,
    name: 'Root Canal Treatment',
    description: 'Not yet published while we finalize pricing.',
    category: 'Dental',
    durationMinutes: 90,
    price: '150.00',
    status: 'draft',
  });
  const haircutId = await insertQualified('services_schema', 'services', {
    companyId: beautyId,
    name: 'Haircut & Styling',
    description: 'Wash, cut, and style.',
    category: 'Beauty',
    durationMinutes: 45,
    price: '20.00',
    status: 'published',
  });
  const manicureId = await insertQualified('services_schema', 'services', {
    companyId: beautyId,
    name: 'Manicure',
    description: 'Classic manicure.',
    category: 'Beauty',
    durationMinutes: 40,
    price: '15.00',
    status: 'published',
  });
  await insertQualified('services_schema', 'services', {
    companyId: beautyId,
    name: 'Relaxation Massage',
    description: 'Suspended while our massage therapist is on leave.',
    category: 'Beauty',
    durationMinutes: 60,
    price: '35.00',
    status: 'suspended',
  });
  await insertQualified('services_schema', 'services', {
    companyId: fitnessId,
    name: 'Personal Training Session',
    description: 'One-on-one training - part of the draft catalog.',
    category: 'Fitness',
    durationMinutes: 60,
    price: '30.00',
    status: 'draft',
  });
  console.log('[fill_dump_db] created 7 services (draft x2, published x4, suspended)');

  // ---------------------------------------------------------------------
  // Service <-> specialist assignments
  // ---------------------------------------------------------------------
  await insertQualified('services_schema', 'service_specialists', { serviceId: teethCleaningId, companyId: dentalId, specialistProfileId: olenaId });
  await insertQualified('services_schema', 'service_specialists', { serviceId: teethWhiteningId, companyId: dentalId, specialistProfileId: olenaId });
  await insertQualified('services_schema', 'service_specialists', { serviceId: haircutId, companyId: beautyId, specialistProfileId: ninaId });
  await insertQualified('services_schema', 'service_specialists', { serviceId: manicureId, companyId: beautyId, specialistProfileId: ninaId });
  console.log('[fill_dump_db] created 4 service specialist assignments');

  // ---------------------------------------------------------------------
  // Appointments-service projections (normally fed by RabbitMQ events).
  // Direct SQL seed must mirror them or POST /appointments returns 404 and
  // booking/management UIs see empty specialist lists.
  // ---------------------------------------------------------------------
  await insertRow('appointments_schema', 'appointment_company_projection', {
    companyId: dentalId,
    name: 'Bright Smile Dental',
  });
  await insertRow('appointments_schema', 'appointment_company_projection', {
    companyId: beautyId,
    name: 'Glow Beauty Studio',
  });
  await insertRow('appointments_schema', 'appointment_membership_projection', {
    companyId: dentalId,
    userId: uid('owner.dental@example.com'),
    role: 'owner',
  });
  await insertRow('appointments_schema', 'appointment_membership_projection', {
    companyId: dentalId,
    userId: uid('manager.dental@example.com'),
    role: 'manager',
  });
  await insertRow('appointments_schema', 'appointment_membership_projection', {
    companyId: beautyId,
    userId: uid('owner.beauty@example.com'),
    role: 'owner',
  });
  await insertRow('appointments_schema', 'appointment_service_projection', {
    serviceId: teethCleaningId,
    companyId: dentalId,
    name: 'Teeth Cleaning',
    status: 'published',
  });
  await insertRow('appointments_schema', 'appointment_service_projection', {
    serviceId: teethWhiteningId,
    companyId: dentalId,
    name: 'Teeth Whitening',
    status: 'published',
  });
  await insertRow('appointments_schema', 'appointment_service_projection', {
    serviceId: haircutId,
    companyId: beautyId,
    name: 'Haircut & Styling',
    status: 'published',
  });
  await insertRow('appointments_schema', 'appointment_service_projection', {
    serviceId: manicureId,
    companyId: beautyId,
    name: 'Manicure',
    status: 'published',
  });
  await insertRow('appointments_schema', 'appointment_service_specialist_projection', {
    serviceId: teethCleaningId,
    specialistProfileId: olenaId,
  });
  await insertRow('appointments_schema', 'appointment_service_specialist_projection', {
    serviceId: teethWhiteningId,
    specialistProfileId: olenaId,
  });
  await insertRow('appointments_schema', 'appointment_service_specialist_projection', {
    serviceId: haircutId,
    specialistProfileId: ninaId,
  });
  await insertRow('appointments_schema', 'appointment_service_specialist_projection', {
    serviceId: manicureId,
    specialistProfileId: ninaId,
  });
  console.log('[fill_dump_db] created appointments-service projections (companies, memberships, services, assignments)');

  // ---------------------------------------------------------------------
  // Appointments - one of each AppointmentStatus (3x completed: 2 reviewed, 1 not)
  // ---------------------------------------------------------------------
  const pendingAppointmentId = await insertQualified('appointments_schema', 'appointments', {
    companyId: dentalId,
    serviceId: teethCleaningId,
    specialistProfileId: olenaId,
    clientUserId: uid('client.andriy@example.com'),
    requestedStartAt: daysFromNow(3),
    status: 'pending',
    notes: 'First visit, please call to confirm.',
    respondedAt: null,
    completedAt: null,
  });
  const approvedAppointmentId = await insertQualified('appointments_schema', 'appointments', {
    companyId: dentalId,
    serviceId: teethWhiteningId,
    specialistProfileId: olenaId,
    clientUserId: uid('client.iryna@example.com'),
    requestedStartAt: daysFromNow(5),
    status: 'approved',
    notes: null,
    respondedAt: daysFromNow(-1),
    completedAt: null,
  });
  const rejectedAppointmentId = await insertQualified('appointments_schema', 'appointments', {
    companyId: beautyId,
    serviceId: haircutId,
    specialistProfileId: ninaId,
    clientUserId: uid('client.taras@example.com'),
    requestedStartAt: daysFromNow(2),
    status: 'rejected',
    notes: null,
    respondedAt: daysFromNow(-1),
    completedAt: null,
  });
  const cancelledAppointmentId = await insertQualified('appointments_schema', 'appointments', {
    companyId: beautyId,
    serviceId: manicureId,
    specialistProfileId: ninaId,
    clientUserId: uid('client.andriy@example.com'),
    requestedStartAt: daysFromNow(4),
    status: 'cancelled',
    notes: 'Client cancelled - change of plans.',
    respondedAt: null,
    completedAt: null,
  });
  const completedReviewedAppointment1Id = await insertQualified('appointments_schema', 'appointments', {
    companyId: dentalId,
    serviceId: teethCleaningId,
    specialistProfileId: olenaId,
    clientUserId: uid('client.iryna@example.com'),
    requestedStartAt: daysFromNow(-10),
    status: 'completed',
    notes: null,
    respondedAt: daysFromNow(-10),
    completedAt: daysFromNow(-10),
    createdAt: daysFromNow(-12),
  });
  const completedReviewedAppointment2Id = await insertQualified('appointments_schema', 'appointments', {
    companyId: beautyId,
    serviceId: manicureId,
    specialistProfileId: ninaId,
    clientUserId: uid('client.taras@example.com'),
    requestedStartAt: daysFromNow(-7),
    status: 'completed',
    notes: null,
    respondedAt: daysFromNow(-7),
    completedAt: daysFromNow(-7),
    createdAt: daysFromNow(-9),
  });
  const completedUnreviewedAppointmentId = await insertQualified('appointments_schema', 'appointments', {
    companyId: dentalId,
    serviceId: teethWhiteningId,
    specialistProfileId: olenaId,
    clientUserId: uid('client.andriy@example.com'),
    requestedStartAt: daysFromNow(-3),
    status: 'completed',
    notes: null,
    respondedAt: daysFromNow(-3),
    completedAt: daysFromNow(-3),
    createdAt: daysFromNow(-5),
  });
  console.log('[fill_dump_db] created 7 appointments (pending, approved, rejected, cancelled, completed x3)');

  // ---------------------------------------------------------------------
  // Per-domain status history (microservice schemas)
  // ---------------------------------------------------------------------
  await insertQualified('appointments_schema', 'appointment_status_history', {
    appointmentId: approvedAppointmentId,
    fromStatus: 'pending',
    toStatus: 'approved',
    changedByUserId: uid('manager.dental@example.com'),
    reason: null,
  });
  await insertQualified('appointments_schema', 'appointment_status_history', {
    appointmentId: rejectedAppointmentId,
    fromStatus: 'pending',
    toStatus: 'rejected',
    changedByUserId: uid('owner.beauty@example.com'),
    reason: 'Fully booked that day.',
  });
  await insertQualified('appointments_schema', 'appointment_status_history', {
    appointmentId: cancelledAppointmentId,
    fromStatus: 'pending',
    toStatus: 'cancelled',
    changedByUserId: uid('client.andriy@example.com'),
    reason: 'Change of plans.',
  });
  await insertQualified('appointments_schema', 'appointment_status_history', {
    appointmentId: completedReviewedAppointment1Id,
    fromStatus: 'approved',
    toStatus: 'completed',
    changedByUserId: uid('owner.dental@example.com'),
    reason: null,
  });
  await insertQualified('appointments_schema', 'appointment_status_history', {
    appointmentId: completedReviewedAppointment2Id,
    fromStatus: 'approved',
    toStatus: 'completed',
    changedByUserId: uid('owner.beauty@example.com'),
    reason: null,
  });
  await insertQualified('appointments_schema', 'appointment_status_history', {
    appointmentId: completedUnreviewedAppointmentId,
    fromStatus: 'approved',
    toStatus: 'completed',
    changedByUserId: uid('owner.dental@example.com'),
    reason: null,
  });
  await insertQualified('companies_schema', 'company_status_history', {
    companyId: dentalId,
    fromStatus: 'draft',
    toStatus: 'published',
    changedByUserId: uid('owner.dental@example.com'),
    reason: null,
  });
  await insertQualified('companies_schema', 'company_status_history', {
    companyId: spaId,
    fromStatus: 'published',
    toStatus: 'suspended',
    changedByUserId: null,
    reason: 'Policy violation - suspended pending review.',
  });
  await insertQualified('specialists_schema', 'specialist_status_history', {
    specialistProfileId: olenaId,
    fromStatus: 'draft',
    toStatus: 'published',
    changedByUserId: uid('specialist.olena@example.com'),
    reason: null,
  });
  await insertQualified('specialists_schema', 'specialist_status_history', {
    specialistProfileId: kateId,
    fromStatus: 'published',
    toStatus: 'suspended',
    changedByUserId: null,
    reason: 'Suspended pending investigation.',
  });
  await insertQualified('services_schema', 'service_status_history', {
    serviceId: manicureId,
    fromStatus: 'draft',
    toStatus: 'published',
    changedByUserId: uid('owner.beauty@example.com'),
    reason: null,
  });
  console.log('[fill_dump_db] created 11 status history rows (appointment, company, specialist, service)');

  // ---------------------------------------------------------------------
  // Reviews - one per reviewed completed appointment
  // ---------------------------------------------------------------------
  const review1Id = await insertQualified('reviews_schema', 'reviews', {
    appointmentId: completedReviewedAppointment1Id,
    companyId: dentalId,
    serviceId: teethCleaningId,
    specialistProfileId: olenaId,
    clientUserId: uid('client.iryna@example.com'),
    rating: 5,
    comment: 'Excellent service, very gentle and professional!',
    createdAt: daysFromNow(-9),
  });
  await insertQualified('reviews_schema', 'reviews', {
    appointmentId: completedReviewedAppointment2Id,
    companyId: beautyId,
    serviceId: manicureId,
    specialistProfileId: ninaId,
    clientUserId: uid('client.taras@example.com'),
    rating: 4,
    comment: 'Great job, will come back.',
    createdAt: daysFromNow(-6),
  });
  console.log('[fill_dump_db] created 2 reviews');

  // ---------------------------------------------------------------------
  // Notifications - one per NotificationType
  // ---------------------------------------------------------------------
  await insertQualified('notifications_schema', 'notifications', {
    userId: uid('owner.dental@example.com'),
    type: 'appointment.requested',
    title: 'New appointment request',
    body: 'Andriy Moroz requested Teeth Cleaning.',
    metadata: { appointmentId: pendingAppointmentId, companyId: dentalId, serviceId: teethCleaningId },
    isRead: true,
    readAt: daysFromNow(-1),
  });
  await insertQualified('notifications_schema', 'notifications', {
    userId: uid('client.iryna@example.com'),
    type: 'appointment.approved',
    title: 'Your appointment was approved',
    body: 'Teeth Whitening at Bright Smile Dental was approved.',
    metadata: { appointmentId: approvedAppointmentId, companyId: dentalId, serviceId: teethWhiteningId },
    isRead: true,
    readAt: daysFromNow(-1),
  });
  await insertQualified('notifications_schema', 'notifications', {
    userId: uid('client.taras@example.com'),
    type: 'appointment.rejected',
    title: 'Your appointment was rejected',
    body: 'Haircut & Styling at Glow Beauty Studio was rejected: Fully booked that day.',
    metadata: { appointmentId: rejectedAppointmentId, companyId: beautyId, serviceId: haircutId },
    isRead: false,
    readAt: null,
  });
  await insertQualified('notifications_schema', 'notifications', {
    userId: uid('owner.beauty@example.com'),
    type: 'appointment.cancelled',
    title: 'An appointment was cancelled',
    body: 'Andriy Moroz cancelled their Manicure appointment.',
    metadata: { appointmentId: cancelledAppointmentId, companyId: beautyId, serviceId: manicureId },
    isRead: false,
    readAt: null,
  });
  await insertQualified('notifications_schema', 'notifications', {
    userId: uid('client.andriy@example.com'),
    type: 'appointment.completed',
    title: 'Your appointment is complete',
    body: 'Teeth Whitening at Bright Smile Dental is complete. Leave a review?',
    metadata: { appointmentId: completedUnreviewedAppointmentId, companyId: dentalId, serviceId: teethWhiteningId },
    isRead: false,
    readAt: null,
  });
  await insertQualified('notifications_schema', 'notifications', {
    userId: uid('owner.dental@example.com'),
    type: 'review.received',
    title: 'You received a new review',
    body: 'Iryna Vovk left a 5-star review for Teeth Cleaning.',
    metadata: { reviewId: review1Id, companyId: dentalId, serviceId: teethCleaningId, rating: 5 },
    isRead: true,
    readAt: daysFromNow(-8),
  });
  await insertQualified('notifications_schema', 'notifications', {
    userId: uid('owner.dental@example.com'),
    type: 'company.rating_updated',
    title: "Your company's rating was updated",
    body: 'Bright Smile Dental average rating: 4.8/5 (was 4.6/5).',
    metadata: { companyId: dentalId, averageRating: 4.8, previousAverageRating: 4.6 },
    isRead: false,
    readAt: null,
  });
  console.log('[fill_dump_db] created 7 notifications (one per NotificationType)');

  // ---------------------------------------------------------------------
  // Email logs - simulated sends matching a few of the notifications above
  // ---------------------------------------------------------------------
  await insertQualified('notifications_schema', 'email_logs', {
    toEmail: 'owner.dental@example.com',
    subject: 'New appointment request - Bright Smile Dental',
    body: 'Andriy Moroz requested Teeth Cleaning on ' + daysFromNow(3).toDateString() + '.',
    eventType: 'appointment.requested',
    eventId: pendingAppointmentId,
  });
  await insertQualified('notifications_schema', 'email_logs', {
    toEmail: 'client.iryna@example.com',
    subject: 'Your appointment was approved',
    body: 'Your Teeth Whitening appointment at Bright Smile Dental was approved.',
    eventType: 'appointment.approved',
    eventId: approvedAppointmentId,
  });
  await insertQualified('notifications_schema', 'email_logs', {
    toEmail: 'client.taras@example.com',
    subject: 'Your appointment was rejected',
    body: 'Your Haircut & Styling appointment at Glow Beauty Studio was rejected: Fully booked that day.',
    eventType: 'appointment.rejected',
    eventId: rejectedAppointmentId,
  });
  await insertQualified('notifications_schema', 'email_logs', {
    toEmail: 'owner.dental@example.com',
    subject: 'You received a new review',
    body: 'Iryna Vovk left a 5-star review for Teeth Cleaning: "Excellent service, very gentle and professional!"',
    eventType: 'review.received',
    eventId: review1Id,
  });
  console.log('[fill_dump_db] created 4 email logs');
}
