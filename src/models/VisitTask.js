const { executeQuery, executeTransaction } = require('../config/database');

class VisitTask {
  constructor(data) {
    this.id = data.id;
    this.visit_id = data.visit_id;
    this.task_id = data.task_id;
    this.task_title = data.task_title;
    this.completed = data.completed || false;
    this.completed_at = data.completed_at;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Save task to database
  async save() {
    const query = `
      INSERT INTO visit_tasks (
        visit_id, task_id, task_title, completed, completed_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      this.visit_id,
      this.task_id,
      this.task_title,
      this.completed,
      this.completed_at,
      this.notes
    ];

    const result = await executeQuery(query, params);
    this.id = result.insertId;
    return this;
  }

  // Find tasks by visit ID
  static async findByVisitId(visitId) {
    const query = 'SELECT * FROM visit_tasks WHERE visit_id = ? ORDER BY created_at ASC';
    const rows = await executeQuery(query, [visitId]);
    return rows.map(row => new VisitTask(row));
  }

  // Find task by ID
  static async findById(id) {
    const query = 'SELECT * FROM visit_tasks WHERE id = ?';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }

    return new VisitTask(rows[0]);
  }

  // Update task
  async update(updateData) {
    Object.assign(this, updateData);
    
    const query = `
      UPDATE visit_tasks SET
        task_title = ?,
        completed = ?,
        completed_at = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      this.task_title,
      this.completed,
      this.completed_at,
      this.notes,
      this.id
    ];

    await executeQuery(query, params);
    return this;
  }

  // Mark task as completed
  async markCompleted(notes = null) {
    this.completed = true;
    this.completed_at = new Date();
    if (notes) {
      this.notes = notes;
    }
    
    return await this.update({
      completed: this.completed,
      completed_at: this.completed_at,
      notes: this.notes
    });
  }

  // Mark task as incomplete
  async markIncomplete() {
    this.completed = false;
    this.completed_at = null;
    
    return await this.update({
      completed: this.completed,
      completed_at: this.completed_at
    });
  }

  // Delete task
  async delete() {
    const query = 'DELETE FROM visit_tasks WHERE id = ?';
    await executeQuery(query, [this.id]);
  }

  // Bulk create tasks for a visit
  static async createBulk(visitId, tasks) {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    const queries = tasks.map(task => ({
      query: `
        INSERT INTO visit_tasks (
          visit_id, task_id, task_title, completed, completed_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      params: [
        visitId,
        task.task_id || task.taskId,
        task.task_title || task.taskTitle,
        task.completed || false,
        task.completed_at || task.completedAt,
        task.notes
      ]
    }));

    await executeTransaction(queries);
    
    // Return the created tasks
    return await VisitTask.findByVisitId(visitId);
  }

  // Update multiple tasks for a visit
  static async updateBulk(visitId, tasks) {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    const queries = [];
    
    for (const task of tasks) {
      if (task.id) {
        // Update existing task
        queries.push({
          query: `
            UPDATE visit_tasks SET
              task_title = ?,
              completed = ?,
              completed_at = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND visit_id = ?
          `,
          params: [
            task.task_title || task.taskTitle,
            task.completed || false,
            task.completed_at || task.completedAt,
            task.notes,
            task.id,
            visitId
          ]
        });
      } else {
        // Create new task
        queries.push({
          query: `
            INSERT INTO visit_tasks (
              visit_id, task_id, task_title, completed, completed_at, notes
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          params: [
            visitId,
            task.task_id || task.taskId,
            task.task_title || task.taskTitle,
            task.completed || false,
            task.completed_at || task.completedAt,
            task.notes
          ]
        });
      }
    }

    if (queries.length > 0) {
      await executeTransaction(queries);
    }
    
    // Return the updated tasks
    return await VisitTask.findByVisitId(visitId);
  }

  // Get completion statistics for a visit
  static async getCompletionStats(visitId) {
    const query = `
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        ROUND((SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as completion_percentage
      FROM visit_tasks 
      WHERE visit_id = ?
    `;
    
    const rows = await executeQuery(query, [visitId]);
    return rows[0] || { total_tasks: 0, completed_tasks: 0, completion_percentage: 0 };
  }
}

module.exports = VisitTask;