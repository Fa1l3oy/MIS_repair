import { RouteNotFound } from '@/components/shared/RouteStates';

export default function NotFound() {
  return <RouteNotFound backHref="/queue" backLabel="กลับไปที่คิวงานซ่อม" />;
}
