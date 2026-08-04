import { describe, it, expect } from 'vitest';
import { PROJECT_STATUSES, PROJECT_PRIORITIES, PROJECT_VISIBILITIES } from '../constants/status.js';
import { PROJECT_ROLES, PROJECT_ROLE_HIERARCHY } from '../constants/roles.js';
import {
  ProjectStatusSchema,
  ProjectPrioritySchema,
  ProjectVisibilitySchema,
} from '../hierarchy-types.js';
import { ProjectError } from '../errors/project-error.js';

// ── Project Status Constants ──────────────────────────────────

describe('PROJECT_STATUSES', () => {
  it('should be an array of 4 values', () => {
    expect(PROJECT_STATUSES).toHaveLength(4);
  });

  it('should contain active', () => {
    expect(PROJECT_STATUSES).toContain('active');
  });

  it('should contain on_hold', () => {
    expect(PROJECT_STATUSES).toContain('on_hold');
  });

  it('should contain completed', () => {
    expect(PROJECT_STATUSES).toContain('completed');
  });

  it('should contain archived', () => {
    expect(PROJECT_STATUSES).toContain('archived');
  });

  it('should not contain paused (common mistake)', () => {
    expect(PROJECT_STATUSES).not.toContain('paused');
  });

  it('should not contain deleted', () => {
    expect(PROJECT_STATUSES).not.toContain('deleted');
  });

  it('should be readonly (tuple)', () => {
    // TypeScript readonly arrays have a length property but no push/pop
    // At runtime, we just verify the values are immutable via as const
    expect(PROJECT_STATUSES).toEqual(['active', 'on_hold', 'completed', 'archived']);
  });
});

// ── Project Priority Constants ────────────────────────────────

describe('PROJECT_PRIORITIES', () => {
  it('should be an array of 5 values', () => {
    expect(PROJECT_PRIORITIES).toHaveLength(5);
  });

  it('should contain none', () => {
    expect(PROJECT_PRIORITIES).toContain('none');
  });

  it('should contain low', () => {
    expect(PROJECT_PRIORITIES).toContain('low');
  });

  it('should contain medium', () => {
    expect(PROJECT_PRIORITIES).toContain('medium');
  });

  it('should contain high', () => {
    expect(PROJECT_PRIORITIES).toContain('high');
  });

  it('should contain urgent', () => {
    expect(PROJECT_PRIORITIES).toContain('urgent');
  });

  it('should not contain critical', () => {
    expect(PROJECT_PRIORITIES).not.toContain('critical');
  });

  it('should not contain blocker', () => {
    expect(PROJECT_PRIORITIES).not.toContain('blocker');
  });

  it('should be readonly (tuple)', () => {
    expect(PROJECT_PRIORITIES).toEqual(['none', 'low', 'medium', 'high', 'urgent']);
  });
});

// ── Project Visibility Constants ──────────────────────────────

describe('PROJECT_VISIBILITIES', () => {
  it('should be an array of 2 values', () => {
    expect(PROJECT_VISIBILITIES).toHaveLength(2);
  });

  it('should contain workspace', () => {
    expect(PROJECT_VISIBILITIES).toContain('workspace');
  });

  it('should contain public', () => {
    expect(PROJECT_VISIBILITIES).toContain('public');
  });

  it('should not contain private', () => {
    expect(PROJECT_VISIBILITIES).not.toContain('private');
  });

  it('should not contain internal', () => {
    expect(PROJECT_VISIBILITIES).not.toContain('internal');
  });

  it('should be readonly (tuple)', () => {
    expect(PROJECT_VISIBILITIES).toEqual(['workspace', 'public']);
  });
});

// ── Project Roles Constants ───────────────────────────────────

describe('PROJECT_ROLES', () => {
  it('should be an array of 3 values', () => {
    expect(PROJECT_ROLES).toHaveLength(3);
  });

  it('should contain admin', () => {
    expect(PROJECT_ROLES).toContain('admin');
  });

  it('should contain member', () => {
    expect(PROJECT_ROLES).toContain('member');
  });

  it('should contain viewer', () => {
    expect(PROJECT_ROLES).toContain('viewer');
  });

  it('should not contain owner', () => {
    expect(PROJECT_ROLES).not.toContain('owner');
  });

  it('should not contain guest', () => {
    expect(PROJECT_ROLES).not.toContain('guest');
  });
});

// ── Project Role Hierarchy ────────────────────────────────────

