import { MainLayout } from '@/components/layout/MainLayout'
import { Reports } from '@/components/reports/Reports'
import { RoleGuard } from '@/components/layout/RoleGuard'

export default function ReportsPage() {
  return (
    <MainLayout>
      <RoleGuard roles={['manager', 'admin']}>
        <Reports />
      </RoleGuard>
    </MainLayout>
  )
}
