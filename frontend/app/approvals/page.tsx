import { MainLayout } from '@/components/layout/MainLayout'
import { ApprovalWorkflow } from '@/components/approvals/ApprovalWorkflow'
import { RoleGuard } from '@/components/layout/RoleGuard'

export default function ApprovalsPage() {
  return (
    <MainLayout>
      <RoleGuard roles={['manager', 'admin']}>
        <ApprovalWorkflow />
      </RoleGuard>
    </MainLayout>
  )
}
