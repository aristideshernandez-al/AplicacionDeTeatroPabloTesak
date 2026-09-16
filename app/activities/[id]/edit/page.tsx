import { ActivityFormPage } from '@/components/activity-form-page'

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ActivityFormPage activityId={id} />
}
