import type { Metadata } from 'next';
import { RouteNotFound } from '@/components/shared/RouteStates';

export const metadata: Metadata = { title: 'ไม่พบหน้านี้' };

export default function NotFound() {
  return <RouteNotFound />;
}
