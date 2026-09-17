import { ActivityUploadPage } from '@/components/activity-upload-page'

export default async function UploadActivityFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ActivityUploadPage activityId={id} />
}
