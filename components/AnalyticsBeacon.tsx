'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getVisitorId } from '@/lib/visitor';

export default function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const visitorId = getVisitorId();
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'pageview',
        path: pathname,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        visitor_id: visitorId,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
