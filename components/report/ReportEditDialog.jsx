const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PhotoUpload from '@/components/report/PhotoUpload';
import { CATEGORIES } from '@/lib/status';
import { extractError } from '@/lib/errors';

/** Editing is only offered while the report is still eligible (never during a claim or handover). */
export default function ReportEditDialog({ open, onOpenChange, report, kind, onSaved }) {
  const isLost = kind === 'lost';
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!report || !open) return;
    setValues({
      item_name: report.item_name || '',
      category: report.category || '',
      description: report.description || '',
      color: report.color || '',
      visible_characteristics: report.visible_characteristics || '',
      location: (isLost ? report.lost_location : report.found_location) || '',
      datetime: ((isLost ? report.lost_datetime : report.found_datetime) || '').slice(0, 16),
      notes: (isLost ? report.additional_notes : report.additional_observations) || '',
      secret_detail: '',
      image_file_uri: report.image_file_uri || '',
    });
    setError('');
  }, [report, open, isLost]);

  if (!values) return null;

  const set = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const save = async () => {
    if (values.item_name.trim().length < 2) return setError('Please enter the item name.');
    if (values.description.trim().length < 10) return setError('Please describe the item in at least 10 characters.');
    if (values.location.trim().length < 3) return setError('Please enter the location.');
    if (!values.datetime) return setError('Please enter the date and time.');
    setSaving(true);
    setError('');
    try {
      const res = await db.functions.invoke('updateReport', {
        report_type: kind,
        report_id: report.id,
        item_name: values.item_name,
        category: values.category,
        description: values.description,
        color: values.color,
        visible_characteristics: values.visible_characteristics,
        location: values.location,
        datetime: values.datetime,
        notes: values.notes,
        secret_detail: values.secret_detail,
        image_file_uri: values.image_file_uri,
      });
      if (res.data?.error) throw new Error(res.data.error);
      onSaved?.(res.data?.report);
      onOpenChange(false);
    } catch (err) {
      setError(extractError(err, 'The report could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit report {report.report_code}</DialogTitle>
          <DialogDescription>
            You can edit this report while it has no active claim. Run AI matching again afterwards to refresh the
            comparison.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="edit_item_name">Item name</Label>
            <Input id="edit_item_name" value={values.item_name} onChange={set('item_name')} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="edit_category">Category</Label>
            <Select value={values.category} onValueChange={(value) => setValues((prev) => ({ ...prev, category: value }))}>
              <SelectTrigger id="edit_category" className="mt-1.5">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit_color">Colour</Label>
            <Input id="edit_color" value={values.color} onChange={set('color')} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="edit_description">Description</Label>
            <Textarea id="edit_description" value={values.description} onChange={set('description')} rows={4} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="edit_chars">Visible characteristics</Label>
            <Input id="edit_chars" value={values.visible_characteristics} onChange={set('visible_characteristics')} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="edit_location">{isLost ? 'Lost location' : 'Found location'}</Label>
            <Input id="edit_location" value={values.location} onChange={set('location')} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="edit_datetime">{isLost ? 'Lost date & time' : 'Found date & time'}</Label>
            <Input id="edit_datetime" type="datetime-local" value={values.datetime} onChange={set('datetime')} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="edit_notes">{isLost ? 'Additional notes' : 'Additional observations'}</Label>
            <Textarea id="edit_notes" value={values.notes} onChange={set('notes')} rows={3} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <PhotoUpload value={values.image_file_uri} onChange={(uri) => setValues((prev) => ({ ...prev, image_file_uri: uri }))} />
          </div>
          {isLost && (
            <div className="sm:col-span-2">
              <Label htmlFor="edit_secret">Replace secret ownership detail (optional)</Label>
              <Input
                id="edit_secret"
                value={values.secret_detail}
                onChange={set('secret_detail')}
                placeholder="Leave blank to keep the current detail"
                className="mt-1.5"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Only you and the Global Admin can ever read this value.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="fb-gradient text-white">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}