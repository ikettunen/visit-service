const { executeQuery, executeTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Encounter {
  constructor(data) {
    // Core data (stored in MySQL)
    this.id = data.id || uuidv4();
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
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    
    // Extended data (stored in MongoDB)
    this.fhir_id = data.fhir_id || `encounter-${this.id}`;
    this.audio_recording_path = data.audio_recording_path;
    this.has_audio_recording = data.has_audio_recording || false;
    this.fhir_resource = data.fhir_resource;
    this.vitalSigns = data.vitalSigns;
    this.photos = data.photos || [];
    this.taskCompletions = data.taskCompletions || [];
    this.syncStatus = data.syncStatus || 'synced';
    this.deviceId = data.deviceId;
    this.offlineId = data.offlineId;
  }

  // Convert to JSON with camelCase for frontend
  toJSON() {
    // Map database status to frontend enum values
    const statusMap = {
      'planned': 'planned',
      'in-progress': 'inProgress',
      'inProgress': 'inProgress',
      'finished': 'completed',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };

    return {
      id: this.id,
      patientId: this.patient_id,
      patientName: this.patient_name,
      nurseId: this.nurse_id,
      nurseName: this.nurse_name,
      scheduledTime: this.scheduled_time,
      startTime: this.start_time,
      endTime: this.end_time,
      status: statusMap[this.status] || this.status,
      location: this.location,
      notes: this.notes,
      createdAt: this.created_at,
      updatedAt: this.updated_at,
      fhirId: this.fhir_id,
      audioRecordingPath: this.audio_recording_path,
      hasAudioRecording: this.has_audio_recording,
      vitalSigns: this.vitalSigns,
      photos: this.photos,
      syncStatus: this.syncStatus,
      deviceId: this.deviceId,
      offlineId: this.offlineId
    };
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

  // Save encounter to database (MySQL for core data, MongoDB for extended data)
  async save() {
    // Save core data to MySQL
    const query = `
      INSERT INTO visits (
        id, patient_id, patient_name, nurse_id, nurse_name,
        scheduled_time, start_time, end_time, status, location, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        updated_at = CURRENT_TIMESTAMP
    `;

    const params = [
      this.id,
      this.patient_id,
      this.patient_name,
      this.nurse_id,
      this.nurse_name,
      this.scheduled_time,
      this.start_time,
      this.end_time,
      this.status,
      this.location,
      this.notes
    ];

    await executeQuery(query, params);

    // Save extended data to MongoDB if any exists
    if (this.hasExtendedData()) {
      await this.saveExtendedData();
    }

    return this;
  }

  // Check if there's extended data to save
  hasExtendedData() {
    // Always save to MongoDB for staff task visibility
    return true;
  }

  // Save extended data to MongoDB
  async saveExtendedData() {
    try {
      const Visit = require('./Visit'); // MongoDB model
      
      const visitDoc = await Visit.findOneAndUpdate(
        { _id: this.id },
        {
          _id: this.id,
          // Core visit info (for reference)
          patientId: this.patient_id,
          patientName: this.patient_name,
          nurseId: this.nurse_id,
          nurseName: this.nurse_name,
          scheduledTime: this.scheduled_time,
          status: this.status,
          location: this.location,
          
          // Extended data
          audioRecordingPath: this.audio_recording_path,
          hasAudioRecording: this.has_audio_recording,
          vitalSigns: this.vitalSigns,
          photos: this.photos,
          taskCompletions: this.taskCompletions || [],
          notes: this.notes, // Can be stored in both for flexibility
          
          // Sync data
          syncStatus: this.syncStatus || 'synced',
          deviceId: this.deviceId,
          offlineId: this.offlineId,
          
          // FHIR data
          fhirId: this.fhir_id,
          fhirResource: this.fhir_resource
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Saved visit ${this.id} to MongoDB with ${this.taskCompletions?.length || 0} tasks`);
      return visitDoc;
    } catch (mongoError) {
      // Log but don't fail the main operation
      console.error('❌ Failed to save extended data to MongoDB:', mongoError.message);
      console.error('   Error details:', mongoError);
    }
  }

  // Find encounter by ID (loads from both MySQL and MongoDB)
  static async findById(id) {
    const query = 'SELECT * FROM visits WHERE id = ?';
    const rows = await executeQuery(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }

    const coreData = rows[0];
    
    // Try to load extended data from MongoDB
    let extendedData = {};
    try {
      const Visit = require('./Visit'); // MongoDB model
      const mongoDoc = await Visit.findOne({ _id: id });
      if (mongoDoc) {
        extendedData = {
          fhir_id: mongoDoc.fhirId,
          audio_recording_path: mongoDoc.audioRecordingPath,
          has_audio_recording: mongoDoc.hasAudioRecording,
          fhir_resource: mongoDoc.fhirResource,
          vitalSigns: mongoDoc.vitalSigns,
          photos: mongoDoc.photos,
          syncStatus: mongoDoc.syncStatus,
          deviceId: mongoDoc.deviceId,
          offlineId: mongoDoc.offlineId
        };
      }
    } catch (mongoError) {
      console.warn('Failed to load extended data from MongoDB:', mongoError.message);
    }

    return new Encounter({ ...coreData, ...extendedData });
  }

  // Find encounters by patient ID
  static async findByPatientId(patientId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM visits 
      WHERE patient_id = ? 
      ORDER BY scheduled_time DESC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    const rows = await executeQuery(query, [patientId]);
    return rows.map(row => new Encounter(row));
  }

  // Find encounters by nurse ID
  static async findByNurseId(nurseId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM visits 
      WHERE nurse_id = ? 
      ORDER BY scheduled_time DESC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    const rows = await executeQuery(query, [nurseId]);
    return rows.map(row => new Encounter(row));
  }

  // Find today's encounters
  static async findTodaysEncounters(limit = 50, offset = 0) {
    const query = `
      SELECT * FROM visits 
      WHERE DATE(scheduled_time) = CURDATE() 
      ORDER BY scheduled_time ASC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    const rows = await executeQuery(query, []);
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

    // Use string interpolation for LIMIT and OFFSET to avoid MySQL parameter issues
    query += ` ORDER BY scheduled_time DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

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

  // Count encounters by patient ID
  static async countByPatientId(patientId) {
    const query = 'SELECT COUNT(*) as total FROM visits WHERE patient_id = ?';
    const rows = await executeQuery(query, [patientId]);
    return rows[0].total;
  }

  // Update encounter (MySQL for core data, MongoDB for extended data)
  async update(updateData) {
    Object.assign(this, updateData);
    
    // Update core data in MySQL
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
      this.id
    ];

    await executeQuery(query, params);

    // Update extended data in MongoDB if any exists
    if (this.hasExtendedData()) {
      await this.saveExtendedData();
    }

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