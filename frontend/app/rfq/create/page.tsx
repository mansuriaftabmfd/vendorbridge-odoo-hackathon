import { MainLayout } from '@/components/layout/MainLayout'
import { RFQWizard } from '@/components/rfq/RFQWizard'
import { RoleGuard } from '@/components/layout/RoleGuard'

export default function CreateRFQPage() {
  return (
    <MainLayout>
      <RoleGuard roles={['procurement_officer', 'manager', 'admin']}>
        <RFQWizard />
      </RoleGuard>
    </MainLayout>
  )
}
