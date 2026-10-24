const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { Calendar, Clock, Loader2, MapPin, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HANDOVER_PLACES } from '@/lib/status';
import { extractError } from '@/lib/errors';

const today = () => new Date().toISOString().slice(0, 10);

/** Only the finder of the case may schedule or update the handover. */
export default function HandoverForm({ recoveryCase, handover, onSaved }) {
  const [location, setLocation] = useState(handover?.location || '');
  const [date, setDate] = useState(handover?.handover_date || today());
  const [time, setTime] = useState(handover?.handover_time || '10:00');
  const [instructions, setInstructions] = useState(handover?.instructions || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (event) => {
    event.preventDefault();
    if (location.trim().length < 3) return setError('Please enter the handover location.');
    setSaving(true);
    setError('');
    try {
      const res = await db.functions.invoke('setHandoverDetails', {
        case_id: recoveryCase.id,
        location,
        handover_date: date,
        handover_time: time,
        instructions,
      });
      if (res.data?.error) throw new Error(res.data.error);
      onSaved?.(res.data?.handover);
    } catch (err) {
      setError(extractError(err, 'The handover details could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="fb-card space-y-4 p-5">
      <div>
        <h3 className="font-display text-base font-semibold text-foreground">
          {handover ? 'Update the handover plan' : 'Set the handover plan'}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Choose a safe, public and accessible place. A security desk, reception or help counter is ideal — a private home
          address is never needed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="handover_location">Handover location</Label>
          <Input
            id="handover_location"
            list="handover_places"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. College security desk, main gate"
            className="mt-1.5"
            required
          />
          <datalist id="handover_places">
            {HANDOVER_PLACES.map((place) => (
              <option key={place} value={place} />
            ))}
          </datalist>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> Suggestions: {HANDOVER_PLACES.slice(0, 4).join(' · ')}
          </p>
        </div>
        <div>
          <Label htmlFor="handover_date">Handover date</Label>
          <Input
            id="handover_date"
            type="date"
            value={date}
            min={today()}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1.5"
            required
          />
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" /> Today or later
          </p>
        </div>
        <div>
          <Label htmlFor="handover_time">Handover time</Label>
          <Input
            id="handover_time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="mt-1.5"
            required
          />
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> Local time
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="handover_instructions">Instructions for the owner (optional)</Label>
          <Textarea
            id="handover_instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={3}
            placeholder="e.g. Ask for me at the front desk — my shift ends at 6 PM."
            className="mt-1.5"
          />
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      <Button type="submit" disabled={saving} className="fb-gradient text-white">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        {handover ? 'Save handover changes' : 'Save handover details'}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        The owner is notified straight away. Only you, the finder of this case, can change these details.
      </p>
    </form>
  );
}