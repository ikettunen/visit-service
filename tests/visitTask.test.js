const VisitTask = require('../src/models/VisitTask');
const { executeQuery, executeTransaction } = require('../src/config/database');

// Mock the database module for unit tests
jest.mock('../src/config/database', () => ({
  executeQuery: jest.fn(),
  executeTransaction: jest.fn()
}));

describe('VisitTask Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a visit task with default values', () => {
      const data = {
        visit_id: 'visit-123',
        task_id: 'task-456',
        task_title: 'Check blood pressure'
      };

      const task = new VisitTask(data);

      expect(task.visit_id).toBe('visit-123');
      expect(task.task_id).toBe('task-456');
      expect(task.task_title).toBe('Check blood pressure');
      expect(task.completed).toBe(false);
    });

    it('should create a visit task with provided values', () => {
      const data = {
        id: 1,
        visit_id: 'visit-123',
        task_id: 'task-456',
        task_title: 'Check blood pressure',
        completed: true,
        completed_at: new Date('2024-01-15T10:15:00Z'),
        notes: 'BP was normal'
      };

      const task = new VisitTask(data);

      expect(task.id).toBe(1);
      expect(task.completed).toBe(true);
      expect(task.completed_at).toEqual(new Date('2024-01-15T10:15:00Z'));
      expect(task.notes).toBe('BP was normal');
    });
  });

  describe('Database Operations', () => {
    it('should save task to database', async () => {
      const mockResult = { insertId: 1 };
      executeQuery.mockResolvedValue(mockResult);

      const task = new VisitTask({
        visit_id: 'visit-123',
        task_id: 'task-456',
        task_title: 'Check blood pressure'
      });

      await task.save();

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO visit_tasks'),
        ['visit-123', 'task-456', 'Check blood pressure', false, undefined, undefined]
      );
      expect(task.id).toBe(1);
    });

    it('should find tasks by visit ID', async () => {
      const mockRows = [
        {
          id: 1,
          visit_id: 'visit-123',
          task_id: 'task-456',
          task_title: 'Check blood pressure',
          completed: false
        },
        {
          id: 2,
          visit_id: 'visit-123',
          task_id: 'task-789',
          task_title: 'Administer medication',
          completed: true
        }
      ];
      executeQuery.mockResolvedValue(mockRows);

      const tasks = await VisitTask.findByVisitId('visit-123');

      expect(executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM visit_tasks WHERE visit_id = ? ORDER BY created_at ASC',
        ['visit-123']
      );
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toBeInstanceOf(VisitTask);
      expect(tasks[0].task_title).toBe('Check blood pressure');
      expect(tasks[1].task_title).toBe('Administer medication');
    });

    it('should find task by ID', async () => {
      const mockRow = {
        id: 1,
        visit_id: 'visit-123',
        task_id: 'task-456',
        task_title: 'Check blood pressure',
        completed: false
      };
      executeQuery.mockResolvedValue([mockRow]);

      const task = await VisitTask.findById(1);

      expect(executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM visit_tasks WHERE id = ?',
        [1]
      );
      expect(task).toBeInstanceOf(VisitTask);
      expect(task.id).toBe(1);
    });

    it('should return null when task not found', async () => {
      executeQuery.mockResolvedValue([]);

      const task = await VisitTask.findById(999);

      expect(task).toBeNull();
    });

    it('should update task', async () => {
      const task = new VisitTask({
        id: 1,
        visit_id: 'visit-123',
        task_id: 'task-456',
        task_title: 'Check blood pressure',
        completed: false
      });

      await task.update({
        completed: true,
        completed_at: new Date('2024-01-15T10:15:00Z'),
        notes: 'BP was normal'
      });

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE visit_tasks SET'),
        expect.arrayContaining([
          'Check blood pressure',
          true,
          expect.any(Date),
          'BP was normal',
          1
        ])
      );
    });

    it('should mark task as completed', async () => {
      const task = new VisitTask({
        id: 1,
        visit_id: 'visit-123',
        task_id: 'task-456',
        task_title: 'Check blood pressure',
        completed: false
      });

      await task.markCompleted('BP was normal');

      expect(task.completed).toBe(true);
      expect(task.completed_at).toBeInstanceOf(Date);
      expect(task.notes).toBe('BP was normal');
    });

    it('should mark task as incomplete', async () => {
      const task = new VisitTask({
        id: 1,
        visit_id: 'visit-123',
        task_id: 'task-456',
        task_title: 'Check blood pressure',
        completed: true,
        completed_at: new Date()
      });

      await task.markIncomplete();

      expect(task.completed).toBe(false);
      expect(task.completed_at).toBeNull();
    });

    it('should delete task', async () => {
      const task = new VisitTask({ id: 1 });
      await task.delete();

      expect(executeQuery).toHaveBeenCalledWith(
        'DELETE FROM visit_tasks WHERE id = ?',
        [1]
      );
    });

    it('should create bulk tasks', async () => {
      const tasks = [
        {
          task_id: 'task-1',
          task_title: 'Check blood pressure',
          completed: false
        },
        {
          task_id: 'task-2',
          task_title: 'Administer medication',
          completed: true,
          completed_at: new Date('2024-01-15T10:15:00Z')
        }
      ];

      const mockCreatedTasks = [
        new VisitTask({ id: 1, visit_id: 'visit-123', ...tasks[0] }),
        new VisitTask({ id: 2, visit_id: 'visit-123', ...tasks[1] })
      ];

      executeTransaction.mockResolvedValue([]);
      executeQuery.mockResolvedValue(mockCreatedTasks.map(t => ({ ...t })));

      const result = await VisitTask.createBulk('visit-123', tasks);

      expect(executeTransaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            query: expect.stringContaining('INSERT INTO visit_tasks'),
            params: expect.arrayContaining(['visit-123', 'task-1', 'Check blood pressure'])
          })
        ])
      );
      expect(result).toHaveLength(2);
    });

    it('should handle empty bulk create', async () => {
      const result = await VisitTask.createBulk('visit-123', []);
      expect(result).toEqual([]);
      expect(executeTransaction).not.toHaveBeenCalled();
    });

    it('should update bulk tasks', async () => {
      const tasks = [
        {
          id: 1,
          task_title: 'Check blood pressure - updated',
          completed: true
        },
        {
          task_id: 'task-new',
          task_title: 'New task',
          completed: false
        }
      ];

      const mockUpdatedTasks = tasks.map((t, i) => new VisitTask({ 
        id: t.id || i + 2, 
        visit_id: 'visit-123', 
        ...t 
      }));

      executeTransaction.mockResolvedValue([]);
      executeQuery.mockResolvedValue(mockUpdatedTasks.map(t => ({ ...t })));

      const result = await VisitTask.updateBulk('visit-123', tasks);

      expect(executeTransaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            query: expect.stringContaining('UPDATE visit_tasks SET'),
            params: expect.arrayContaining(['Check blood pressure - updated', true])
          }),
          expect.objectContaining({
            query: expect.stringContaining('INSERT INTO visit_tasks'),
            params: expect.arrayContaining(['visit-123', 'task-new', 'New task'])
          })
        ])
      );
      expect(result).toHaveLength(2);
    });

    it('should get completion statistics', async () => {
      const mockStats = {
        total_tasks: 5,
        completed_tasks: 3,
        completion_percentage: 60.00
      };
      executeQuery.mockResolvedValue([mockStats]);

      const stats = await VisitTask.getCompletionStats('visit-123');

      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['visit-123']
      );
      expect(stats.total_tasks).toBe(5);
      expect(stats.completed_tasks).toBe(3);
      expect(stats.completion_percentage).toBe(60.00);
    });

    it('should handle empty completion statistics', async () => {
      executeQuery.mockResolvedValue([]);

      const stats = await VisitTask.getCompletionStats('visit-123');

      expect(stats).toEqual({
        total_tasks: 0,
        completed_tasks: 0,
        completion_percentage: 0
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      executeQuery.mockRejectedValue(dbError);

      await expect(VisitTask.findById(1)).rejects.toThrow('Database connection failed');
    });

    it('should handle transaction errors gracefully', async () => {
      const dbError = new Error('Transaction failed');
      executeTransaction.mockRejectedValue(dbError);

      const tasks = [{ task_id: 'task-1', task_title: 'Test task' }];
      await expect(VisitTask.createBulk('visit-123', tasks)).rejects.toThrow('Transaction failed');
    });
  });
});