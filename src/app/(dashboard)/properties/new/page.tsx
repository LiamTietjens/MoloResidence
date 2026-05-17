'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function NewPropertyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !address.trim()) {
      toast.error('Name and address are required.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('properties')
      .insert({ name: name.trim(), address: address.trim() });

    if (error) {
      toast.error(`Failed to create property: ${error.message}`);
      setSubmitting(false);
      return;
    }

    toast.success('Property created');
    router.push('/properties');
  }

  return (
    <div className="max-w-lg space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New Property</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Property name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Full address"
            required
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Property'}
          </Button>
          <Button variant="outline" render={<Link href="/properties" />}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
