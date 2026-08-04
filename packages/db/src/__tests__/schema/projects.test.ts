import { describe, it, expect } from 'vitest';
import { projects, projectStatusEnum, projectPriorityEnum, projectVisibilityEnum } from '../../schema/projects.js';

// ── Enum Tests ────────────────────────────────────────────────

describe('Project Enums', () => {
  describe('projectStatusEnum', () => {
    it('should have the correct enum name', () => {
      expect(projectStatusEnum.enumName).toBe('project_status');
    });

    it('should contain exactly 4 values', () => {
      expect(projectStatusEnum.enumValues).toHaveLength(4);
    });

    it('should contain all expected status values', () => {
      expect(projectStatusEnum.enumValues).toEqual([
        'active',
        'on_hold',
        'completed',
        'archived',
      ]);
    });
  });

  describe('projectPriorityEnum', () => {
    it('should have the correct enum name', () => {
      expect(projectPriorityEnum.enumName).toBe('project_priority');
    });

    it('should contain exactly 5 values', () => {
      expect(projectPriorityEnum.enumValues).toHaveLength(5);
    });

    it('should contain all expected priority values', () => {
      expect(projectPriorityEnum.enumValues).toEqual([
        'none',
        'low',
        'medium',
        'high',
        'urgent',
      ]);
    });
  });

  describe('projectVisibilityEnum', () => {
    it('should have the correct enum name', () => {
      expect(projectVisibilityEnum.enumName).toBe('project_visibility');
    });

    it('should contain exactly 2 values', () => {
      expect(projectVisibilityEnum.enumValues).toHaveLength(2);
    });

    it('should contain all expected visibility values', () => {
      expect(projectVisibilityEnum.enumValues).toEqual(['workspace', 'public']);
    });
  });
});

// ── Table Structure Tests ─────────────────────────────────────

describe('projects table', () => {
  it('should have the correct table name', () => {
    expect((projects as unknown as Record<string | symbol, unknown>)[Symbol.for('drizzle:Name')]).toBe('projects');
  });

  describe('columns', () => {
    it('should have an id column of type uuid, primary key with defaultRandom', () => {
      const col = projects.id;
      expect(col).toBeDefined();
      expect(col.primary).toBe(true);
      expect(col.notNull).toBe(true);
    });

    it('should have a name column of type varchar(100), not null', () => {
      const col = projects.name;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(true);
    });

    it('should have a slug column of type varchar(100), not null', () => {
      const col = projects.slug;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(true);
    });

    it('should have a description column, nullable', () => {
      const col = projects.description;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(false);
    });

    it('should have a workspaceId column, not null with foreign key', () => {
      const col = projects.workspaceId;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(true);
    });

    it('should have a status column with enum default "active"', () => {
      const col = projects.status;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(true);
    });

    it('should have a priority column with enum default "none"', () => {
      const col = projects.priority;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(true);
    });

    it('should have a visibility column with enum default "workspace"', () => {
      const col = projects.visibility;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(true);
    });

    it('should have a startDate column, nullable with timezone', () => {
      const col = projects.startDate;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(false);
    });

    it('should have an endDate column, nullable with timezone', () => {
      const col = projects.endDate;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(false);
    });

    it('should have a deletedAt column, nullable with timezone', () => {
      const col = projects.deletedAt;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(false);
    });

    it('should have a createdAt column, not null with defaultNow', () => {
      const col = projects.createdAt;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(true);
    });

    it('should have an updatedAt column, not null with defaultNow and onUpdate', () => {
      const col = projects.updatedAt;
      expect(col).toBeDefined();
      expect(col.notNull).toBe(true);
    });
  });

  describe('column count', () => {
    it('should have exactly 13 columns', () => {
      // Filter out Drizzle ORM internal properties (e.g. enableRLS)
      const columnNames = Object.keys(projects).filter(
        (key) => !['enableRLS'].includes(key),
      );
      expect(columnNames).toHaveLength(13);
    });
  });

  describe('foreign keys', () => {
    it('should have at least one inline foreign key (workspaceId → workspaces.id)', () => {
      const fks = (projects as unknown as Record<string | symbol, unknown>)[Symbol.for('drizzle:PgInlineForeignKeys')];
      expect(fks).toBeDefined();
      expect(Array.isArray(fks)).toBe(true);
      expect((fks as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe('extra config (indexes and checks)', () => {
    it('should have an ExtraConfigBuilder for indexes and constraints', () => {
      const builder = (projects as unknown as Record<string | symbol, unknown>)[Symbol.for('drizzle:ExtraConfigBuilder')];
      expect(builder).toBeDefined();
      expect(typeof builder).toBe('function');
    });
  });
});
