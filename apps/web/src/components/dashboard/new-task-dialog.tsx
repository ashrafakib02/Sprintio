import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCreateTask } from '@/hooks/use-create-task';
import { useProjects } from '@/hooks/use-projects';
import type { TaskPriority } from '@sprintio/shared';

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTaskDialog({ open, onOpenChange }: NewTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [projectId, setProjectId] = useState('');
  const createTask = useCreateTask();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !projectId) return;

    createTask.mutate(
      { projectId, title: trimmed, description: description.trim() || null, priority },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setPriority('medium');
          setProjectId('');
          onOpenChange(false);
        },
      },
    );
  };

  const handleClose = () => {
    if (createTask.isPending) return;
    setTitle('');
    setDescription('');
    setPriority('medium');
    setProjectId('');
    onOpenChange(false);
  };

  const canSubmit = title.trim() && projectId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-project" className="block text-sm font-medium mb-1.5">
              Project <span className="text-destructive">*</span>
            </label>
            {projectsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Spinner className="h-4 w-4" /> Loading projects...
              </div>
            ) : projects && projects.length > 0 ? (
              <select
                id="task-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No projects found. Create a project first.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium mb-1.5">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              placeholder="e.g. Fix login page layout"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            />
          </div>
          <div>
            <label htmlFor="task-description" className="block text-sm font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="task-description"
              placeholder="Optional details about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none"
            />
          </div>
          <div>
            <label htmlFor="task-priority" className="block text-sm font-medium mb-1.5">
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={createTask.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || createTask.isPending}>
              {createTask.isPending && <Spinner className="h-4 w-4 mr-2" />}
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
