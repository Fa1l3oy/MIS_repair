import { RouteNotFound } from '@/components/shared/RouteStates';

export default function NotFound() {
  return <RouteNotFound backHref="/requests" backLabel="กลับไปที่ใบแจ้งซ่อมของฉัน" />;
}
