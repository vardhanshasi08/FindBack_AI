import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Gavel, Loader2, Sparkles, XCircle } from 'lucide-react';

import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import ScoreMeter from '@/components/ScoreMeter';
import PrivateImage from '@/components/PrivateImage';
import OwnershipSecretPanel from '@/components/OwnershipSecretPanel';
import CaseTimeline from '@/components/case/CaseTimeline';
import FlowSteps from '@/components/FlowSteps';
import { Button } from '@/components/ui/button';
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
import { formatDate, formatDateTime, formatTime } from '@/lib/status';
import { extractError } from '@/lib/errors';

export default function AdminClaimDetail() {
  const { id } = useParams();
  const [caseItem, setCaseItem] = useState(null);
  const [lostReport, setLostReport] = useState(null);
  const [foundReport, setFoundReport] = useState(null);
  const [match, setMatch] = useState(null);