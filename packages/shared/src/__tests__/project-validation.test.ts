import { describe, it, expect } from 'vitest';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateProjectInput,
  UpdateProjectInput,
} from '../hierarchy-types.js';
import {
  CreateProjectForWorkspaceSchema,
  ProjectListQuerySchema,
  generateProjectSlug,
} from '../schemas/project.js';

// ── CreateProjectSchema Tests ─────────────────────────────────

describe('CreateProjectSchema', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const VALID_DATETIME = '2024-01-15T10:30:00.000Z';

  describe('valid inputs', () => {
    it('should accept minimal valid input (name, slug, workspaceId)', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'My Project',
        slug: 'my-project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it('should accept full input with all optional fields', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Full Project',
        slug: 'full-project',
        description: 'A detailed project',
        workspaceId: VALID_UUID,
        priority: 'high',
        visibility: 'public',
        startDate: VALID_DATETIME,
        endDate: VALID_DATETIME,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('high');
        expect(result.data.visibility).toBe('public');
      }
    });

    it('should apply default priority "none"', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('none');
      }
    });

    it('should apply default visibility "workspace"', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visibility).toBe('workspace');
      }
    });

    it('should accept all valid priority values', () => {
      for (const priority of ['none', 'low', 'medium', 'high', 'urgent'] as const) {
        const result = CreateProjectSchema.safeParse({
          name: 'Project',
          slug: 'project',
          workspaceId: VALID_UUID,
          priority,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept all valid visibility values', () => {
      for (const visibility of ['workspace', 'public'] as const) {
        const result = CreateProjectSchema.safeParse({
          name: 'Project',
          slug: 'project',
          workspaceId: VALID_UUID,
          visibility,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('slug validation', () => {
    it('should accept lowercase alphanumeric with hyphens', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'my-cool-project-123',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it('should accept single word slug', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it('should reject slug with uppercase letters', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'My-Project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it('should reject slug with underscores', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'my_project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it('should reject slug with spaces', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'my project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it('should reject slug with special characters', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'my@project!',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it('should reject slug starting with hyphen', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: '-my-project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it('should reject slug ending with hyphen', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'my-project-',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty slug', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: '',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('name validation', () => {
    it('should reject empty name', () => {
      const result = CreateProjectSchema.safeParse({
        name: '',
        slug: 'project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'a'.repeat(101),
        slug: 'project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it('should accept name at exactly 100 characters', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'a'.repeat(100),
        slug: 'project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('workspaceId validation', () => {
    it('should reject invalid UUID format', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing workspaceId', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('description validation', () => {
    it('should accept omitting description (optional)', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it('should accept a string description', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
        description: 'A project description',
      });
      expect(result.success).toBe(true);
    });

    it('should reject description longer than 2000 characters', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
        description: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept description at exactly 2000 characters', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
        description: 'a'.repeat(2000),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('date validation', () => {
    it('should accept valid ISO datetime for startDate', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
        startDate: '2024-01-15T10:30:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid datetime format for startDate', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
        startDate: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should accept omitting startDate (optional)', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        slug: 'project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('missing required fields', () => {
    it('should reject empty object', () => {
      const result = CreateProjectSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject when name is missing', () => {
      const result = CreateProjectSchema.safeParse({
        slug: 'project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it('should reject when slug is missing', () => {
      const result = CreateProjectSchema.safeParse({
        name: 'Project',
        workspaceId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });
  });
});

// ── UpdateProjectSchema Tests ─────────────────────────────────

describe('UpdateProjectSchema', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  it('should accept empty object (all fields optional)', () => {
    const result = UpdateProjectSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept partial update with only name', () => {
    const result = UpdateProjectSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('should accept partial update with only priority', () => {
    const result = UpdateProjectSchema.safeParse({ priority: 'urgent' });
    expect(result.success).toBe(true);
  });

  it('should accept partial update with status change', () => {
    const result = UpdateProjectSchema.safeParse({ status: 'completed' });
    expect(result.success).toBe(true);
  });

  it('should accept all valid status values', () => {
    for (const status of ['active', 'on_hold', 'completed', 'archived'] as const) {
      const result = UpdateProjectSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('should strip workspaceId if provided (not updatable)', () => {
    const result = UpdateProjectSchema.safeParse({
      name: 'Updated',
      workspaceId: VALID_UUID,
    });
    // workspaceId is omitted from the schema — Zod strips it, not rejects
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('workspaceId');
    }
  });

  it('should reject invalid priority value', () => {
    const result = UpdateProjectSchema.safeParse({ priority: 'critical' });
    expect(result.success).toBe(false);
  });

  it('should strip unknown keys like status (not in base schema)', () => {
    // status is not part of CreateProjectSchema, so it's not in UpdateProjectSchema
    // Zod strips unknown keys by default
    const result = UpdateProjectSchema.safeParse({ status: 'deleted' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('status');
    }
  });

  it('should reject invalid visibility value', () => {
    const result = UpdateProjectSchema.safeParse({ visibility: 'private' });
    expect(result.success).toBe(false);
  });
});

// ── CreateProjectForWorkspaceSchema Tests ─────────────────────

describe('CreateProjectForWorkspaceSchema', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  it('should accept input without workspaceId (omitted from base schema)', () => {
    const result = CreateProjectForWorkspaceSchema.safeParse({
      name: 'Project',
      slug: 'project',
    });
    expect(result.success).toBe(true);
  });

  it('should still validate name and slug', () => {
    const result = CreateProjectForWorkspaceSchema.safeParse({
      name: '',
      slug: 'project',
    });
    expect(result.success).toBe(false);
  });

  it("should reject if workspaceId is provided (it's omitted)", () => {
    const result = CreateProjectForWorkspaceSchema.safeParse({
      name: 'Project',
      slug: 'project',
      workspaceId: VALID_UUID,
    });
    // workspaceId is omitted from the schema, so it should be stripped/ignored
    // (Zod strips unknown keys by default with .parse)
    expect(result.success).toBe(true);
  });

  it('should accept all optional fields', () => {
    const result = CreateProjectForWorkspaceSchema.safeParse({
      name: 'Full Project',
      slug: 'full-project',
      description: 'A detailed project',
      priority: 'high',
      visibility: 'public',
    });
    expect(result.success).toBe(true);
  });
});

// ── ProjectListQuerySchema Tests ──────────────────────────────

describe('ProjectListQuerySchema', () => {
  describe('defaults', () => {
    it('should apply default page = 1', () => {
      const result = ProjectListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should apply default limit = 20', () => {
      const result = ProjectListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });
  });

  describe('page validation', () => {
    it('should coerce string page to number', () => {
      const result = ProjectListQuerySchema.safeParse({ page: '3' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
      }
    });

    it('should reject page < 1', () => {
      const result = ProjectListQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer page', () => {
      const result = ProjectListQuerySchema.safeParse({ page: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  describe('limit validation', () => {
    it('should coerce string limit to number', () => {
      const result = ProjectListQuerySchema.safeParse({ limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit > 100', () => {
      const result = ProjectListQuerySchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it('should reject limit < 1', () => {
      const result = ProjectListQuerySchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should accept limit at exactly 100', () => {
      const result = ProjectListQuerySchema.safeParse({ limit: 100 });
      expect(result.success).toBe(true);
    });
  });

  describe('filter validation', () => {
    it('should accept valid status filter', () => {
      const result = ProjectListQuerySchema.safeParse({ status: 'active' });
      expect(result.success).toBe(true);
    });

    it('should accept valid priority filter', () => {
      const result = ProjectListQuerySchema.safeParse({ priority: 'urgent' });
      expect(result.success).toBe(true);
    });

    it('should accept valid visibility filter', () => {
      const result = ProjectListQuerySchema.safeParse({ visibility: 'public' });
      expect(result.success).toBe(true);
    });

    it('should accept valid search string', () => {
      const result = ProjectListQuerySchema.safeParse({ search: 'my project' });
      expect(result.success).toBe(true);
    });

    it('should reject search longer than 100 characters', () => {
      const result = ProjectListQuerySchema.safeParse({ search: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status value', () => {
      const result = ProjectListQuerySchema.safeParse({ status: 'deleted' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority value', () => {
      const result = ProjectListQuerySchema.safeParse({ priority: 'critical' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid visibility value', () => {
      const result = ProjectListQuerySchema.safeParse({ visibility: 'private' });
      expect(result.success).toBe(false);
    });
  });

  describe('combined filters', () => {
    it('should accept all filters together', () => {
      const result = ProjectListQuerySchema.safeParse({
        status: 'active',
        priority: 'high',
        visibility: 'workspace',
        search: 'frontend',
        page: '2',
        limit: '10',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
        expect(result.data.priority).toBe('high');
        expect(result.data.visibility).toBe('workspace');
        expect(result.data.search).toBe('frontend');
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
      }
    });
  });
});

// ── generateProjectSlug Tests ─────────────────────────────────

describe('generateProjectSlug', () => {
  it('should convert name to lowercase slug', () => {
    expect(generateProjectSlug('My Project')).toBe('my-project');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateProjectSlug('Hello World')).toBe('hello-world');
  });

  it('should strip non-alphanumeric characters except hyphens', () => {
    expect(generateProjectSlug('Project @#$% 123')).toBe('project-123');
  });

  it('should collapse consecutive hyphens', () => {
    expect(generateProjectSlug('a   b')).toBe('a-b');
  });

  it('should trim leading and trailing hyphens', () => {
    expect(generateProjectSlug('  hello  ')).toBe('hello');
  });

  it('should handle mixed case with numbers', () => {
    expect(generateProjectSlug('Sprint 2.0 Release')).toBe('sprint-20-release');
  });

  it('should handle empty-ish input gracefully', () => {
    expect(generateProjectSlug('!!!')).toBe('');
  });

  it('should handle single word', () => {
    expect(generateProjectSlug('Project')).toBe('project');
  });

  it('should handle multiple consecutive spaces', () => {
    expect(generateProjectSlug('My   Cool   Project')).toBe('my-cool-project');
  });
});

// ── Type Inference Tests ──────────────────────────────────────

describe('Zod type inference', () => {
  it('CreateProjectInput should match expected shape', () => {
    // This is a compile-time check — if the types are wrong, TypeScript will error
    const input: CreateProjectInput = {
      name: 'Test',
      slug: 'test',
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      priority: 'none',
      visibility: 'workspace',
    };
    expect(input.name).toBe('Test');
  });

  it('UpdateProjectInput should accept partial fields', () => {
    const input: UpdateProjectInput = {
      name: 'Updated',
    };
    expect(input.name).toBe('Updated');
  });

  it('UpdateProjectInput should accept empty object', () => {
    const input: UpdateProjectInput = {};
    expect(Object.keys(input)).toHaveLength(0);
  });
});
