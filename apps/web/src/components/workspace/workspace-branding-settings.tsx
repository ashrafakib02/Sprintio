import { useState, useEffect } from 'react';
import { useWorkspaceContext, useUpdateWorkspaceSettings } from '@/hooks/use-workspace-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { ImagePlus, Palette, Globe, Save, Upload, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface WorkspaceBrandingSettingsProps {
  workspaceId: string;
}

const PRESET_COLORS = [
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#2563EB', // Blue
  '#0891B2', // Cyan
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#DB2777', // Pink
];

export function WorkspaceBrandingSettings({ workspaceId }: WorkspaceBrandingSettingsProps) {
  const { data, isLoading, error } = useWorkspaceContext(workspaceId);
  const updateSettings = useUpdateWorkspaceSettings(workspaceId);

  const workspace = data?.workspace;
  const userRole = data?.userRole;
  const canEdit = userRole === 'owner' || userRole === 'admin';

  const [logo, setLogo] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState<string>('');
  const [customDomain, setCustomDomain] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (workspace) {
      setLogo(workspace.logo ?? null);
      setBrandColor(workspace.brandColor ?? '');
      setCustomDomain(workspace.customDomain ?? '');
    }
  }, [workspace]);

  useEffect(() => {
    if (workspace) {
      setHasChanges(
        logo !== (workspace.logo ?? null) ||
          brandColor !== (workspace.brandColor ?? '') ||
          customDomain !== (workspace.customDomain ?? ''),
      );
    }
  }, [logo, brandColor, customDomain, workspace]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    updateSettings.mutate({
      logo: logo !== (workspace?.logo ?? null) ? logo : undefined,
      brandColor: brandColor !== (workspace?.brandColor ?? '') ? brandColor || null : undefined,
      customDomain:
        customDomain !== (workspace?.customDomain ?? '') ? customDomain || null : undefined,
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
        <p className="text-sm">Failed to load workspace branding</p>
        <p className="text-xs mt-1 opacity-70">{error.message}</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Section */}
        <Card>
          <CardHeader>
            <CardTitle headingLevel="h2" className="text-xl flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              Workspace Logo
            </CardTitle>
            <CardDescription>
              Upload a logo to personalize your workspace. Recommended size: 256×256px.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              <div
                className={cn(
                  'relative flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-dashed transition-colors',
                  logo ? 'border-transparent bg-accent/30' : 'border-muted-foreground/25 bg-muted/30',
                )}
              >
                {logo ? (
                  <>
                    <img
                      src={logo}
                      alt="Workspace logo"
                      className="h-full w-full rounded-lg object-cover"
                    />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setLogo(null)}
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
                        aria-label="Remove logo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // In production, this would open a file picker and upload to storage
                        // For now, demonstrate with a placeholder URL
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/png,image/jpeg,image/webp';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setLogo(ev.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Supports PNG, JPG, and WebP. Max 2MB. The logo will appear in the sidebar and
                  workspace header.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Brand Color Section */}
        <Card>
          <CardHeader>
            <CardTitle headingLevel="h2" className="text-xl flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              Brand Color
            </CardTitle>
            <CardDescription>
              Choose a brand color that will be applied to workspace UI elements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Color Presets */}
            <div className="space-y-2">
              <Label>Quick Select</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setBrandColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      brandColor === color
                        ? 'border-foreground ring-2 ring-foreground/20'
                        : 'border-transparent',
                      !canEdit && 'cursor-not-allowed opacity-50',
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Color Input */}
            <div className="space-y-2">
              <Label htmlFor="brand-color">Custom Color</Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    id="brand-color-picker"
                    value={brandColor || '#4F46E5'}
                    onChange={(e) => setBrandColor(e.target.value)}
                    disabled={!canEdit}
                    className="absolute inset-0 h-10 w-10 cursor-pointer opacity-0"
                    aria-label="Color picker"
                  />
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-input"
                    style={{ backgroundColor: brandColor || '#4F46E5' }}
                  >
                    <Palette className="h-4 w-4 text-white mix-blend-difference" />
                  </div>
                </div>
                <Input
                  id="brand-color"
                  value={brandColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      setBrandColor(val);
                    }
                  }}
                  placeholder="#4F46E5"
                  disabled={!canEdit}
                  className="max-w-[120px] font-mono"
                  maxLength={7}
                />
                {brandColor && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBrandColor('')}
                    disabled={!canEdit}
                    className="text-muted-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a hex color code (e.g. #4F46E5)
              </p>
            </div>

            {/* Preview */}
            {brandColor && (
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg"
                    style={{ backgroundColor: brandColor }}
                  />
                  <div>
                    <p className="text-sm font-medium">Workspace Sidebar</p>
                    <p className="text-xs text-muted-foreground">
                      Active items will use this color
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Domain Section */}
        <Card>
          <CardHeader>
            <CardTitle headingLevel="h2" className="text-xl flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              Custom Domain
            </CardTitle>
            <CardDescription>
              Connect a custom domain to your workspace. Requires DNS verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-domain">Domain</Label>
              <Input
                id="custom-domain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="workspace.yourdomain.com"
                disabled={!canEdit}
                maxLength={253}
              />
              <p className="text-xs text-muted-foreground">
                Enter your custom domain (e.g. sprint.yourcompany.com)
              </p>
            </div>

            {customDomain && (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ After saving, add a CNAME record pointing to{' '}
                  <code className="font-mono text-xs bg-background/50 px-1 py-0.5 rounded">
                    sprintio.app
                  </code>{' '}
                  in your DNS settings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={!hasChanges || updateSettings.isPending}>
              {updateSettings.isPending ? (
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
    </div>
  );
}
