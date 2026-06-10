import { createServerClient } from '@/backend/supabase';
import type { Tables } from '@/backend/types';
import { BookingLinksTable } from './booking-links-client';

export const dynamic = 'force-dynamic';

type BookingLink = Tables<'booking_links'>;

export default async function BookingLinksPage() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('booking_links')
    .select('*')
    .order('sent_at', { ascending: false });

  const links = (data ?? []) as BookingLink[];

  return <BookingLinksTable links={links} />;
}
