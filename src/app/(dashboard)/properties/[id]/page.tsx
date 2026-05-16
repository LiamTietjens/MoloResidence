import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { EditPropertyForm } from './edit-property-form';

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !property) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Property</h1>
      </div>

      <EditPropertyForm property={property} />
    </div>
  );
}
