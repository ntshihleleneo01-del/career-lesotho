const { db } = require('../firebase-admin');

class Institution {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.description = data.description || '';
    this.location = data.location;
    this.website = data.website || '';
    this.contactEmail = data.contactEmail;
    this.contactPhone = data.contactPhone || '';
    this.adminId = data.adminId; // Reference to institute admin user
    this.status = data.status || 'pending'; // 'pending', 'approved', 'suspended'
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async create(institutionData) {
    try {
      const institutionRef = db.collection('institutions').doc();
      const institution = new Institution({ ...institutionData, id: institutionRef.id });
      await institutionRef.set({
        ...institution,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return institution;
    } catch (error) {
      throw new Error(`Error creating institution: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const institutionDoc = await db.collection('institutions').doc(id).get();
      if (!institutionDoc.exists) {
        return null;
      }
      return new Institution({ id: institutionDoc.id, ...institutionDoc.data() });
    } catch (error) {
      throw new Error(`Error finding institution: ${error.message}`);
    }
  }

  static async findAll() {
    try {
      const institutionsSnapshot = await db.collection('institutions').get();
      return institutionsSnapshot.docs.map(doc => new Institution({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error finding institutions: ${error.message}`);
    }
  }

  static async findByAdminId(adminId) {
    try {
      const institutionQuery = await db.collection('institutions').where('adminId', '==', adminId).limit(1).get();
      if (institutionQuery.empty) {
        return null;
      }
      const institutionDoc = institutionQuery.docs[0];
      return new Institution({ id: institutionDoc.id, ...institutionDoc.data() });
    } catch (error) {
      throw new Error(`Error finding institution by admin: ${error.message}`);
    }
  }

  async update(updateData) {
    try {
      const institutionRef = db.collection('institutions').doc(this.id);
      await institutionRef.update({
        ...updateData,
        updatedAt: new Date()
      });
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating institution: ${error.message}`);
    }
  }

  async delete() {
    try {
      // Delete all related faculties and courses first
      const faculties = await db.collection('faculties').where('institutionId', '==', this.id).get();
      const batch = db.batch();
      faculties.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      await db.collection('institutions').doc(this.id).delete();
      return true;
    } catch (error) {
      throw new Error(`Error deleting institution: ${error.message}`);
    }
  }

  // Get faculties for this institution
  async getFaculties() {
    try {
      const facultiesSnapshot = await db.collection('faculties').where('institutionId', '==', this.id).get();
      return facultiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting faculties: ${error.message}`);
    }
  }
}

module.exports = Institution;
