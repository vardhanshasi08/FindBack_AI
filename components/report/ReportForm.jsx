const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import PhotoUpload from '@/components/report/PhotoUpload';
import { CATEGORIES, MATCH_THRESHOLD } from '@/lib/status';
import { extractError } from '@/lib/errors';

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

const EMPTY = {
  item_name: '',
  category: '',
  description: '',
  color: '',
  visible_characteristics: '',
  location: '',
  datetime: localDateTimeValue(),
  notes: '',
  secret_detail: '',
  image_file_uri: '',
};

export default function ReportForm({ kind }) {
  const isLost = kind === 'lost';
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('idle');
  const [result, setResult] = useState(null);
  const [matching, setMatching] = useState(null);
  const [matchError, setMatchError] = useState('');

  const set = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const validate = () => {
    if (values.item_name.trim().length < 2) return 'Please enter the item name.';
    if (!values.category) return 'Please choose a category.';
    if (values.description.trim().length < 10) return 'Please describe the item in at least 10 characters.';
    if (values.location.trim().length < 3) return `Please enter where the item was ${isLost ? 'lost' : 'found'}.`;
    if (!values.datetime) return `Please enter when the item was ${isLost ? 'lost' : 'found'}.`;
    if (isLost && values.secret_detail.trim().length < 3) {
      return 'Please add a secret ownership detail so ownership can be confirmed at the handover.';
    }
    return '';
  };

  const runMatching = async (reportId) => {
    setStage('matching');
    setMatchError('');
    try {
      const res = await db.functions.invoke('runMatching', { report_type: kind, report_id: reportId });
      setMatching(res.data || null);
      if (res.data?.match_status === 'failed') {
        setMatchError(res.data?.error || 'AI matching did not finish for this report.');
      }
    } catch (err) {
      setMatching(null);
      setMatchError(extractError(err, 'AI matching could not run. You can retry from the report page.'));
    } finally {
      setStage('done');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setStage('submitting');
    try {
      const payload = {
        item_name: values.item_name,
        category: values.category,
        description: values.description,
        color: values.color,
        visible_characteristics: values.visible_characteristics,
        image_file_uri: values.image_file_uri,
        [isLost ? 'lost_location' : 'found_location']: values.location,
        [isLost ? 'lost_datetime' : 'found_datetime']: values.datetime,
        [isLost ? 'additional_notes' : 'additional_observations']: values.notes,
      };
      if (isLost) payload.secret_detail = values.secret_detail;
      const res = await db.functions.invoke(isLost ? 'createLostReport' : 'createFoundReport', payload);
      if (res.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      await runMatching(res.data.report_id);
    } catch (err) {
      setError(extractError(err, 'The report could not be submitted. Please try again.'));
      setStage('idle');
    }
  };

  if (stage === 'done' && result) {
    const evaluated = matching?.evaluated ?? 0;
    const qualifying = matching?.qualifying ?? 0;
    const best = matching?.best_score;
    return (
      <div className="fb-card p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
          {isLost ? 'Lost report' : 'Found report'} submitted
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your report ID is{' '}
          <span className="font-semibold text-foreground">{result.report_code || result.report_id}</span>. It is saved in
          the database and linked to your account.
        </p>

        <div className="mt-5 fb-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-cyan-300" /> AI matching result
          </p>
          {stage === 'done' && matching ? (
            <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <p>
                Compared with <span className="font-medium text-foreground">{evaluated}</span> relevant{' '}
                {isLost ? 'found' : 'lost'} report(s).
              </p>
              <p>
                Best similarity score:{' '}
                <span className="font-medium text-foreground">{best ?? '—'}</span>/100 (threshold{' '}
                {matching.threshold ?? MATCH_THRESHOLD}).
              </p>
              <p>
                {qualifying > 0
                  ? 'A potential match met the threshold. Open Matches to review it and decide whether to request a claim.'
                  : 'No match met the threshold yet. Your report stays active and is compared again whenever someone submits a report in the other direction.'}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {matchError || 'No relevant reports were available to compare yet.'}
            </p>
          )}
          {matchError && (
            <p className="mt-2 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Nothing was marked as matched. You can run
              matching again from the report page.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild className="fb-gradient text-white">
            <Link to="/matches">
              View matches <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/reports">My reports</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setValues(EMPTY);
              setResult(null);
              setMatching(null);
              setMatchError('');
              setStage('idle');
            }}
          >
            Report another item
          </Button>
        </div>
      </div>
    );
  }

  const busy = stage === 'submitting' || stage === 'matching';

  return (
    <form onSubmit={handleSubmit} className="fb-card space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="item_name">{isLost ? 'Item name' : 'Item name or descriptive title'}</Label>
          <Input
            id="item_name"
            value={values.item_name}
            onChange={set('item_name')}
            placeholder={isLost ? 'e.g. Black iPhone 13 in a blue case' : 'e.g. Black mobile phone found on a bench'}
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={values.category} onValueChange={(value) => setValues((prev) => ({ ...prev, category: value }))}>
            <SelectTrigger id="category" className="mt-1.5">
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
          <Label htmlFor="color">Colour</Label>
          <Input id="color" value={values.color} onChange={set('color')} placeholder="e.g. Black with a red strap" className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={values.description}
            onChange={set('description')}
            rows={4}
            placeholder="Describe the item: brand, size, material and anything visible on it."
            className="mt-1.5"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="visible_characteristics">Visible characteristics</Label>
          <Input
            id="visible_characteristics"
            value={values.visible_characteristics}
            onChange={set('visible_characteristics')}
            placeholder="e.g. Cracked bottom-left corner, sticker with a logo"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="location">{isLost ? 'Lost location' : 'Found location'}</Label>
          <Input
            id="location"
            value={values.location}
            onChange={set('location')}
            placeholder={isLost ? 'e.g. College library block C' : 'e.g. Bench outside the main gate'}
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="datetime">{isLost ? 'Approximate lost date & time' : 'Approximate found date & time'}</Label>
          <Input id="datetime" type="datetime-local" value={values.datetime} onChange={set('datetime')} className="mt-1.5" required />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">{isLost ? 'Additional notes' : 'Additional observations'}</Label>
          <Textarea
            id="notes"
            value={values.notes}
            onChange={set('notes')}
            rows={3}
            placeholder={isLost ? 'Anything else that may help identify the item.' : 'Where it is kept now, its condition, anything else you noticed.'}
            className="mt-1.5"
          />
        </div>

        <div className="sm:col-span-2">
          <PhotoUpload
            value={values.image_file_uri}
            onChange={(uri) => setValues((prev) => ({ ...prev, image_file_uri: uri }))}
          />
        </div>

        {isLost && (
          <div className="sm:col-span-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
            <Label htmlFor="secret_detail">Secret ownership detail</Label>
            <Input
              id="secret_detail"
              value={values.secret_detail}
              onChange={set('secret_detail')}
              placeholder="e.g. A scratch shaped like a hook on the back cover"
              className="mt-1.5"
              required
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              A private clue that only the real owner would know. It is never shown in listings, never sent to the AI and
              never shared with the finder — only you and the Global Admin can open it. You will compare it with the item
              together at the handover.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy} className="fb-gradient text-white">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {stage === 'submitting' ? 'Saving report…' : stage === 'matching' ? 'AI is comparing reports…' : 'Submit report'}
        </Button>
        {stage === 'matching' && (
          <span className="text-xs text-muted-foreground">
            Gemini is comparing this report with relevant reports. This can take a few seconds.
          </span>
        )}
      </div>
    </form>
  );
}