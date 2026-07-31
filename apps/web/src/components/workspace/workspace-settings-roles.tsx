import { useState, useEffect, useMemo } from 'react';
import {
  useWorkspaceRoles,
  useCreateWorkspaceRole,
  useUpdateWorkspaceRole,
  useDeleteWorkspaceRole,
  usePermissions,
} from '@/hooks/use-workspace-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { WorkspaceRoleDefinition, WorkspacePermission } from '@/lib/api';

interface WorkspaceSettingsRolesProps {
  workspaceId: string;
}

// --- Create / Edit Role Dialog ---

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  role?: WorkspaceRoleDefinition | null;
}

function RoleDialog({ open, onOpenChange, workspaceId, role }: RoleDialogProps) {
  const isEditing = !!role;
  const createRole = useCreateWorkspaceRole(workspaceId);
  const updateRole = useUpdateWorkspaceRole(workspaceId);
  const { data: permissionsData } = usePermissions();
  const allPermissions = permissionsData?.data?.permissions;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      if (role) {
        setName(role.name);
        setDescription(role.description ?? '');
        const permIds =
          allPermissions?.filter((p) => role.permissions.includes(p.name)).map((p) => p.id) ?? [];
        setSelectedPermissions(new Set(permIds));
      } else {
        setName('');
        setDescription('');
        setSelectedPermissions(new Set());
      }
    }
  }, [open, role, allPermissions]);

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const permissionIds = Array.from(selectedPermissions);

    if (isEditing && role) {
      updateRole.mutate(
        {
          roleId: role.id,
          data: {
            name: name !== role.name ? name : undefined,
            description: description !== (role.description ?? '') ? description || null : undefined,
            permissionIds,
          },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createRole.mutate(
        { name, description: description || undefined, permissionIds },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  // Group permissions by resource
  const groupedPermissions = useMemo(() => {
    if (!allPermissions) return {};
    const groups: Record<string, WorkspacePermission[]> = {};
    for (const perm of allPermissions) {
      const resource = perm.resource || 'Other';
      if (!groups[resource]) groups[resource] = [];
      groups[resource].push(perm);
    }
    return groups;
  }, [allPermissions]);

  const isPending = createRole.isPending || updateRole.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the role name, description, and permissions.'
              : 'Define a new role with a name and set of permissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="role-name">Role Name *</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Manager"
              required
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Input
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role is for"
              maxLength={200}
            />
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Permissions</Label>
              <span className="text-xs text-muted-foreground">
                {selectedPermissions.size} selected
              </span>
            </div>

            {allPermissions ? (
              <div className="space-y-4 max-h-60 overflow-y-auto rounded-md border p-3">
                {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                  <PermissionGroup
                    key={resource}
                    resource={resource}
                    permissions={permissions}
                    selectedPermissions={selectedPermissions}
                    onToggle={togglePermission}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-6">
                <Spinner className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Permission Group (collapsible) ---

interface PermissionGroupProps {
  resource: string;
  permissions: WorkspacePermission[];
  selectedPermissions: Set<string>;
  onToggle: (id: string) => void;
}

function PermissionGroup({
  resource,
  permissions,
  selectedPermissions,
  onToggle,
}: PermissionGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const allSelected = permissions.every((p) => selectedPermissions.has(p.id));
  const someSelected = permissions.some((p) => selectedPermissions.has(p.id));

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded py-1 text-sm font-medium hover:text-foreground text-muted-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="capitalize">{resource}</span>
          <span className="text-xs text-muted-foreground">
            ({permissions.filter((p) => selectedPermissions.has(p.id)).length}/{permissions.length})
          </span>
          {someSelected && !allSelected && <span className="h-2 w-2 rounded-full bg-primary/60" />}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="space-y-1 pl-2">
          {permissions.map((perm) => (
            <label
              key={perm.id}
              className={cn(
                'flex items-center gap-3 rounded px-2 py-1.5 text-sm cursor-pointer transition-colors',
                selectedPermissions.has(perm.id) ? 'bg-accent/50' : 'hover:bg-accent/30',
              )}
            >
              <Switch
                checked={selectedPermissions.has(perm.id)}
                onCheckedChange={() => onToggle(perm.id)}
                className="h-5 w-9"
              />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-xs">{perm.name}</span>
                {perm.description && (
                  <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Delete Role Confirmation ---

interface DeleteRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  role: WorkspaceRoleDefinition | null;
}

function DeleteRoleDialog({ open, onOpenChange, workspaceId, role }: DeleteRoleDialogProps) {
  const deleteRole = useDeleteWorkspaceRole(workspaceId);

  if (!role) return null;

  const handleConfirm = () => {
    deleteRole.mutate(role.id, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Role
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{role.name}</strong>? Members assigned this role
            will need to be reassigned.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">
            This action cannot be undone. All members with this role will lose their associated
            permissions.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleteRole.isPending}>
            {deleteRole.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Deleting...
              </>
            ) : (
              'Delete Role'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Roles Settings ---

export function WorkspaceSettingsRoles({ workspaceId }: WorkspaceSettingsRolesProps) {
  const { data: rolesResponse, isLoading, error } = useWorkspaceRoles(workspaceId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<WorkspaceRoleDefinition | null>(null);

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
        <p className="text-sm">Failed to load workspace roles</p>
        <p className="text-xs mt-1 opacity-70">{error.message}</p>
      </div>
    );
  }

  const rolesList = rolesResponse?.data?.roles ?? [];
  const systemRoles = rolesList.filter((r) => r.isSystem);
  const customRoles = rolesList.filter((r) => !r.isSystem);

  const openEditDialog = (role: WorkspaceRoleDefinition) => {
    setSelectedRole(role);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (role: WorkspaceRoleDefinition) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Custom Roles */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle headingLevel="h2" className="text-xl flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                Role Management
              </CardTitle>
              <CardDescription>
                Create and manage custom roles with granular permissions.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
              <Shield className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium mb-1">No custom roles yet</p>
              <p className="text-xs text-muted-foreground mb-3">
                Create custom roles to define specific permission sets for your team.
              </p>
              <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Role
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {customRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-md border p-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{role.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {role.permissions.length} permission
                        {role.permissions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {role.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {role.permissions.slice(0, 5).map((perm) => (
                        <span
                          key={perm}
                          className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {perm}
                        </span>
                      ))}
                      {role.permissions.length > 5 && (
                        <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          +{role.permissions.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(role)}
                      aria-label={`Edit ${role.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(role)}
                      aria-label={`Delete ${role.name}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Roles (read-only) */}
      {systemRoles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle headingLevel="h3" className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              System Roles
            </CardTitle>
            <CardDescription>
              These roles are built-in and cannot be modified. They provide baseline permissions for
              all workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-md border p-3 bg-muted/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{role.name}</span>
                      <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        System
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      aria-label="System roles cannot be edited"
                    >
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <RoleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
      />
      <RoleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        workspaceId={workspaceId}
        role={selectedRole}
      />
      <DeleteRoleDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        workspaceId={workspaceId}
        role={selectedRole}
      />
    </div>
  );
}