describe('PROJECT_ROLE_HIERARCHY', () => {
  it('should assign admin level 3', () => {
    expect(PROJECT_ROLE_HIERARCHY.admin).toBe(3);
  });

  it('should assign member level 2', () => {
    expect(PROJECT_ROLE_HIERARCHY.member).toBe(2);
  });

  it('should assign viewer level 1', () => {
    expect(PROJECT_ROLE_HIERARCHY.viewer).toBe(1);
  });

  it('should have admin > member > viewer ordering', () => {
    expect(PROJECT_ROLE_HIERARCHY.admin).toBeGreaterThan(PROJECT_ROLE_HIERARCHY.member);
    expect(PROJECT_ROLE_HIERARCHY.member).toBeGreaterThan(PROJECT_ROLE_HIERARCHY.viewer);
  });

  it('should not include owner', () => {
    expect(PROJECT_ROLE_HIERARCHY).not.toHaveProperty('owner');
  });

  it('should not include guest', () => {
    expect(PROJECT_ROLE_HIERARCHY).not.toHaveProperty('guest');
  });
});

// ── Zod Schema Alignment ──────────────────────────────────────

describe('Zod schema alignment with constants', () => {
  it('ProjectStatusSchema should accept all PROJECT_STATUSES values', () => {
    for (const status of PROJECT_STATUSES) {
      const result = ProjectStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('ProjectStatusSchema should reject values not in PROJECT_STATUSES', () => {
    const result = ProjectStatusSchema.safeParse('invalid_status');
    expect(result.success).toBe(false);
  });

  it('ProjectPrioritySchema should accept all PROJECT_PRIORITIES values', () => {
    for (const priority of PROJECT_PRIORITIES) {
      const result = ProjectPrioritySchema.safeParse(priority);
      expect(result.success).toBe(true);
    }
  });

  it('ProjectPrioritySchema should reject values not in PROJECT_PRIORITIES', () => {
    const result = ProjectPrioritySchema.safeParse('invalid_priority');
    expect(result.success).toBe(false);
  });

  it('ProjectVisibilitySchema should accept all PROJECT_VISIBILITIES values', () => {
    for (const visibility of PROJECT_VISIBILITIES) {
      const result = ProjectVisibilitySchema.safeParse(visibility);
      expect(result.success).toBe(true);
    }
  });

  it('ProjectVisibilitySchema should reject values not in PROJECT_VISIBILITIES', () => {
    const result = ProjectVisibilitySchema.safeParse('invalid_visibility');
    expect(result.success).toBe(false);
  });
});

// ── ProjectError Tests ────────────────────────────────────────

describe('ProjectError', () => {
  describe('constructor', () => {
    it('should create an error with code, message, and status code', () => {
      const error = new ProjectError('TEST', 'Test error', 418);
      expect(error.code).toBe('TEST');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(418);
      expect(error.name).toBe('ProjectError');
    });

    it('should default statusCode to 500', () => {
      const error = new ProjectError('TEST', 'Test error');
      expect(error.statusCode).toBe(500);
    });

    it('should be an instance of Error', () => {
      const error = new ProjectError('TEST', 'Test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('static factories', () => {
    it('notFound should create 404 with project ID', () => {
      const error = ProjectError.notFound('proj-123');
      expect(error.code).toBe('PROJECT_NOT_FOUND');
      expect(error.message).toBe("Project 'proj-123' not found");
      expect(error.statusCode).toBe(404);
    });

    it('notFound should create 404 without project ID', () => {
      const error = ProjectError.notFound();
      expect(error.code).toBe('PROJECT_NOT_FOUND');
      expect(error.message).toBe('Project not found');
      expect(error.statusCode).toBe(404);
    });

    it('slugConflict should create 409 with slug', () => {
      const error = ProjectError.slugConflict('my-project');
      expect(error.code).toBe('PROJECT_SLUG_CONFLICT');
      expect(error.message).toContain('my-project');
      expect(error.statusCode).toBe(409);
    });

    it('invalidSlug should create 400 with slug', () => {
      const error = ProjectError.invalidSlug('BAD_SLUG');
      expect(error.code).toBe('PROJECT_INVALID_SLUG');
      expect(error.message).toContain('BAD_SLUG');
      expect(error.statusCode).toBe(400);
    });

    it('archivedWorkspace should create 400', () => {
      const error = ProjectError.archivedWorkspace();
      expect(error.code).toBe('PROJECT_ARCHIVED_WORKSPACE');
      expect(error.statusCode).toBe(400);
    });

    it('notMemberOfWorkspace should create 403', () => {
      const error = ProjectError.notMemberOfWorkspace();
      expect(error.code).toBe('PROJECT_NOT_MEMBER');
      expect(error.statusCode).toBe(403);
    });

    it('insufficientPermissions should create 403 with action', () => {
      const error = ProjectError.insufficientPermissions('update');
      expect(error.code).toBe('PROJECT_INSUFFICIENT_PERMISSIONS');
      expect(error.message).toContain('update');
      expect(error.statusCode).toBe(403);
    });
  });
});
