'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export async function createProperty(formData: FormData) {
  const name = formData.get('name') as string;
  const address = formData.get('address') as string;
  const kwhotel_hotel_id = formData.get('kwhotel_hotel_id') as string;
  const transfer_phone = formData.get('transfer_phone') as string;
  const aliases = formData.get('aliases') as string;
  const language_default = formData.get('language_default') as string;
  const timezone = formData.get('timezone') as string;
  const notes = formData.get('notes') as string;

  const aliasesArray = aliases
    ? aliases.split(',').map((a) => a.trim()).filter(Boolean)
    : [];

  const { error } = await supabase.from('properties').insert({
    name,
    address,
    kwhotel_hotel_id: kwhotel_hotel_id ? parseInt(kwhotel_hotel_id, 10) : null,
    transfer_phone: transfer_phone || null,
    aliases: aliasesArray,
    language_default: language_default || 'en',
    timezone: timezone || 'Europe/Warsaw',
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/properties');
  redirect('/properties');
}

export async function updateProperty(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const address = formData.get('address') as string;
  const kwhotel_hotel_id = formData.get('kwhotel_hotel_id') as string;
  const transfer_phone = formData.get('transfer_phone') as string;
  const aliases = formData.get('aliases') as string;
  const language_default = formData.get('language_default') as string;
  const timezone = formData.get('timezone') as string;
  const notes = formData.get('notes') as string;

  const aliasesArray = aliases
    ? aliases.split(',').map((a) => a.trim()).filter(Boolean)
    : [];

  const { error } = await supabase
    .from('properties')
    .update({
      name,
      address,
      kwhotel_hotel_id: kwhotel_hotel_id ? parseInt(kwhotel_hotel_id, 10) : null,
      transfer_phone: transfer_phone || null,
      aliases: aliasesArray,
      language_default: language_default || 'en',
      timezone: timezone || 'Europe/Warsaw',
      notes: notes || null,
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/properties');
  revalidatePath(`/properties/${id}`);
  redirect('/properties');
}

export async function deleteProperty(id: string) {
  const { error } = await supabase.from('properties').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/properties');
  redirect('/properties');
}
