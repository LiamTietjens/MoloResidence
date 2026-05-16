'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';

const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  kwhotel_hotel_id: z.string().optional(),
  transfer_phone: z.string().optional(),
  aliases: z.string().optional(),
  language_default: z.enum(['en', 'pl']),
  timezone: z.string().min(1),
  notes: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface Property {
  id: string;
  name: string;
  address: string;
  kwhotel_hotel_id: number | null;
  transfer_phone: string | null;
  aliases: string[] | null;
  language_default: string | null;
  timezone: string | null;
  notes: string | null;
}

const TIMEZONES = [
  'Europe/Warsaw',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Amsterdam',
  'Europe/Prague',
  'Europe/Vienna',
  'UTC',
];

export default function PropertyDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: '',
      address: '',
      kwhotel_hotel_id: '',
      transfer_phone: '',
      aliases: '',
      language_default: 'en',
      timezone: 'Europe/Warsaw',
      notes: '',
    },
  });

  const languageDefault = watch('language_default');
  const timezone = watch('timezone');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchProperty() {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Property not found');
        router.push('/properties');
        return;
      }

      setProperty(data);
      reset({
        name: data.name || '',
        address: data.address || '',
        kwhotel_hotel_id: data.kwhotel_hotel_id?.toString() || '',
        transfer_phone: data.transfer_phone || '',
        aliases: Array.isArray(data.aliases) ? data.aliases.join(', ') : '',
        language_default: data.language_default === 'pl' ? 'pl' : 'en',
        timezone: data.timezone || 'Europe/Warsaw',
        notes: data.notes || '',
      });
      setLoading(false);
    }

    fetchProperty();
  }, [id, router, reset]);

  async function onSubmit(data: PropertyFormData) {
    if (!id) return;

    const aliasesArray = data.aliases
      ? data.aliases.split(',').map((a) => a.trim()).filter(Boolean)
      : [];

    const { error } = await supabase
      .from('properties')
      .update({
        name: data.name,
        address: data.address,
        kwhotel_hotel_id: data.kwhotel_hotel_id ? parseInt(data.kwhotel_hotel_id, 10) : null,
        transfer_phone: data.transfer_phone || null,
        aliases: aliasesArray,
        language_default: data.language_default || 'en',
        timezone: data.timezone || 'Europe/Warsaw',
        notes: data.notes || null,
      })
      .eq('id', id);

    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      return;
    }

    toast.success('Property updated successfully');
    router.push('/properties');
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);

    const { error } = await supabase.from('properties').delete().eq('id', id);

    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      setDeleting(false);
      return;
    }

    toast.success('Property deleted');
    router.push('/properties');
  }

  if (!id) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Card className="p-8 text-center text-destructive">
          No property ID provided. Please select a property from the list.
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Edit Property</h1>
        </div>
        <Card className="p-8 text-center text-muted-foreground">Loading...</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Property</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="Property name" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" {...register('address')} placeholder="Full address" />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="kwhotel_hotel_id">KW Hotel ID</Label>
            <Input
              id="kwhotel_hotel_id"
              type="number"
              {...register('kwhotel_hotel_id')}
              placeholder="Optional numeric ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer_phone">Transfer Phone</Label>
            <Input
              id="transfer_phone"
              {...register('transfer_phone')}
              placeholder="+48..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aliases">Aliases</Label>
            <Input
              id="aliases"
              {...register('aliases')}
              placeholder="Alt name 1, Alt name 2, ..."
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated alternative names guests might use.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Language Default *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="en"
                  checked={languageDefault === 'en'}
                  onChange={() => setValue('language_default', 'en')}
                  className="accent-primary"
                />
                <span className="text-sm">English</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="pl"
                  checked={languageDefault === 'pl'}
                  onChange={() => setValue('language_default', 'pl')}
                  className="accent-primary"
                />
                <span className="text-sm">Polish</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={timezone}
              onValueChange={(val) => setValue('timezone', val ?? 'Europe/Warsaw')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Internal notes about this property..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" render={<Link href="/properties" />}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger
                render={<Button variant="destructive" type="button" />}
              >
                Delete
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Property</DialogTitle>
                  <DialogDescription>
                    This will permanently delete this property and all associated
                    knowledge bases. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete Property'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </form>
      </Card>
    </div>
  );
}
