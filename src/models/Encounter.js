const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Encounter {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.fhir_id = data.fhir_id || `encounter-${this.id}`;
    this.patient_id = data.patient_id;
    this.patient_name = data.patient_name;
    this.nurse_id = data.nurse_id;
    this.nurse_name = data.nurse_name;
    this.scheduled_time = data.scheduled_time;
    this.start_time = data.start_time;
    this.end_time = data.end_time;
    this.status = data.status || 'planned';
    this.location = data.location;
    this.notes = data.notes;
    this.audio_recording_path = data.audio_recording_path;
    this.has_audio_recording = data.has_audio_recording || false;
    this.fhir_resource = data.fhir_resource;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Convert to FHIR Encounter resource
  toFHIR() {
    const fhirResource = {
      resourceType: 'Encounter',
      id: this.fhir_id,
      status: this.mapStatusToFHIR(this.status),
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory'
      },
      subject: {
        reference: `Patient/${this.patient_id}`,
        display: this.patient_name
      },
      participant: this.nurse_id ? [{
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
            code: 'PPRF',
            display: 'primary performer'
          }]
        }],
        individual: {
          reference: `Practitioner/${this.nurse_id}`,
          display: this.nurse_name
        }
      }] : [],
      period: {
        start: this.start_time || this.scheduled_time,
        end: this.end_time
      },
      location: this.location ? [{
        location: {
          display: this.location
        }
      }] : [],
      reasonCode: [{
        text: 'Nursing home visit'
      }]
    };

    if (this.notes) {
      fhirResource.text = {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${this.notes}</div>`
      };
    }

    return fhirResource;
  }

  // Map internal status to FHIR status
  mapStatusToFHIR(status) {
    const statusMap = {
      'planned': 'planned',
      'arrived': 'arrived',
      'triaged': 'triaged',
      'in-progress': 'in-progress',
      'onleave': 'onleave',
      'finished': 'finished',
      'cancelled': 'cancelled',
      'entered-in-error': 'entered-in-error',
      'unknown': 'unknown'
    };
    return statusMap[status] || 'unknown';
  }

  // Save encounter to database
  async save() {
    const fhirResource = this.toFHIR();
    
    const query = `
      INSERT INTO visits (
        id, fhir_id, patient_id, patient_name, nurse_id, nurse_name,
        scheduled_time, start_time, end_time, status, location, notes,
        audio_recording_path, has_audio_recording, fhir_resource
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        patient_name = VALUES(patient_name),
        nurse_id = VALUES(nurse_id),
        nurse_name = VALUES(nurse_name),
        scheduled_time = VALUES(scheduled_time),
        start_time = VALUES(start_time),
        end_time = VALUES(end_time),
        status = VALUES(status),
        location = VALUES(location),
        notes = VALUES(notes),
        audio_recording_path = VALUES(audio_recording_path),
        has_audio_recording = VALUES(has_audio_recording),
        fhir_resource = VALUES(fhir_resource),
        updated_at = CURRENT_TIMESTAMP
    `;

    const params = [
      this.id,
      this.fhir_id,
      this.patient_id,
      this.patient_name,
      this.nurse_id,
      this.nurse_name,
      this.scheduled_time,
      this.start_time,
      this.end_time,
      this.status,
      this.location,
      this.notes,
      this.audio_recording_path,
      this.has_audio_recording,
      JSON.stringify(fhirResource)
    ];

    await executeQuery(query, params);
    return this;
  }

  // Find encounter by ID
  static async findById(id) {
    const query = 'SELECT * FROM visits WHERE id = ? OR fhir_id = ?';
    const rows = await executeQuery(query, [id, id]);
    
    if (rows.length === 0) {
      return null;
    }

    return new Encounter(rows[0]);
  }

  // Find encounters by patient ID
  static async findByPatientId(patientId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM visits 
      WHERE patient_id = ? 
      ORDER BY scheduled_time DESC 
      LIMIT ? OFFSET ?
    `;
    const rows = await executeQuery(query, [patientId, limit, offset]);
    return rows.map(row => new Encounter(row));
  }

  // Find encounters by nurse ID
  static async findByNurseId(nurseId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM visits 
      WHERE nurse_id = ? 
      ORDER BY scheduled_time DESC 
      LIMIT ? OFFSET ?
    `;
    const rows = await executeQuery(query, [nurseId, limit, offset]);
    return rows.map(row => new Encounter(row));
  }

  // Find today's encounters
  static async findTodaysEncounters(limit = 50, offset = 0) {
    const query = `
      SELECT * FROM visits 
      WHERE DATE(scheduled_time) = CURDATE() 
      ORDER BY scheduled_time ASC 
      LIMIT ? OFFSET ?
    `;
    const rows = await executeQuery(query, [limit, offset]);
    return rows.map(row => new Encounter(row));
  }

  // Find all encounters with pagination
  static async findAll(limit = 50, offset = 0, filters = {}) {
    let query = 'SELECT * FROM visits WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.patient_id) {
      query += ' AND patient_id = ?';
      params.push(filters.patient_id);
    }

    if (filters.nurse_id) {
      query += ' AND nurse_id = ?';
      params.push(filters.nurse_id);
    }

    if (filters.date_from) {
      query += ' AND scheduled_time >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND scheduled_time <= ?';
      params.push(filters.date_to);
    }

    query += ' ORDER BY scheduled_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await executeQuery(query, params);
    return rows.map(row => new Encounter(row));
  }

  // Count encounters with filters
  static async count(filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM visits WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.patient_id) {
      query += ' AND patient_id = ?';
      params.push(filters.patient_id);
    }

    if (filters.nurse_id) {
      query += ' AND nurse_id = ?';
      params.push(filters.nurse_id);
    }

    if (filters.date_from) {
      query += ' AND scheduled_time >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND scheduled_time <= ?';
      params.push(filters.date_to);
    }

    const rows = await executeQuery(query, params);
    return rows[0].total;
  }

  // Update encounter
  async update(updateData) {
    Object.assign(this, updateData);
    
    const fhirResource = this.toFHIR();
    
    const query = `
      UPDATE visits SET
        patient_name = ?,
        nurse_id = ?,
        nurse_name = ?,
        scheduled_time = ?,
        start_time = ?,
        end_time = ?,
        status = ?,
        location = ?,
        notes = ?,
        audio_recording_path = ?,
        has_audio_recording = ?,
        fhir_resource = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      this.patient_name,
      this.nurse_id,
      this.nurse_name,
      this.scheduled_time,
      this.start_time,
      this.end_time,
      this.status,
      this.location,
      this.notes,
      this.audio_recording_path,
      this.has_audio_recording,
      JSON.stringify(fhirResource),
      this.id
    ];

    await executeQuery(query, params);
    return this;
  }

  // Delete encounter
  async delete() {
    const query = 'DELETE FROM visits WHERE id = ?';
    await executeQuery(query, [this.id]);
  }

  // Start encounter
  async start() {
    this.status = 'in-progress';
    this.start_time = new Date();
    return await this.update({
      status: this.status,
      start_time: this.start_time
    });
  }

  // Complete encounter
  async complete() {
    this.status = 'finished';
    this.end_time = new Date();
    return await this.update({
      status: this.status,
      end_time: this.end_time
    });
  }

  // Cancel encounter
  async cancel() {
    this.status = 'cancelled';
    return await this.update({
      status: this.status
    });
  }
}

module.exports = Encounter;