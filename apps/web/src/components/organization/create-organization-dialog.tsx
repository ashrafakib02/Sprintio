import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateOrganization } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/cn';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const navigate = useNavigate();
  const createOrganization = useCreateOrganization();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited) {
      setSlug(generateSlug(name));
    }
  }, [name, slugEdited]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setSlug('');
      setSlugEdited(false);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    createOrganization.mutate(
      {
        name: trimmedName,
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      },
      {
        onSuccess: (response) => {
          onOpenChange(false);
          navigate({
            to: '/organization/$organizationId',
            params: { organizationId: response.data.id },
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Set up a new organization to collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="org-create-name">Organization name</Label>
            <Input
              id="org-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              autoFocus
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">{name.length}/100 characters</p>
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="org-create-slug">Slug</Label>
            <Input
              id="org-create-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="acme-corp"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Used in URLs. Auto-generated from name.</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="org-create-description">Description (optional)</Label>
            <textarea
              id="org-create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your organization"
              maxLength={500}
              rows={3}
              className={cn(
                'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'ring-offset-background placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'resize-none',
              )}
            />
            <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createOrganization.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createOrganization.isPending}>
              {createOrganization.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
