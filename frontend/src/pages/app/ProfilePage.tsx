import { useAuth } from '@/features/auth/model/useAuth';
import { ProfileForm } from '@/features/profile/ui/ProfileForm';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <ProfileForm
      authDefaults={
        user
          ? {
              name: user.name,
              email: user.email,
              phone: user.phone,
              city: user.city,
              bio: user.bio,
            }
          : undefined
      }
    />
  );
}
