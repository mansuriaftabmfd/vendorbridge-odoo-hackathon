import { MainLayout } from '@/components/layout/MainLayout'
import { Vendors } from '@/components/vendors/Vendors'
import { RoleGuard } from '@/components/layout/RoleGuard'

export default function VendorsPage() {
  return (
    <MainLayout>
      <RoleGuard roles={['procurement_officer', 'manager', 'admin']}>
        <Vendors />
      </RoleGuard>
    </MainLayout>
  )
}
