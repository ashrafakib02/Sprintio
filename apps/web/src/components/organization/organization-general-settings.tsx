import { useState, useEffect } from 'react';
import {
  useOrganizationContext,
  useUpdateOrganization,
  useArchiveOrganization,
  useRestoreOrganization,
  useDeleteOrganization,
} from '@/hooks/use-organization-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Save, AlertTriangle, Archive, ArchiveRestore, Trash2 } from 'lucide-react';

interface OrganizationGeneralSettingsProps {
  organizationId: string;
}

export function OrganizationGeneralSettings({ organizationId }: OrganizationGeneralSettingsProps) {
  const { data: contextData, isLoading, error } = useOrganizationContext(organizationId);
  const updateOrganization = useUpdateOrganization(organizationId);
  const archiveMutation = useArchiveOrganization(organizationId);
  const restoreMutation = useRestoreOrganization(organizationId);
  const deleteMutation = useDeleteOrganization(organizationId);

  const organization = contextData?.organization ?? null;
  const userRole = contextData?.userRole ?? null;
  const canEdit = userRole === 'owner' || userRole === 'admin';
  const isArchived = organization?.archivedAt != null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Dialog states
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setDescription(organization.description ?? '');
    }
  }, [organization]);

  useEffect(() => {
    if (organization) {
      setHasChanges(name !== organization.name || description !== (organization.description ?? ''));
    }
  }, [name, description, organization]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges || !organization) return;

    updateOrganization.mutate({
      name: name !== organization.name ? name : undefined,
      description:
        description !== (organization.description ?? '') ? description || null : undefined,
    });
  };

  const handleArchive = () => {
    if (isArchived) {
      restoreMutation.mutate(undefined, {
        onSuccess: () => setArchiveDialogOpen(false),
      });
    } else {
      archiveMutation.mutate(undefined, {
        onSuccess: () => setArchiveDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => setDeleteDialogOpen(false),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Failed to load organization settings</p>
        <p className="text-xs mt-1 opacity-70">{error.message}</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle headingLevel="h2" className="text-xl">
            General Settings
          </CardTitle>
          <CardDescription>Manage your organization name and description.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="org-settings-name">Organization Name</Label>
              <Input
                id="org-settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Organization"
                disabled={!canEdit}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">{name.length}/100 characters</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="org-settings-description">Description</Label>
              <textarea
                id="org-settings-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your organization"
                disabled={!canEdit}
                maxLength={500}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
              <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
            </div>

            {/* Organization Info */}
            <div className="rounded-md bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-xs">{organization.slug}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(organization.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            {canEdit && (
              <div className="flex justify-end">
                <Button type="submit" disabled={!hasChanges || updateOrganization.isPending}>
                  {updateOrganization.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ── Danger Zone ─────────────────────────────────────── */}
      {canEdit && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle
              headingLevel="h2"
              className="text-xl flex items-center gap-2 text-destructive"
            >
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions. Proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Archive / Restore */}
            <div className="flex items-center justify-between rounded-md border border-border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {isArchived ? 'Restore Organization' : 'Archive Organization'}
                  </p>
                  {isArchived && (
                    <Badge variant="destructive" className="text-xs">
                      Archived
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isArchived
                    ? 'This organization is archived. Members cannot access it until restored.'
                    : 'Archive this organization to soft-delete it. Members will lose access until it is restored.'}
                </p>
              </div>
              <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant={isArchived ? 'outline' : 'destructive'}
                    size="sm"
                    disabled={archiveMutation.isPending || restoreMutation.isPending}
                  >
                    {archiveMutation.isPending || restoreMutation.isPending ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : isArchived ? (
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                    ) : (
                      <Archive className="mr-2 h-4 w-4" />
                    )}
                    {isArchived ? 'Restore' : 'Archive'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isArchived ? 'Restore Organization?' : 'Archive Organization?'}
                    </DialogTitle>
                    <DialogDescription>
                      {isArchived
                        ? 'Restoring this organization will reinstate access for all members. Are you sure you want to proceed?'
                        : 'Are you sure you want to archive this organization? Members will lose access to all projects and data within this organization. The organization can be restored later by an owner or admin.'}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setArchiveDialogOpen(false)}
                      disabled={archiveMutation.isPending || restoreMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={isArchived ? 'default' : 'destructive'}
                      onClick={handleArchive}
                      disabled={archiveMutation.isPending || restoreMutation.isPending}
                    >
                      {(archiveMutation.isPending || restoreMutation.isPending) && (
                        <Spinner className="mr-2 h-4 w-4" />
                      )}
                      {isArchived ? 'Restore Organization' : 'Archive Organization'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Permanent Delete */}
            <div className="flex items-center justify-between rounded-md border border-border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Permanently Delete</p>
                <p className="text-xs text-muted-foreground">
                  {isArchived
                    ? 'This action is PERMANENT and cannot be undone. All data and member associations will be permanently lost.'
                    : 'You must archive this organization before it can be permanently deleted.'}
                </p>
              </div>
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                  setDeleteDialogOpen(open);
                  if (!open) setDeleteConfirmName('');
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={!isArchived}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Permanently Delete Organization?</DialogTitle>
                    <DialogDescription>
                      This action is <span className="font-bold text-destructive">PERMANENT</span>{' '}
                      and cannot be undone. All data will be lost including projects, workspaces,
                      and member associations. Please type{' '}
                      <span className="font-mono font-bold">{organization.name}</span> to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm-name">Organization name</Label>
                    <Input
                      id="delete-confirm-name"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder={organization.name}
                      autoComplete="off"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDeleteDialogOpen(false);
                        setDeleteConfirmName('');
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteConfirmName !== organization.name || deleteMutation.isPending}
                    >
                      {deleteMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                      Delete Permanently
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
