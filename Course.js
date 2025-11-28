const { db } = require('../firebase-admin');

class Course {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.code = data.code;
    this.description = data.description || '';
    this.facultyId = data.facultyId;
    this.institutionId = data.institutionId;
    this.duration = data.duration; // in years
    this.qualificationLevel = data.qualificationLevel; // e.g., 'certificate', 'diploma', 'degree'
    this.minimumRequirements = data.minimumRequirements || {}; // { subjects: [], grades: [] }
    this.fees = data.fees || {};
    this.capacity = data.capacity || 0;
    this.status = data.status || 'active'; // 'active', 'inactive'
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async create(courseData) {
    try {
      const courseRef = db.collection('courses').doc();
      const course = new Course({ ...courseData, id: courseRef.id });
      await courseRef.set({
        ...course,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return course;
    } catch (error) {
      throw new Error(`Error creating course: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const courseDoc = await db.collection('courses').doc(id).get();
      if (!courseDoc.exists) {
        return null;
      }
      return new Course({ id: courseDoc.id, ...courseDoc.data() });
    } catch (error) {
      throw new Error(`Error finding course: ${error.message}`);
    }
  }

  static async findByInstitution(institutionId) {
    try {
      const coursesSnapshot = await db.collection('courses').where('institutionId', '==', institutionId).get();
      return coursesSnapshot.docs.map(doc => new Course({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error finding courses by institution: ${error.message}`);
    }
  }

  static async findByFaculty(facultyId) {
    try {
      const coursesSnapshot = await db.collection('courses').where('facultyId', '==', facultyId).get();
      return coursesSnapshot.docs.map(doc => new Course({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error finding courses by faculty: ${error.message}`);
    }
  }

  async update(updateData) {
    try {
      const courseRef = db.collection('courses').doc(this.id);
      await courseRef.update({
        ...updateData,
        updatedAt: new Date()
      });
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      throw new Error(`Error updating course: ${error.message}`);
    }
  }

  async delete() {
    try {
      // Delete all related applications first
      const applications = await db.collection('applications').where('courseId', '==', this.id).get();
      const batch = db.batch();
      applications.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      await db.collection('courses').doc(this.id).delete();
      return true;
    } catch (error) {
      throw new Error(`Error deleting course: ${error.message}`);
    }
  }

  // Check if student meets minimum requirements
  meetsRequirements(studentQualifications) {
    if (!this.minimumRequirements.subjects || !this.minimumRequirements.grades) {
      return true; // No specific requirements
    }

    const requiredSubjects = this.minimumRequirements.subjects;
    const requiredGrades = this.minimumRequirements.grades;

    // Check if student has all required subjects with minimum grades
    for (let i = 0; i < requiredSubjects.length; i++) {
      const subject = requiredSubjects[i];
      const requiredGrade = requiredGrades[i];

      const studentGrade = studentQualifications.find(qual => qual.subject === subject)?.grade;
      if (!studentGrade || studentGrade < requiredGrade) {
        return false;
      }
    }

    return true;
  }

  // Get applications for this course
  async getApplications() {
    try {
      const applicationsSnapshot = await db.collection('applications').where('courseId', '==', this.id).get();
      return applicationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      throw new Error(`Error getting applications: ${error.message}`);
    }
  }
}

module.exports = Course;
