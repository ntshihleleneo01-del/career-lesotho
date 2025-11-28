const { db } = require('../firebase-admin');

class Application {
  constructor(data) {
    this.id = data.id || null;
    this.studentId = data.studentId;
    this.courseId = data.courseId;
    this.institutionId = data.institutionId;
    this.status = data.status || 'pending'; // 'pending', 'approved', 'rejected', 'admitted'
    this.applicationDate = data.applicationDate || new Date();
    this.reviewDate = data.reviewDate || null;
    this.priority = data.priority || 1; // For waiting list management
    this.documents = data.documents || []; // Array of document URLs
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async create(applicationData) {
    try {
      const applicationRef = db.collection('applications').doc();
      const application = new Application({ ...applicationData, id: applicationRef.id });
      await applicationRef.set({
        ...application,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return application;
    } catch (error) {
      throw new Error(`Error creating application: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const applicationDoc = await db.collection('applications').doc(id).get();
      if (!applicationDoc.exists) {
        return null;
      }
      return new Application({ id: applicationDoc.id, ...applicationDoc.data() });
    } catch (error) {
      throw new Error(`Error finding application: ${error.message}`);
    }
  }

  static async findByStudent(studentId) {
    try {
      const applicationsSnapshot = await db.collection('applications').where('studentId', '==', studentId).get();
      return applicationsSnapshot.docs.map(doc => new Application({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error finding applications by student: ${error.message}`);
    }
  }

  static async findByCourse(courseId) {
    try {
      const applicationsSnapshot = await db.collection('applications').where('courseId', '==', courseId).get();
      return applicationsSnapshot.docs.map(doc => new Application({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error finding applications by course: ${error.message}`);
    }
  }

  static async findByInstitution(institutionId) {
    try {
      const applicationsSnapshot = await db.collection('applications').where('institutionId', '==', institutionId).get();
      return applicationsSnapshot.docs.map(doc => new Application({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error finding applications by institution: ${error.message}`);
    }
  }

  // Check if student can apply (max 5 applications per institution)
  static async canStudentApply(studentId, institutionId) {
    try {
      const existingApplications = await db.collection('applications')
        .where('studentId', '==', studentId)
        .where('institutionId', '==', institutionId)
        .where('status', 'in', ['pending', 'approved', 'admitted'])
        .get();

      return existingApplications.size < 5;
    } catch (error) {
      throw new Error(`Error checking application limit: ${error.message}`);
    }
  }

  async update(updateData) {
    try {
      const applicationRef = db.collection('applications').doc(this.id);
      await applicationRef.update({
        ...updateData,
        updatedAt: new Date()
      });
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating application: ${error.message}`);
    }
  }

  async delete() {
    try {
      await db.collection('applications').doc(this.id).delete();
      return true;
    } catch (error) {
      throw new Error(`Error deleting application: ${error.message}`);
    }
  }

  // Admit student and handle waiting list
  static async admitStudent(applicationId) {
    try {
      const application = await Application.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Update application status
      await application.update({ status: 'admitted', reviewDate: new Date() });

      // Get course to check capacity
      const courseDoc = await db.collection('courses').doc(application.courseId).get();
      if (!courseDoc.exists) {
        throw new Error('Course not found');
      }

      const course = courseDoc.data();
      const admittedCount = await db.collection('applications')
        .where('courseId', '==', application.courseId)
        .where('status', '==', 'admitted')
        .get();

      // If course is at capacity, reject lowest priority pending application
      if (admittedCount.size >= course.capacity) {
        const pendingApplications = await db.collection('applications')
          .where('courseId', '==', application.courseId)
          .where('status', '==', 'pending')
          .orderBy('priority', 'desc')
          .limit(1)
          .get();

        if (!pendingApplications.empty) {
          const lowestPriorityApp = pendingApplications.docs[0];
          await db.collection('applications').doc(lowestPriorityApp.id).update({
            status: 'rejected',
            reviewDate: new Date(),
            updatedAt: new Date()
          });
        }
      }

      return application;
    } catch (error) {
      throw new Error(`Error admitting student: ${error.message}`);
    }
  }
}

module.exports = Application;
